"""Retry the 2 jobs that hit the Azure OpenAI 429 rate limit."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from VIDEO_INGESTION_TOOL import VideoKnowledgeTool

RETRY_JOBS = [
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

if __name__ == "__main__":
    tool = VideoKnowledgeTool()
    results = []
    for i, job in enumerate(RETRY_JOBS):
        if i > 0:
            print(f"  Waiting 30s to respect Azure rate limit ...")
            time.sleep(30)
        results.append(tool.batch([job])[0])

    ok  = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]
    print(f"\n  Retry result: {len(ok)}/2 succeeded")
    if err:
        for r in err:
            print(f"  ✗ {r['job']['topic_slug']}: {r['error']}")
