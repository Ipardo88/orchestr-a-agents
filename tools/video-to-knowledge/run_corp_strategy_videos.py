"""
Corporate Strategy agent — YouTube video ingestion (4 videos).

Videos:
  1. An Introduction to Corporate Strategy        https://youtu.be/J1NzoP4s4mo
  2. Corporate Finance & Strategic Capital Alloc  https://youtu.be/jJXjNU7d6PI
  3. Capital Allocation & Long-Term Value         https://youtu.be/-tqsUkdUCBM
     (Mauboussin & Callahan 2025 Extended Audio)
  4. S&P Global — M&A Strategy (Now is the time) https://youtu.be/wP3ycv3QcI8

Run from project root:
    python tools/video-to-knowledge/run_corp_strategy_videos.py
"""

import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from VIDEO_INGESTION_TOOL import VideoKnowledgeTool

JOBS = [
    {
        "source":         "https://youtu.be/J1NzoP4s4mo",
        "agent_id":       "corporate-strategy",
        "topic_slug":     "corp-intro-corporate-strategy",
        "title":          "An Introduction to Corporate Strategy",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/jJXjNU7d6PI",
        "agent_id":       "corporate-strategy",
        "topic_slug":     "corp-finance-capital-allocation",
        "title":          "Corporate Finance Explained — Strategic Capital Allocation",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/-tqsUkdUCBM",
        "agent_id":       "corporate-strategy",
        "topic_slug":     "corp-mauboussin-capital-allocation",
        "title":          "Capital Allocation and Long-Term Value — Mauboussin & Callahan 2025",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/wP3ycv3QcI8",
        "agent_id":       "corporate-strategy",
        "topic_slug":     "corp-ma-timing-strategy",
        "title":          "M&A Strategy — Now Is the Time to Strike (S&P Global, Doug Peterson)",
        "knowledge_type": "framework",
    },
]

if __name__ == "__main__":
    tool = VideoKnowledgeTool()
    results = []

    for i, job in enumerate(JOBS):
        if i > 0:
            print(f"\n  Waiting 20s between jobs ...")
            time.sleep(20)

        print(f"\n{'='*60}")
        print(f"  JOB {i+1}/{len(JOBS)}: {job['title']}")
        print(f"{'='*60}")

        try:
            out_path = tool.process(**job)
            results.append({"status": "ok", "path": str(out_path), "slug": job["topic_slug"]})
            print(f"  DONE → {out_path}")
        except Exception as e:
            results.append({"status": "error", "error": str(e), "slug": job["topic_slug"]})
            print(f"  FAILED: {e}")

    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    ok  = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]
    print(f"  {len(ok)}/{len(JOBS)} succeeded")
    for r in ok:
        print(f"  ✓  {r['slug']} → {r['path']}")
    for r in err:
        print(f"  ✗  {r['slug']}: {r['error']}")

    if ok:
        print(f"\n  Next: ingest the generated .md files via seed.sh or run_ingest_corp.py")
