"""
PDF → Knowledge ingestion for corporate-strategy agent.

Reads all PDFs in knowledge-source/Corporate-Strategy/, extracts text
via pymupdf, cleans it, and POSTs to /admin/ingest.

Large documents (>15K chars) are split into numbered parts to stay
within the Cloudflare Worker subrequest limit.

Run from project root:
    python tools/pdf-to-knowledge/extract_and_ingest_corp_pdfs.py

Requirements:
    pip install pymupdf
"""

import os, re, json, sys, time
from pathlib import Path
import urllib.request

# ── Config ────────────────────────────────────────────────────────────────────

WORKER_URL   = os.environ.get("WORKER_URL",   "https://orchestr-a-agents.strathubplatform.workers.dev")
AGENT_ID     = "corporate-strategy"
PDF_DIR      = Path(__file__).parent.parent.parent / "knowledge-source" / "Corporate-Strategy"
OUT_DIR      = Path(__file__).parent.parent.parent / "src" / "content" / "corporate-strategy"
MAX_CHARS    = 40_000   # ~30-40 chunks per call — well within Cloudflare 50-subrequest limit

# PDFs to process.
# Large books (Beyond the Core 423K, corporate textbook 5MB) are excluded
# because their content is already covered by synthesized skill .md files.
# The remaining 7 focused reports are highly targeted research.
PDF_JOBS = [
    {
        "file":          "Corporate portfolio management in practice - the case of credit suisse's turnaround.pdf",
        "topic_slug":    "corp-portfolio-mgmt-case",
        "title":         "Corporate Portfolio Management in Practice — Credit Suisse Turnaround Case",
        "knowledge_type": "benchmark",
    },
    {
        "file":          "MS_Capital_Allocation__1671293564.pdf",
        "topic_slug":    "corp-ms-capital-allocation",
        "title":         "Capital Allocation — Morgan Stanley Research",
        "knowledge_type": "benchmark",
    },
    {
        "file":          "MS_totalshareholderreturns.pdf",
        "topic_slug":    "corp-ms-tsr",
        "title":         "Total Shareholder Returns Framework — Morgan Stanley Research",
        "knowledge_type": "benchmark",
    },
    {
        "file":          "ROIC_1677423341.pdf",
        "topic_slug":    "corp-roic-framework",
        "title":         "ROIC — Return on Invested Capital Framework",
        "knowledge_type": "framework",
    },
    {
        "file":          "the new dynamics of managing the corporate portfolio.pdf",
        "topic_slug":    "corp-portfolio-dynamics",
        "title":         "The New Dynamics of Managing the Corporate Portfolio",
        "knowledge_type": "benchmark",
    },
    {
        "file":          "the-portfolio-management-imperative-and-its-m-and-a-implications (1).pdf",
        "topic_slug":    "corp-portfolio-imperative-ma",
        "title":         "The Portfolio Management Imperative and Its M&A Implications",
        "knowledge_type": "benchmark",
    },
    {
        "file":          "us-cons-building-an-advantaged-portfolio-032315 1.pdf",
        "topic_slug":    "corp-advantaged-portfolio",
        "title":         "Building an Advantaged Portfolio — Deloitte",
        "knowledge_type": "framework",
    },
    # Excluded:
    # Article Growth outside the Core.pdf — unreadable (0 bytes extracted)
    # Beyond_the_Core (423K / 10+ parts) — covered by corp-growth-transformation
    # corporate-strategy-theory-and-practice (5MB textbook) — too large
    # crs-risk-management-for-the-consumer-sectors (5.9MB) — off-topic
    # deloitte-au-risk-appetite-frameworks — peripheral to corporate strategy
]

# ── Secret loader ─────────────────────────────────────────────────────────────

def _load_admin_secret() -> str:
    secret = os.environ.get("ADMIN_SECRET", "")
    if secret:
        return secret
    dev_vars = Path(__file__).parent.parent.parent / ".dev.vars"
    if dev_vars.exists():
        with open(dev_vars, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line.startswith("ADMIN_SECRET="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("ADMIN_SECRET not found. Set it in .dev.vars or environment.")

# ── PDF text extraction ───────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: Path) -> str:
    """Extract and clean text from a PDF using pymupdf."""
    import pymupdf  # fitz

    doc = pymupdf.open(str(pdf_path))
    pages = []
    for page in doc:
        text = page.get_text("text")
        pages.append(text)
    doc.close()

    raw = "\n".join(pages)

    # Clean up: collapse excessive whitespace, remove control chars
    raw = re.sub(r'\r\n|\r', '\n', raw)
    raw = re.sub(r'[ \t]+', ' ', raw)
    raw = re.sub(r'\n{3,}', '\n\n', raw)
    raw = re.sub(r'[^\x09\x0A\x20-\x7E -￿]', '', raw)  # remove control chars
    raw = raw.strip()

    return raw

# ── Ingest helper ─────────────────────────────────────────────────────────────

def ingest_chunk(admin_secret: str, agent_id: str, knowledge_type: str,
                 topic_slug: str, title: str, content: str,
                 source_path: str) -> dict:
    """POST a single chunk to /admin/ingest and return the response."""
    payload = json.dumps({
        "agentId":       agent_id,
        "knowledgeType": knowledge_type,
        "topicSlug":     topic_slug,
        "source":        "upload",
        "sourcePath":    source_path,
        "title":         title,
        "content":       content,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{WORKER_URL}/admin/ingest",
        data=payload,
        method="POST",
        headers={
            "Content-Type":   "application/json",
            "x-admin-secret": admin_secret,
            "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())

# ── Split text into parts ─────────────────────────────────────────────────────

def split_text(text: str, max_chars: int) -> list[str]:
    """Split text at paragraph boundaries to stay under max_chars."""
    if len(text) <= max_chars:
        return [text]

    parts = []
    paragraphs = text.split("\n\n")
    current = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) + 2 > max_chars and current:
            parts.append("\n\n".join(current))
            current = [para]
            current_len = len(para)
        else:
            current.append(para)
            current_len += len(para) + 2

    if current:
        parts.append("\n\n".join(current))

    return parts

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    admin_secret = _load_admin_secret()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"PDF → Knowledge Ingestion")
    print(f"Agent:  {AGENT_ID}")
    print(f"Worker: {WORKER_URL}")
    print(f"PDFs:   {PDF_DIR}")
    print("=" * 60)

    total_ok = 0
    total_err = 0

    for i, job in enumerate(PDF_JOBS):
        pdf_path = PDF_DIR / job["file"]
        slug     = job["topic_slug"]
        title    = job["title"]
        ktype    = job["knowledge_type"]
        src_path = f"knowledge-source/Corporate-Strategy/{job['file']}"

        print(f"\n[{i+1}/{len(PDF_JOBS)}] {title}")
        print(f"        File: {job['file']}")

        if not pdf_path.exists():
            print(f"  ✗  File not found — skipping")
            total_err += 1
            continue

        # Extract text
        try:
            text = extract_pdf_text(pdf_path)
            print(f"  → Extracted: {len(text):,} chars")
        except Exception as e:
            print(f"  ✗  PDF extraction failed: {e}")
            total_err += 1
            continue

        if len(text) < 200:
            print(f"  ✗  Too little text extracted ({len(text)} chars) — skipping")
            total_err += 1
            continue

        # Split into parts if needed
        parts = split_text(text, MAX_CHARS)
        print(f"  → Split into {len(parts)} part(s)")

        # Ingest each part
        for j, part_text in enumerate(parts):
            part_slug  = slug if len(parts) == 1 else f"{slug}-part{j+1}"
            part_title = title if len(parts) == 1 else f"{title} (Part {j+1}/{len(parts)})"
            out_md     = OUT_DIR / f"{part_slug}.md"

            # Save .md locally
            out_md.write_text(part_text, encoding="utf-8")

            # Ingest
            if j > 0:
                time.sleep(3)
            try:
                result = ingest_chunk(admin_secret, AGENT_ID, ktype,
                                      part_slug, part_title, part_text, src_path)
                chunks = result.get("chunkCount", result.get("chunk_count", "?"))
                print(f"  ✓  {part_slug}: {chunks} chunks ingested")
                total_ok += 1
            except Exception as e:
                print(f"  ✗  Ingest failed for {part_slug}: {e}")
                total_err += 1

        # Pause between documents to be safe
        if i < len(PDF_JOBS) - 1:
            time.sleep(5)

    print(f"\n{'='*60}")
    print(f"  Done: {total_ok} slugs ingested, {total_err} failed")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
