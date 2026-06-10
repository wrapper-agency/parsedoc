# ParseDoc

**Receipts & invoices → clean, structured accounting JSON.** Built for AI agents and automations (n8n, Make, Zapier).

POST an image or PDF, get back `merchant`, `date`, `line_items`, `tax`, `total`, `category` and a `confidence` score — the **same strict schema every time**. Failed parses are never billed.

🔗 **Live API:** https://parsedoc.wrapper-agency.com

This repository holds the **open clients** for ParseDoc — the MCP server, the n8n community node, and example workflows. The hosted API processes documents in memory and stores nothing (see [privacy](https://parsedoc.wrapper-agency.com/privacy)).

---

## Why not just call an LLM directly?

A raw LLM *reads* the receipt — but hands you prose you still have to parse, validate and normalize. ParseDoc returns a fixed, ready-to-store schema with a confidence score and a `needs_review` flag, so you can drop it straight into a spreadsheet, ledger or database.

## Pricing

- **$0.02 / page** via [x402](https://x402.org) micropayments (USDC on Base) — no signup, no API key.
- Or a **monthly plan** with an API key — see https://parsedoc.wrapper-agency.com/pricing.
- Failed extractions are never charged.

---

## Three ways to use it

### 1. HTTP API

```bash
curl -X POST https://parsedoc.wrapper-agency.com/api/demo \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://parsedoc.wrapper-agency.com/sample-receipt.png"}'
```

The free demo allows 3 parses/day per IP. For production, pay per page with x402 (`/api/v1/parse`) or use an API key (`/api/key/v1/parse`). Full reference: https://parsedoc.wrapper-agency.com/api/openapi

### 2. MCP server (for AI agents)

[`parsedoc-mcp`](https://www.npmjs.com/package/parsedoc-mcp) exposes a `parse_document` tool. Listed on the [official MCP registry](https://registry.modelcontextprotocol.io) as `com.wrapper-agency.parsedoc/parser`.

```bash
claude mcp add parsedoc -e X402_PRIVATE_KEY=0x... -- npx -y parsedoc-mcp
```

`X402_PRIVATE_KEY` = any EVM wallet holding USDC on Base. Omit it to use the free demo tier. See [`mcp/`](./mcp).

### 3. n8n community node

[`n8n-nodes-parsedoc`](https://www.npmjs.com/package/n8n-nodes-parsedoc) adds a **ParseDoc** node with two operations:

- **Parse Document** — full structured JSON.
- **Parse to Accounting Line** — flattened single row (date, merchant, total, tax, category) ready for Sheets / Airtable / a database.

Install via *Settings → Community Nodes → `n8n-nodes-parsedoc`*. Source in [`n8n-node/`](./n8n-node), and a ready-to-import workflow in [`examples/`](./examples).

---

## Output schema (Parse Document)

```json
{
  "document_type": "receipt",
  "merchant": { "name": "Starbucks Coffee", "address": null, "tax_id": null },
  "date": "2026-06-09",
  "currency": "USD",
  "line_items": [{ "description": "Latte", "quantity": 1, "total": 5.25 }],
  "subtotal": 11.95,
  "tax": [{ "rate": 0.089, "amount": 1.06 }],
  "total": 15.01,
  "payment_method": "card",
  "invoice_number": null,
  "category": "restaurant",
  "confidence": 0.97,
  "warnings": []
}
```

## Links

- API & docs — https://parsedoc.wrapper-agency.com
- Terms — https://parsedoc.wrapper-agency.com/legal
- Privacy (zero storage) — https://parsedoc.wrapper-agency.com/privacy
- Contact — christian.buisness08@gmail.com

## License

MIT © wrapper-agency
