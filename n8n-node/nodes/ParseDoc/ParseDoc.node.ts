import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// Le node enveloppe l'API ParseDoc. Valeur vendue = le workflow comptable complet
// (extraction + sortie "ligne comptable" prête + résumé), pas l'OCR nu — c'est ce qui
// le distingue d'un appel direct à un LLM (recommandation du conseil : anti-commodité).

interface ParsedDocument {
	document_type: string;
	merchant: { name: string | null; address: string | null; tax_id: string | null };
	date: string | null;
	currency: string | null;
	line_items: { description: string; quantity: number | null; total: number | null }[];
	subtotal: number | null;
	tax: { rate: number | null; amount: number | null }[];
	total: number | null;
	payment_method: string | null;
	invoice_number: string | null;
	category: string | null;
	confidence: number;
	warnings: string[];
}

export class ParseDoc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ParseDoc',
		name: 'parseDoc',
		icon: { light: 'file:parsedoc.svg', dark: 'file:parsedoc.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Turn a receipt or invoice (image/PDF) into structured accounting data',
		defaults: { name: 'ParseDoc' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'parseDocApi', required: false }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Parse Document',
						value: 'parse',
						description: 'Extract full structured JSON from a receipt or invoice',
						action: 'Parse a receipt or invoice',
					},
					{
						name: 'Parse to Accounting Line',
						value: 'accountingLine',
						description: 'Extract and flatten into a single accounting-ready row (date, merchant, total, tax, category)',
						action: 'Parse to an accounting line',
					},
				],
				default: 'accountingLine',
			},
			{
				displayName: 'Document Source',
				name: 'source',
				type: 'options',
				options: [
					{ name: 'Binary Property', value: 'binary', description: 'Use a file from a previous node (e.g. Read/Download)' },
					{ name: 'URL', value: 'url', description: 'Public URL of the document' },
				],
				default: 'binary',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { source: ['binary'] } },
				description: 'Name of the binary property holding the image or PDF',
			},
			{
				displayName: 'Document URL',
				name: 'documentUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { source: ['url'] } },
				placeholder: 'https://example.com/receipt.jpg',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		// Credentials optionnelles : avec clé → route facturée ; sans → démo gratuite.
		let apiKey = '';
		let baseUrl = 'https://parsedoc.wrapper-agency.com';
		try {
			const creds = await this.getCredentials('parseDocApi');
			if (creds) {
				apiKey = (creds.apiKey as string) || '';
				baseUrl = (creds.baseUrl as string) || baseUrl;
			}
		} catch {
			// pas de credentials configurées → démo
		}
		const endpoint = apiKey ? '/api/key/v1/parse' : '/api/demo';

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const source = this.getNodeParameter('source', i) as string;

				const body: IDataObject = {};
				if (source === 'binary') {
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);
					body.image_base64 = buffer.toString('base64');
					body.media_type = binaryData.mimeType || 'image/jpeg';
				} else {
					body.image_url = this.getNodeParameter('documentUrl', i) as string;
				}

				const headers: IDataObject = { 'Content-Type': 'application/json' };
				if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

				const response = (await this.helpers.httpRequest({
					method: 'POST' as IHttpRequestMethods,
					url: `${baseUrl}${endpoint}`,
					headers,
					body,
					json: true,
					timeout: 90000,
				})) as { ok?: boolean; document?: ParsedDocument; error?: string };

				if (!response || !response.ok || !response.document) {
					throw new NodeOperationError(this.getNode(), response?.error || 'ParseDoc returned no document', {
						itemIndex: i,
					});
				}

				const doc = response.document;
				if (operation === 'accountingLine') {
					const totalTax = doc.tax?.reduce((s, t) => s + (t.amount ?? 0), 0) ?? null;
					out.push({
						json: {
							date: doc.date,
							merchant: doc.merchant?.name ?? null,
							document_type: doc.document_type,
							invoice_number: doc.invoice_number,
							currency: doc.currency,
							subtotal: doc.subtotal,
							tax: totalTax,
							total: doc.total,
							category: doc.category,
							payment_method: doc.payment_method,
							item_count: doc.line_items?.length ?? 0,
							confidence: doc.confidence,
							// Review humaine seulement si l'extraction est réellement incertaine.
							// Les warnings sur champs optionnels (téléphone, tax_id absents) ne comptent pas.
							needs_review: doc.confidence < 0.85,
						},
						pairedItem: { item: i },
					});
				} else {
					out.push({ json: doc as unknown as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [out];
	}
}
