import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ParseDocApi implements ICredentialType {
	name = 'parseDocApi';

	displayName = 'ParseDoc API';

	documentationUrl = 'https://parsedoc.wrapper-agency.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Your ParseDoc API key (starts with pk_). Leave empty to use the free demo tier (rate-limited).',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://parsedoc.wrapper-agency.com',
			description: 'ParseDoc API base URL. Change only for self-hosting.',
		},
	];

	// La clé est envoyée en Bearer. La route /api/key accepte ce header ;
	// sans clé, le node bascule sur la route démo gratuite (géré dans le node).
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/health',
			method: 'GET',
		},
	};
}
