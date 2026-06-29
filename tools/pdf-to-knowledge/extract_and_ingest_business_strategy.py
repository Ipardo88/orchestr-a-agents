"""
PDF + Video → Knowledge ingestion for business-strategy agent.

Run from project root:
    python tools/pdf-to-knowledge/extract_and_ingest_business_strategy.py

Requirements:
    pip install pymupdf yt-dlp
"""

import os, re, json, sys, time
from pathlib import Path
import urllib.request

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Config ────────────────────────────────────────────────────────────────────

WORKER_URL   = os.environ.get("WORKER_URL", "https://orchestr-a-agents.strathubplatform.workers.dev")
AGENT_ID     = "business-strategy"
PDF_DIR      = Path(__file__).parent.parent.parent / "knowledge-source" / "Business-Strategy"
OUT_DIR      = Path(__file__).parent.parent.parent / "src" / "content" / "business-strategy"
MAX_CHARS    = 14_000

PDF_JOBS = [
    {
        "file":          "Playing to Win.pdf",
        "topic_slug":    "playing-to-win",
        "title":         "Playing to Win: How Strategy Really Works — Roger Martin & A.G. Lafley (HBR Webinar)",
        "knowledge_type": "framework",
    },
    {
        "file":          "how-strategy-champions-win-v2.pdf",
        "topic_slug":    "how-strategy-champions-win",
        "title":         "How Strategy Champions Win — McKinsey Quarterly (2025)",
        "knowledge_type": "benchmark",
    },
]

# YouTube videos to ingest via yt-dlp transcript extraction
VIDEO_JOBS = [
    {
        "url":           "https://www.youtube.com/watch?v=o7Ik1OB4TaE",
        "topic_slug":    "business-strategy-video-1",
        "title":         "Business Strategy — YouTube Video 1",
        "knowledge_type": "framework",
    },
    {
        "url":           "https://www.youtube.com/watch?v=iuYlGRnC7J8",
        "topic_slug":    "business-strategy-video-2",
        "title":         "Business Strategy — YouTube Video 2",
        "knowledge_type": "framework",
    },
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
    import pymupdf
    doc = pymupdf.open(str(pdf_path))
    pages = [page.get_text("text") for page in doc]
    doc.close()
    raw = "\n".join(pages)
    raw = re.sub(r'\r\n|\r', '\n', raw)
    raw = re.sub(r'[ \t]+', ' ', raw)
    raw = re.sub(r'\n{3,}', '\n\n', raw)
    raw = re.sub(r'[^\x09\x0A\x20-\x7E -￿]', '', raw)
    return raw.strip()

# ── YouTube transcript extraction ────────────────────────────────────────────

def extract_youtube_transcript(url: str) -> str:
    """Extract transcript from YouTube using yt-dlp."""
    import tempfile, subprocess
    with tempfile.TemporaryDirectory() as tmpdir:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--write-auto-sub", "--sub-lang", "en",
            "--sub-format", "vtt",
            "--skip-download",
            "--output", f"{tmpdir}/%(title)s.%(ext)s",
            url,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {result.stderr[:500]}")

        vtt_files = list(Path(tmpdir).glob("*.vtt"))
        if not vtt_files:
            raise RuntimeError("No VTT transcript file found — video may have no auto-captions")

        raw = vtt_files[0].read_text(encoding="utf-8", errors="ignore")

    # Parse VTT: strip cue headers, deduplicate lines
    lines = []
    seen = set()
    for line in raw.splitlines():
        line = line.strip()
        if re.match(r'^\d{2}:\d{2}', line):
            continue
        if line.startswith("WEBVTT") or line.startswith("NOTE") or not line:
            continue
        clean = re.sub(r'<[^>]+>', '', line).strip()
        if clean and clean not in seen:
            seen.add(clean)
            lines.append(clean)

    return " ".join(lines)

# ── Ingest helper ─────────────────────────────────────────────────────────────

def ingest_chunk(admin_secret, agent_id, knowledge_type, topic_slug, title, content, source_path):
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
            "User-Agent":     "OrchestrA-Seeder/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())

def split_text(text: str, max_chars: int) -> list:
    if len(text) <= max_chars:
        return [text]
    parts = []
    paragraphs = text.split("\n\n")
    current, current_len = [], 0
    for para in paragraphs:
        if current_len + len(para) + 2 > max_chars and current:
            parts.append("\n\n".join(current))
            current, current_len = [para], len(para)
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

    print(f"Business Strategy Knowledge Ingestion")
    print(f"Agent:  {AGENT_ID}")
    print(f"Worker: {WORKER_URL}")
    print("=" * 60)

    total_ok = total_err = 0

    # ── PDFs ──────────────────────────────────────────────────────────────────
    print("\n-- PDFs --")
    for i, job in enumerate(PDF_JOBS):
        pdf_path = PDF_DIR / job["file"]
        slug     = job["topic_slug"]
        title    = job["title"]
        ktype    = job["knowledge_type"]
        src_path = f"knowledge-source/Business-Strategy/{job['file']}"

        print(f"\n[{i+1}/{len(PDF_JOBS)}] {title}")

        if not pdf_path.exists():
            print(f"  ✗  File not found at {pdf_path} — skipping")
            total_err += 1
            continue

        try:
            text = extract_pdf_text(pdf_path)
            print(f"  → Extracted: {len(text):,} chars")
        except Exception as e:
            print(f"  ✗  PDF extraction failed: {e}")
            total_err += 1
            continue

        if len(text) < 200:
            print(f"  ✗  Too little text ({len(text)} chars) — skipping")
            total_err += 1
            continue

        parts = split_text(text, MAX_CHARS)
        print(f"  → Split into {len(parts)} part(s)")

        for j, part_text in enumerate(parts):
            part_slug  = slug if len(parts) == 1 else f"{slug}-part{j+1}"
            part_title = title if len(parts) == 1 else f"{title} (Part {j+1}/{len(parts)})"
            (OUT_DIR / f"{part_slug}.md").write_text(part_text, encoding="utf-8")
            if j > 0:
                time.sleep(3)
            try:
                result = ingest_chunk(admin_secret, AGENT_ID, ktype, part_slug, part_title, part_text, src_path)
                chunks = result.get("chunkCount", result.get("chunk_count", "?"))
                print(f"  ✓  {part_slug}: {chunks} chunks ingested")
                total_ok += 1
            except Exception as e:
                print(f"  ✗  Ingest failed for {part_slug}: {e}")
                total_err += 1

        if i < len(PDF_JOBS) - 1:
            time.sleep(5)

    # ── YouTube Videos ────────────────────────────────────────────────────────
    print("\n\n-- YouTube Videos --")
    for i, job in enumerate(VIDEO_JOBS):
        url   = job["url"]
        slug  = job["topic_slug"]
        title = job["title"]
        ktype = job["knowledge_type"]

        print(f"\n[{i+1}/{len(VIDEO_JOBS)}] {title}")
        print(f"  URL: {url}")

        try:
            text = extract_youtube_transcript(url)
            print(f"  → Transcript: {len(text):,} chars")
        except Exception as e:
            print(f"  ✗  Transcript extraction failed: {e}")
            print(f"     Tip: install yt-dlp with: pip install yt-dlp")
            total_err += 1
            continue

        if len(text) < 200:
            print(f"  ✗  Transcript too short ({len(text)} chars) — skipping")
            total_err += 1
            continue

        parts = split_text(text, MAX_CHARS)
        print(f"  → Split into {len(parts)} part(s)")

        for j, part_text in enumerate(parts):
            part_slug  = slug if len(parts) == 1 else f"{slug}-part{j+1}"
            part_title = title if len(parts) == 1 else f"{title} (Part {j+1}/{len(parts)})"
            (OUT_DIR / f"{part_slug}.md").write_text(part_text, encoding="utf-8")
            if j > 0:
                time.sleep(3)
            try:
                result = ingest_chunk(admin_secret, AGENT_ID, ktype, part_slug, part_title, part_text, url)
                chunks = result.get("chunkCount", result.get("chunk_count", "?"))
                print(f"  ✓  {part_slug}: {chunks} chunks ingested")
                total_ok += 1
            except Exception as e:
                print(f"  ✗  Ingest failed for {part_slug}: {e}")
                total_err += 1

        if i < len(VIDEO_JOBS) - 1:
            time.sleep(5)

    print(f"\n{'='*60}")
    print(f"  Done: {total_ok} slugs ingested, {total_err} failed")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
