#!/usr/bin/env python3
"""Parse a folder of receipts into one CSV — single file, stdlib only.

Usage:
    python3 parse_receipts.py ./receipts_folder out.csv            # free tier (10/day)
    PARSEDOC_KEY=pk_live_... python3 parse_receipts.py ./receipts out.csv  # plan quota

Get a key (1,000 pages / $19/mo): https://parsedoc.wrapper-agency.com/pricing
Nothing is stored server-side — see https://parsedoc.wrapper-agency.com/privacy
"""

import base64
import csv
import json
import mimetypes
import os
import sys
import urllib.request

API = os.environ.get("PARSEDOC_URL", "https://parsedoc.wrapper-agency.com")
KEY = os.environ.get("PARSEDOC_KEY", "")

ACCEPTED = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}


def parse_one(path: str) -> dict:
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    media_type = mimetypes.guess_type(path)[0] or "image/jpeg"
    endpoint = "/api/web/parse" if not KEY else "/api/key/v1/parse"
    req = urllib.request.Request(
        API + endpoint,
        data=json.dumps({"image_base64": b64, "media_type": media_type}).encode(),
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {KEY}"} if KEY else {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    folder, out = sys.argv[1], sys.argv[2]
    files = sorted(
        os.path.join(folder, f) for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in ACCEPTED
    )
    if not files:
        print(f"no receipts found in {folder}")
        sys.exit(1)

    fields = ["file", "date", "merchant", "type", "invoice_number", "currency", "subtotal", "tax", "total", "category", "payment_method", "confidence"]
    rows = []
    for path in files:
        name = os.path.basename(path)
        try:
            resp = parse_one(path)
        except urllib.error.HTTPError as e:
            detail = json.loads(e.read() or b"{}").get("error", str(e))
            print(f"  ✗ {name}: {detail}")
            if e.code == 429:
                print("    (free limit reached — set PARSEDOC_KEY or try tomorrow)")
                break
            continue
        doc = resp.get("document") or {}
        tax_total = sum(t.get("amount") or 0 for t in (doc.get("tax") or []))
        rows.append({
            "file": name,
            "date": doc.get("date"),
            "merchant": (doc.get("merchant") or {}).get("name"),
            "type": doc.get("document_type"),
            "invoice_number": doc.get("invoice_number"),
            "currency": doc.get("currency"),
            "subtotal": doc.get("subtotal"),
            "tax": tax_total or None,
            "total": doc.get("total"),
            "category": doc.get("category"),
            "payment_method": doc.get("payment_method"),
            "confidence": doc.get("confidence"),
        })
        print(f"  ✓ {name}: {rows[-1]['merchant']} — {rows[-1]['total']} {rows[-1]['currency']}")

    with open(out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\n{len(rows)} receipts → {out}")


if __name__ == "__main__":
    main()
