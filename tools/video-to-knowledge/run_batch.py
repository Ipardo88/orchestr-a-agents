"""
Batch ingestion runner — 21 YouTube videos → OrchestrA knowledge base.
Run from the project root:
  python tools/video-to-knowledge/run_batch.py
"""

import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from VIDEO_INGESTION_TOOL import VideoKnowledgeTool

JOBS = [
    # ── STRATEGY FOUNDATION ──────────────────────────────────────────────────
    {
        "source":         "https://youtu.be/o7Ik1OB4TaE",
        "agent_id":       "strategy-foundation",
        "topic_slug":     "what-is-strategy",
        "title":          "What Is Strategy? It's a Lot Simpler Than You Think",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/iuYlGRnC7J8",
        "agent_id":       "strategy-foundation",
        "topic_slug":     "plan-vs-strategy",
        "title":          "A Plan Is Not a Strategy",
        "knowledge_type": "framework",
    },

    # ── BUSINESS MODEL — Strategyzer core series (Ep 1–6) ────────────────────
    {
        "source":         "https://youtu.be/wwShFsSFb-Y",
        "agent_id":       "business-model",
        "topic_slug":     "bm-idea-to-model",
        "title":          "From Business Idea to Business Model",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/wlKP-BaC0jA",
        "agent_id":       "business-model",
        "topic_slug":     "bm-visualizing-canvas",
        "title":          "Visualizing Your Business Model",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/iA5MVUNkSkM",
        "agent_id":       "business-model",
        "topic_slug":     "bm-prototyping",
        "title":          "Business Model Prototyping",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/7O36YBn9x_4",
        "agent_id":       "business-model",
        "topic_slug":     "bm-navigating-environment",
        "title":          "Navigating Your Business Environment",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/-2gd_vhNYT4",
        "agent_id":       "business-model",
        "topic_slug":     "bm-proving-model",
        "title":          "Proving Your Business Model",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/SshglHDKQCc",
        "agent_id":       "business-model",
        "topic_slug":     "bm-storytelling",
        "title":          "Telling Your Business Model Story",
        "knowledge_type": "framework",
    },

    # ── BUSINESS MODEL — Advanced methodology ────────────────────────────────
    {
        "source":         "https://youtu.be/DTf3W9mBiHw",
        "agent_id":       "business-model",
        "topic_slug":     "bm-competing",
        "title":          "Competing on Business Models",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/no0m0I3ygAg",
        "agent_id":       "business-model",
        "topic_slug":     "bm-designing",
        "title":          "Designing Business Models",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/aGkrNYh4MUE",
        "agent_id":       "business-model",
        "topic_slug":     "bm-in-context",
        "title":          "The Business Model in Context",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/EogA96p-l0s",
        "agent_id":       "business-model",
        "topic_slug":     "bm-numbers-improvement",
        "title":          "Playing with Numbers and Improving Existing Business Models",
        "knowledge_type": "framework",
    },

    # ── BUSINESS MODEL — Case studies (benchmark) ────────────────────────────
    {
        "source":         "https://youtu.be/Eqxj3wHxNUo",
        "agent_id":       "business-model",
        "topic_slug":     "bm-case-dong-energy",
        "title":          "Dong Energy: Business Model Reinvention While Profitable",
        "knowledge_type": "benchmark",
    },
    {
        "source":         "https://youtu.be/4Uda1VOrBSI",
        "agent_id":       "business-model",
        "topic_slug":     "bm-case-aws",
        "title":          "Amazon Web Services: Resource-Driven Business Model",
        "knowledge_type": "benchmark",
    },
    {
        "source":         "https://youtu.be/GMJCKI9ibrA",
        "agent_id":       "business-model",
        "topic_slug":     "bm-case-lego",
        "title":          "LEGO's Business Model Turnaround",
        "knowledge_type": "benchmark",
    },
    {
        "source":         "https://youtu.be/Dqakc-VuKjs",
        "agent_id":       "business-model",
        "topic_slug":     "bm-case-disney",
        "title":          "Disney's Scalable Business Model",
        "knowledge_type": "benchmark",
    },

    # ── VALUE PROPOSITION CANVAS ─────────────────────────────────────────────
    {
        "source":         "https://youtu.be/ReM1uqmVfP0",
        "agent_id":       "business-model",
        "topic_slug":     "vpc-explained",
        "title":          "Value Proposition Canvas Explained",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/35ST-37PPXc",
        "agent_id":       "business-model",
        "topic_slug":     "vpc-mastering",
        "title":          "Mastering Value Propositions",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/7-WNQgVLf2s",
        "agent_id":       "business-model",
        "topic_slug":     "vpc-case-tesla",
        "title":          "Tesla Value Proposition and Market Strategy",
        "knowledge_type": "benchmark",
    },

    # ── BUSINESS OPERATING SYSTEM ────────────────────────────────────────────
    {
        "source":         "https://youtu.be/nSJL_q5PSE0",
        "agent_id":       "bos",
        "topic_slug":     "bos-scalable-os",
        "title":          "How to Grow from $10M to $200M: Scalable Operating System",
        "knowledge_type": "framework",
    },
    {
        "source":         "https://youtu.be/B1SPP9oXWYI",
        "agent_id":       "bos",
        "topic_slug":     "bos-systems-building",
        "title":          "How to Build Systems So Your Business Runs Without You",
        "knowledge_type": "framework",
    },
]

if __name__ == "__main__":
    tool = VideoKnowledgeTool()
    results = tool.batch(JOBS)

    print("\n" + "="*55)
    print("  BATCH SUMMARY")
    print("="*55)
    ok  = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]
    print(f"  ✓  {len(ok)} / {len(results)} succeeded")
    if err:
        print(f"  ✗  {len(err)} failed:")
        for r in err:
            print(f"     {r['job']['topic_slug']}: {r['error']}")
    print("="*55)
    print("\nNext: add the new topic_slugs to seed.sh and re-run to ingest.")
