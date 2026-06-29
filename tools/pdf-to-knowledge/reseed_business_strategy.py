"""
Re-seeds all business-model content under the new business-strategy agent ID.

Run from project root:
    python tools/pdf-to-knowledge/reseed_business_strategy.py
"""

import os, re, json, sys, time
from pathlib import Path
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKER_URL = os.environ.get("WORKER_URL", "https://orchestr-a-agents.strathubplatform.workers.dev")
AGENT_ID   = "business-strategy"
CONTENT_DIR = Path(__file__).parent.parent.parent / "src" / "content" / "business-model"

JOBS = [
    # Core framework files (from seed.sh lines 13-18)
    {"file": "business-model-canvas.md",   "slug": "business-model-canvas",    "ktype": "framework",  "title": "Business Model Canvas — 9 Building Blocks"},
    {"file": "bmc-assessment.md",           "slug": "bmc-assessment",           "ktype": "framework",  "title": "BMC Assessment — Stress-Testing Your Business Model"},
    {"file": "pestel-analysis.md",          "slug": "pestel-analysis",          "ktype": "framework",  "title": "PESTEL Analysis — Mapping the External Environment"},
    {"file": "playing-to-win.md",           "slug": "playing-to-win-framework", "ktype": "framework",  "title": "Playing to Win — Making Strategic Choices That Create Competitive Advantage"},
    {"file": "odyssey-3-14.md",             "slug": "odyssey-3-14",             "ktype": "framework",  "title": "Odyssey 3.14 — HEC Paris Business Model Innovation Framework"},
    {"file": "business-model-examples.md",  "slug": "business-model-examples",  "ktype": "benchmark", "title": "Business Model Case Studies — Apple, Tesla, Amazon, CVS, Swiss Re, Xiaomi"},
    # Video-generated knowledge files
    {"file": "bm-idea-to-model.md",         "slug": "bm-idea-to-model",         "ktype": "framework",  "title": "From Business Idea to Business Model"},
    {"file": "bm-visualizing-canvas.md",    "slug": "bm-visualizing-canvas",    "ktype": "framework",  "title": "Visualizing Your Business Model"},
    {"file": "bm-prototyping.md",           "slug": "bm-prototyping",           "ktype": "framework",  "title": "Business Model Prototyping"},
    {"file": "bm-navigating-environment.md","slug": "bm-navigating-environment","ktype": "framework",  "title": "Navigating Your Business Environment"},
    {"file": "bm-proving-model.md",         "slug": "bm-proving-model",         "ktype": "framework",  "title": "Proving Your Business Model"},
    {"file": "bm-storytelling.md",          "slug": "bm-storytelling",          "ktype": "framework",  "title": "Telling Your Business Model Story"},
    {"file": "bm-competing.md",             "slug": "bm-competing",             "ktype": "framework",  "title": "Competing on Business Models"},
    {"file": "bm-designing.md",             "slug": "bm-designing",             "ktype": "framework",  "title": "Designing Business Models"},
    {"file": "bm-in-context.md",            "slug": "bm-in-context",            "ktype": "framework",  "title": "The Business Model in Context"},
    {"file": "bm-numbers-improvement.md",   "slug": "bm-numbers-improvement",   "ktype": "framework",  "title": "Playing with Numbers and Improving Existing Business Models"},
    {"file": "bm-case-dong-energy.md",      "slug": "bm-case-dong-energy",      "ktype": "benchmark", "title": "Dong Energy: Business Model Reinvention While Profitable"},
    {"file": "bm-case-aws.md",              "slug": "bm-case-aws",              "ktype": "benchmark", "title": "Amazon Web Services: Resource-Driven Business Model"},
    {"file": "bm-case-lego.md",             "slug": "bm-case-lego",             "ktype": "benchmark", "title": "LEGO's Business Model Turnaround"},
    {"file": "bm-case-disney.md",           "slug": "bm-case-disney",           "ktype": "benchmark", "title": "Disney's Scalable Business Model"},
    {"file": "vpc-explained.md",            "slug": "vpc-explained",            "ktype": "framework",  "title": "Value Proposition Canvas Explained"},
    {"file": "vpc-mastering.md",            "slug": "vpc-mastering",            "ktype": "framework",  "title": "Mastering Value Propositions"},
    {"file": "vpc-case-tesla.md",           "slug": "vpc-case-tesla",           "ktype": "benchmark", "title": "Tesla Value Proposition and Market Strategy"},
    # Platform guide (under business-model folder but seeded for business-strategy)
    {"file": "orchestra-business-strategy-platform.md", "slug": "orchestra-business-strategy-platform", "ktype": "framework", "title": "OrchestrA Business Strategy Module — Platform Guide"},
]

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
    raise RuntimeError("ADMIN_SECRET not found.")

def ingest(admin_secret, slug, ktype, title, content, src_path):
    payload = json.dumps({
        "agentId":       AGENT_ID,
        "knowledgeType": ktype,
        "topicSlug":     slug,
        "source":        "upload",
        "sourcePath":    src_path,
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
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def main():
    admin_secret = _load_admin_secret()
    print(f"Re-seeding business-model content as agent: {AGENT_ID}")
    print(f"Worker: {WORKER_URL}")
    print("=" * 60)

    ok = err = 0
    for i, job in enumerate(JOBS):
        path = CONTENT_DIR / job["file"]
        print(f"\n[{i+1}/{len(JOBS)}] {job['slug']}")
        if not path.exists():
            print(f"  SKIP: file not found at {path}")
            err += 1
            continue
        content = path.read_text(encoding="utf-8", errors="replace")
        if len(content) < 50:
            print(f"  SKIP: too short ({len(content)} chars)")
            err += 1
            continue
        try:
            result = ingest(admin_secret, job["slug"], job["ktype"], job["title"], content,
                            f"src/content/business-model/{job['file']}")
            chunks = result.get("chunkCount", result.get("chunk_count", "?"))
            print(f"  OK: {chunks} chunks")
            ok += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            err += 1
        if i < len(JOBS) - 1:
            time.sleep(2)

    print(f"\n{'='*60}")
    print(f"Done: {ok} ok, {err} failed")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
