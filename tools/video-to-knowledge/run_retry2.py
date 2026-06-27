"""
Second retry with 2-minute wait and reduced transcript caps
for large videos that hit synthesis rate limits.
"""
import os, sys, time, urllib.request, json
sys.path.insert(0, os.path.dirname(__file__))
import tempfile
from VIDEO_INGESTION_TOOL import VideoKnowledgeTool, _load_keys, synthesize_knowledge, get_youtube_transcript

JOBS = [
    {
        "source":         "https://youtu.be/35ST-37PPXc",
        "agent_id":       "business-model",
        "topic_slug":     "vpc-mastering",
        "title":          "Mastering Value Propositions",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/nSJL_q5PSE0",
        "agent_id":       "bos",
        "topic_slug":     "bos-scalable-os",
        "title":          "How to Grow from $10M to $200M: Scalable Operating System",
        "knowledge_type": "framework",
    },
]

MAX_CHARS = 30_000  # conservative cap for rate-limited situation

def process_one(job, keys):
    url = job["source"]
    print(f"\nExtracting transcript for: {job['title']} ...")
    with tempfile.TemporaryDirectory() as tmp_dir:
        transcript = get_youtube_transcript(url, tmp_dir)
    print(f"  Raw transcript: {len(transcript):,} chars")
    if len(transcript) > MAX_CHARS:
        transcript = transcript[:MAX_CHARS]
        print(f"  Capped to {MAX_CHARS:,} chars to stay within rate limits")

    md = synthesize_knowledge(
        transcript=transcript,
        frame_notes="",
        title=job["title"],
        agent_id=job["agent_id"],
        topic_slug=job["topic_slug"],
        knowledge_type=job["knowledge_type"],
        source_url=url,
        keys=keys,
    )

    # Determine output path (same logic as the tool)
    import os, pathlib
    here = pathlib.Path(__file__).parent
    project_root = here.parent.parent
    out_dir = project_root / "src" / "content" / job["agent_id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{job['topic_slug']}.md"
    out_path.write_text(md, encoding="utf-8")
    print(f"  Saved: {out_path}")
    return True

if __name__ == "__main__":
    keys = _load_keys()
    for i, job in enumerate(JOBS):
        if i > 0:
            print("\n  Waiting 2 minutes between requests ...")
            time.sleep(120)
        print(f"\n{'='*55}")
        print(f"  JOB {i+1}/{len(JOBS)}: {job['title']}")
        print(f"{'='*55}")
        try:
            process_one(job, keys)
            print(f"  DONE: {job['topic_slug']}.md")
        except Exception as e:
            print(f"  FAILED: {e}")
    print("\nRetry complete.")
