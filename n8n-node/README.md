# n8n-nodes-parsedoc

[n8n](https://n8n.io) community node for **ParseDoc** — turn any receipt or invoice (image or PDF) into structured, accounting-ready data, right inside your workflows.

Stop copying numbers off receipts by hand. Drop a ParseDoc node after any trigger that produces a file (email attachment, Drive upload, webhook, scanner) and get back a clean accounting line: date, merchant, total, tax, category, payment method.

## What it does

- **Parse to Accounting Line** (default): one flat row per document — `date, merchant, total, tax, currency, category, payment_method, needs_review` — ready to push into Google Sheets, Airtable, a database, or your accounting tool.
- **Parse Document**: the full structured JSON (every line item, multiple tax rates, merchant address, invoice number, confidence, warnings).

Works on receipts and invoices in many languages and currencies. `needs_review` flags low-confidence extractions so you can route them to a human only when it matters.

## Installation

In n8n: **Settings → Community Nodes → Install** → `n8n-nodes-parsedoc`.

## Usage

1. Add a trigger that outputs a file (e.g. **Gmail Trigger** with attachment, **Google Drive**, **Webhook**).
2. Add the **ParseDoc** node.
3. Set **Document Source** to *Binary Property* (the attachment) or *URL*.
4. Pick **Parse to Accounting Line** and connect the output to your spreadsheet/DB node.

That's it — every time the workflow runs, the document is parsed automatically. No manual entry.

## Credentials

The node works out of the box on a **free demo tier** (rate-limited, for testing).

For production volume, add **ParseDoc API** credentials:
- **API Key** — your key from ParseDoc (starts with `pk_`).
- **Base URL** — leave as default unless self-hosting.

Pricing is usage-based ($0.02/page). Failed parses are never billed.

## Example output (Accounting Line)

```json
{
  "date": "2026-06-09",
  "merchant": "Starbucks Coffee #1147",
  "currency": "USD",
  "subtotal": 11.95,
  "tax": 1.06,
  "total": 15.01,
  "category": "restaurant",
  "payment_method": "VISA",
  "item_count": 2,
  "confidence": 0.95,
  "needs_review": false
}
```

## License

MIT
