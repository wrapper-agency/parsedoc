# parsedoc-mcp

MCP server exposing **ParseDoc** — receipt & invoice → structured JSON. Your agent pays per call with USDC on Base via [x402](https://x402.org). No signup, no API key.

## Setup (Claude Code)

```bash
claude mcp add parsedoc -e X402_PRIVATE_KEY=0x... -- npx -y parsedoc-mcp
```

`X402_PRIVATE_KEY` = any EVM wallet holding USDC on Base. Omit it to use the free demo tier (3 parses/day).

## Tool

`parse_document({ image_url | file_path | image_base64 })` → JSON with merchant, date, line_items, taxes, total, category, confidence.

$0.02/page. Settlement only on successful parses — failures are never charged.
