"""
One-off: process NexStrat demo video → competitive analysis markdown.
Saves to src/content/strategy-foundation/nexstrat-competitive-analysis.md
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import VIDEO_INGESTION_TOOL as _vkt
_vkt.WHISPER_MODEL = "tiny"   # fastest model — good enough for demo narration
from VIDEO_INGESTION_TOOL import VideoKnowledgeTool

tool = VideoKnowledgeTool()

result = tool.process(
    source         = r"C:\Users\ivanp\Downloads\NexStrat-demo.mp4",
    agent_id       = "strategy-foundation",
    topic_slug     = "nexstrat-competitive-analysis",
    title          = "NexStrat AI Platform — Competitive Intelligence & Feature Analysis",
    knowledge_type = "benchmark",
    extract_frames = False,  # skip frame extraction — no Anthropic key configured
)

print("\nResult:", result)
