"""Ingest the 4 synthesized corporate-strategy video .md files into the Worker."""
import os, json, http.client, ssl
from pathlib import Path
from urllib.parse import urlparse

WORKER_URL   = "https://orchestr-a-agents.strathubplatform.workers.dev"
DEV_VARS     = Path(__file__).parent.parent.parent / ".dev.vars"
CONTENT_DIR  = Path(__file__).parent.parent.parent / "src" / "content" / "corporate-strategy"

JOBS = [
    {"slug": "corp-intro-corporate-strategy",      "title": "An Introduction to Corporate Strategy"},
    {"slug": "corp-finance-capital-allocation",    "title": "Corporate Finance Explained - Strategic Capital Allocation"},
    {"slug": "corp-mauboussin-capital-allocation", "title": "Capital Allocation and Long-Term Value - Mauboussin & Callahan 2025"},
    {"slug": "corp-ma-timing-strategy",            "title": "M&A Strategy - Now Is the Time to Strike (S&P Global, Doug Peterson)"},
]

def load_admin_secret():
    secret = os.environ.get("ADMIN_SECRET", "")
    if secret:
        return secret
    with open(DEV_VARS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("ADMIN_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("ADMIN_SECRET not found")

def ingest(admin_secret, slug, title):
    md_file = CONTENT_DIR / f"{slug}.md"
    if not md_file.exists():
        print(f"  File not found: {md_file}")
        return
    content = md_file.read_text(encoding="utf-8")
    payload = {
        "agentId":       "corporate-strategy",
        "knowledgeType": "framework",
        "topicSlug":     slug,
        "source":        "upload",
        "sourcePath":    f"src/content/corporate-strategy/{slug}.md",
        "title":         title,
        "content":       content,
    }
    # ensure_ascii=True (default) escapes all non-ASCII as \uXXXX → pure ASCII body
    body = json.dumps(payload, ensure_ascii=True).encode("ascii")
    parsed = urlparse(WORKER_URL)
    ctx = ssl.create_default_context()
    conn = http.client.HTTPSConnection(parsed.netloc, context=ctx, timeout=120)
    conn.request("POST", "/admin/ingest", body=body, headers={
        "Content-Type":   "application/json",
        "x-admin-secret": admin_secret,
    })
    resp = conn.getresponse()
    raw = resp.read()
    conn.close()
    result = json.loads(raw)
    if resp.status != 200:
        raise RuntimeError(f"HTTP {resp.status}: {result}")
    print(f"  OK  {slug}: {result.get('chunkCount', '?')} chunks")

def main():
    secret = load_admin_secret()
    print(f"Ingesting {len(JOBS)} corporate-strategy video files...")
    for job in JOBS:
        print(f"\n  -> {job['slug']}")
        try:
            ingest(secret, job["slug"], job["title"])
        except Exception as e:
            print(f"  FAIL: {e}")
    print("\nDone.")

if __name__ == "__main__":
    main()
