#!/usr/bin/env node
// MCP server ParseDoc — outil parse_document pour agents (Claude, GPT, etc.).
// Mode payant : X402_PRIVATE_KEY (wallet EVM avec USDC sur Base) → endpoint $0.02/page.
// Sans clé : route démo gratuite (3/jour/IP).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";

const BASE_URL = process.env.PARSEDOC_URL || "https://parsedoc.wrapper-agency.com";

async function buildFetch() {
  const pk = process.env.X402_PRIVATE_KEY;
  if (!pk) return { fetchFn: fetch, paid: false };
  const { wrapFetchWithPayment } = await import("@x402/fetch");
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  return { fetchFn: wrapFetchWithPayment(fetch, account), paid: true };
}

const server = new McpServer({ name: "parsedoc", version: "0.1.0" });

server.tool(
  "parse_document",
  "Parse a receipt or invoice (image or PDF) into structured JSON: merchant, date, line items, taxes, totals, payment method, category. " +
    "Provide image_url OR file_path OR image_base64. Costs $0.02/page in USDC on Base when X402_PRIVATE_KEY is set; otherwise uses the free demo (3/day).",
  {
    image_url: z.string().url().optional().describe("HTTP(S) URL of the document"),
    file_path: z.string().optional().describe("Local path to the document file"),
    image_base64: z.string().optional().describe("Base64-encoded document"),
    media_type: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]).optional(),
  },
  async ({ image_url, file_path, image_base64, media_type }) => {
    const { fetchFn, paid } = await buildFetch();
    let body;
    if (image_url) {
      body = { image_url };
    } else if (file_path) {
      const data = readFileSync(file_path).toString("base64");
      const ext = file_path.toLowerCase().split(".").pop();
      const mt = media_type || { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", pdf: "application/pdf" }[ext] || "image/jpeg";
      body = { image_base64: data, media_type: mt };
    } else if (image_base64) {
      body = { image_base64, media_type: media_type || "image/jpeg" };
    } else {
      return { content: [{ type: "text", text: "Error: provide image_url, file_path or image_base64" }], isError: true };
    }

    const endpoint = paid ? "/api/v1/parse" : "/api/demo";
    const res = await fetchFn(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { content: [{ type: "text", text: `HTTP ${res.status}: ${JSON.stringify(data)}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data.document, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
