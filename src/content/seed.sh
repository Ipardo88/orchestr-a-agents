#!/bin/bash
# ============================================================
# OrchestrA Agents — BOS Framework Content Seeder
# ============================================================
# Prerequisites before running:
#   1. R2 bucket is enabled and bound in wrangler.toml
#   2. Worker is deployed: wrangler deploy
#   3. ADMIN_SECRET is set in the Worker's environment (wrangler secret put ADMIN_SECRET)
#   4. jq is installed locally (brew install jq / apt install jq)
#
# Usage:
#   chmod +x src/content/seed.sh
#   WORKER_URL="https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev" \
#   ADMIN_SECRET="your-secret-here" \
#   ./src/content/seed.sh
# ============================================================

set -e

WORKER_URL="${WORKER_URL:-https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev}"
ADMIN_SECRET="${ADMIN_SECRET:-YOUR_ADMIN_SECRET}"

if [[ "$WORKER_URL" == *"YOUR_SUBDOMAIN"* ]]; then
  echo "ERROR: Set WORKER_URL to your deployed Worker URL before running."
  echo "  export WORKER_URL=https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev"
  exit 1
fi

if [[ "$ADMIN_SECRET" == "YOUR_ADMIN_SECRET" ]]; then
  echo "ERROR: Set ADMIN_SECRET to the value configured on your Worker."
  echo "  export ADMIN_SECRET=your-secret-here"
  exit 1
fi

# Resolve the directory containing this script so it works from any cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Seeding BOS framework content to $WORKER_URL"
echo ""

# ============================================================
# 1. OKR Methodology
# ============================================================
echo "[1/9] Ingesting okr-methodology.md..."
CONTENT_OKR=$(jq -Rs . < "$SCRIPT_DIR/bos/okr-methodology.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"okr-methodology\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/okr-methodology.md\",
    \"title\": \"OKR Methodology — Measure What Matters\",
    \"content\": $CONTENT_OKR
  }" | jq .

echo ""

# ============================================================
# 2. KPI Design
# ============================================================
echo "[2/9] Ingesting kpi-design.md..."
CONTENT_KPI=$(jq -Rs . < "$SCRIPT_DIR/bos/kpi-design.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"kpi-design\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/kpi-design.md\",
    \"title\": \"KPI Design — Metrics That Matter\",
    \"content\": $CONTENT_KPI
  }" | jq .

echo ""

# ============================================================
# 3. Capability Mapping
# ============================================================
echo "[3/9] Ingesting capability-mapping.md..."
CONTENT_CAP=$(jq -Rs . < "$SCRIPT_DIR/bos/capability-mapping.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"capability-mapping\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/capability-mapping.md\",
    \"title\": \"Capability Mapping — Playing to Win\",
    \"content\": $CONTENT_CAP
  }" | jq .

echo ""

# ============================================================
# 4. Clarity Compass
# ============================================================
echo "[4/9] Ingesting clarity-compass.md..."
CONTENT_CLARITY=$(jq -Rs . < "$SCRIPT_DIR/bos/clarity-compass.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"clarity-compass\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/clarity-compass.md\",
    \"title\": \"Clarity Compass — The Foundation of Scalable Execution\",
    \"content\": $CONTENT_CLARITY
  }" | jq .

echo ""

# ============================================================
# 5. Value Engines
# ============================================================
echo "[5/9] Ingesting value-engines.md..."
CONTENT_ENGINES=$(jq -Rs . < "$SCRIPT_DIR/bos/value-engines.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"value-engines\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/value-engines.md\",
    \"title\": \"Value Engines — The Three Systems That Make a Business Scalable\",
    \"content\": $CONTENT_ENGINES
  }" | jq .

echo ""

# ============================================================
# 6. Playbook Library
# ============================================================
echo "[6/9] Ingesting playbook-library.md..."
CONTENT_PLAYBOOK=$(jq -Rs . < "$SCRIPT_DIR/bos/playbook-library.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"playbook-library\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/playbook-library.md\",
    \"title\": \"Playbook Library — Systematizing What Works\",
    \"content\": $CONTENT_PLAYBOOK
  }" | jq .

echo ""

# ============================================================
# 7. Company Scorecard
# ============================================================
echo "[7/9] Ingesting company-scorecard.md..."
CONTENT_SCORECARD=$(jq -Rs . < "$SCRIPT_DIR/bos/company-scorecard.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"company-scorecard\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/company-scorecard.md\",
    \"title\": \"Company Scorecard — Measuring What Drives the Business\",
    \"content\": $CONTENT_SCORECARD
  }" | jq .

echo ""

# ============================================================
# 8. Meeting Rhythm
# ============================================================
echo "[8/9] Ingesting meeting-rhythm.md..."
CONTENT_RHYTHM=$(jq -Rs . < "$SCRIPT_DIR/bos/meeting-rhythm.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"meeting-rhythm\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/meeting-rhythm.md\",
    \"title\": \"Meeting Rhythm — The Scalable Planning System\",
    \"content\": $CONTENT_RHYTHM
  }" | jq .

echo ""

# ============================================================
# 9. High-Output Team
# ============================================================
echo "[9/9] Ingesting high-output-team.md..."
CONTENT_TEAM=$(jq -Rs . < "$SCRIPT_DIR/bos/high-output-team.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"high-output-team\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/high-output-team.md\",
    \"title\": \"High-Output Team Canvas — Building Teams That Scale\",
    \"content\": $CONTENT_TEAM
  }" | jq .

echo ""

# ============================================================
# STRATEGY FOUNDATION AGENT — 3 files
# ============================================================

echo "[10/18] Ingesting purpose-design.md..."
CONTENT_PURPOSE=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/purpose-design.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"purpose-design\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/purpose-design.md\",
    \"title\": \"Company Purpose — Why Your Organization Exists\",
    \"content\": $CONTENT_PURPOSE
  }" | jq .
echo ""

echo "[11/18] Ingesting vision-design.md..."
CONTENT_VISION=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/vision-design.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"vision-design\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/vision-design.md\",
    \"title\": \"Vision Design — The Concrete Picture of Where You Are Going\",
    \"content\": $CONTENT_VISION
  }" | jq .
echo ""

echo "[12/18] Ingesting strategic-goals-methodology.md..."
CONTENT_GOALS=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/strategic-goals-methodology.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"strategic-goals-methodology\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/strategic-goals-methodology.md\",
    \"title\": \"Strategic Goals — Translating Vision Into Measurable Commitments\",
    \"content\": $CONTENT_GOALS
  }" | jq .
echo ""

# ============================================================
# BUSINESS MODEL AGENT — 6 files
# ============================================================

echo "[13/18] Ingesting business-model-canvas.md..."
CONTENT_BMC=$(jq -Rs . < "$SCRIPT_DIR/business-model/business-model-canvas.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"business-model-canvas\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/business-model-canvas.md\",
    \"title\": \"Business Model Canvas — 9 Building Blocks\",
    \"content\": $CONTENT_BMC
  }" | jq .
echo ""

echo "[14/18] Ingesting bmc-assessment.md..."
CONTENT_BMCA=$(jq -Rs . < "$SCRIPT_DIR/business-model/bmc-assessment.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bmc-assessment\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bmc-assessment.md\",
    \"title\": \"BMC Assessment — Stress-Testing Your Business Model\",
    \"content\": $CONTENT_BMCA
  }" | jq .
echo ""

echo "[15/18] Ingesting pestel-analysis.md..."
CONTENT_PESTEL=$(jq -Rs . < "$SCRIPT_DIR/business-model/pestel-analysis.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"pestel-analysis\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/pestel-analysis.md\",
    \"title\": \"PESTEL Analysis — Mapping the External Environment\",
    \"content\": $CONTENT_PESTEL
  }" | jq .
echo ""

echo "[16/18] Ingesting playing-to-win.md..."
CONTENT_PTW=$(jq -Rs . < "$SCRIPT_DIR/business-model/playing-to-win.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"playing-to-win\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/playing-to-win.md\",
    \"title\": \"Playing to Win — Making Strategic Choices That Create Competitive Advantage\",
    \"content\": $CONTENT_PTW
  }" | jq .
echo ""

echo "[17/18] Ingesting odyssey-3-14.md..."
CONTENT_ODYSSEY=$(jq -Rs . < "$SCRIPT_DIR/business-model/odyssey-3-14.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"odyssey-3-14\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/odyssey-3-14.md\",
    \"title\": \"Odyssey 3.14 — HEC Paris Business Model Innovation Framework\",
    \"content\": $CONTENT_ODYSSEY
  }" | jq .
echo ""

echo "[18/18] Ingesting business-model-examples.md..."
CONTENT_EXAMPLES=$(jq -Rs . < "$SCRIPT_DIR/business-model/business-model-examples.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"business-model-examples\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/business-model-examples.md\",
    \"title\": \"Business Model Case Studies — Apple, Tesla, Amazon, CVS, Swiss Re, Xiaomi\",
    \"content\": $CONTENT_EXAMPLES
  }" | jq .
echo ""

# ============================================================
# VIDEO-GENERATED KNOWLEDGE — Strategy Foundation (2 files)
# ============================================================

echo "[19/39] Ingesting what-is-strategy.md..."
CONTENT_WHAT_IS_STRATEGY=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/what-is-strategy.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"what-is-strategy\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/what-is-strategy.md\",
    \"title\": \"What Is Strategy? It's a Lot Simpler Than You Think\",
    \"content\": $CONTENT_WHAT_IS_STRATEGY
  }" | jq .
echo ""

echo "[20/39] Ingesting plan-vs-strategy.md..."
CONTENT_PLAN_VS_STRATEGY=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/plan-vs-strategy.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"plan-vs-strategy\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/plan-vs-strategy.md\",
    \"title\": \"A Plan Is Not a Strategy\",
    \"content\": $CONTENT_PLAN_VS_STRATEGY
  }" | jq .
echo ""

# ============================================================
# VIDEO-GENERATED KNOWLEDGE — Business Model (17 files)
# ============================================================

echo "[21/39] Ingesting bm-idea-to-model.md..."
CONTENT_BM_IDEA_TO_MODEL=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-idea-to-model.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-idea-to-model\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-idea-to-model.md\",
    \"title\": \"From Business Idea to Business Model\",
    \"content\": $CONTENT_BM_IDEA_TO_MODEL
  }" | jq .
echo ""

echo "[22/39] Ingesting bm-visualizing-canvas.md..."
CONTENT_BM_VIZ=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-visualizing-canvas.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-visualizing-canvas\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-visualizing-canvas.md\",
    \"title\": \"Visualizing Your Business Model\",
    \"content\": $CONTENT_BM_VIZ
  }" | jq .
echo ""

echo "[23/39] Ingesting bm-prototyping.md..."
CONTENT_BM_PROTO=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-prototyping.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-prototyping\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-prototyping.md\",
    \"title\": \"Business Model Prototyping\",
    \"content\": $CONTENT_BM_PROTO
  }" | jq .
echo ""

echo "[24/39] Ingesting bm-navigating-environment.md..."
CONTENT_BM_NAV=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-navigating-environment.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-navigating-environment\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-navigating-environment.md\",
    \"title\": \"Navigating Your Business Environment\",
    \"content\": $CONTENT_BM_NAV
  }" | jq .
echo ""

echo "[25/39] Ingesting bm-proving-model.md..."
CONTENT_BM_PROVE=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-proving-model.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-proving-model\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-proving-model.md\",
    \"title\": \"Proving Your Business Model\",
    \"content\": $CONTENT_BM_PROVE
  }" | jq .
echo ""

echo "[26/39] Ingesting bm-storytelling.md..."
CONTENT_BM_STORY=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-storytelling.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-storytelling\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-storytelling.md\",
    \"title\": \"Telling Your Business Model Story\",
    \"content\": $CONTENT_BM_STORY
  }" | jq .
echo ""

echo "[27/39] Ingesting bm-competing.md..."
CONTENT_BM_COMPETE=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-competing.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-competing\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-competing.md\",
    \"title\": \"Competing on Business Models\",
    \"content\": $CONTENT_BM_COMPETE
  }" | jq .
echo ""

echo "[28/39] Ingesting bm-designing.md..."
CONTENT_BM_DESIGN=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-designing.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-designing\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-designing.md\",
    \"title\": \"Designing Business Models\",
    \"content\": $CONTENT_BM_DESIGN
  }" | jq .
echo ""

echo "[29/39] Ingesting bm-in-context.md..."
CONTENT_BM_CTX=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-in-context.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-in-context\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-in-context.md\",
    \"title\": \"The Business Model in Context\",
    \"content\": $CONTENT_BM_CTX
  }" | jq .
echo ""

echo "[30/39] Ingesting bm-numbers-improvement.md..."
CONTENT_BM_NUMS=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-numbers-improvement.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bm-numbers-improvement\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-numbers-improvement.md\",
    \"title\": \"Playing with Numbers and Improving Existing Business Models\",
    \"content\": $CONTENT_BM_NUMS
  }" | jq .
echo ""

echo "[31/39] Ingesting bm-case-dong-energy.md..."
CONTENT_BM_DONG=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-case-dong-energy.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"bm-case-dong-energy\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-case-dong-energy.md\",
    \"title\": \"Dong Energy: Business Model Reinvention While Profitable\",
    \"content\": $CONTENT_BM_DONG
  }" | jq .
echo ""

echo "[32/39] Ingesting bm-case-aws.md..."
CONTENT_BM_AWS=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-case-aws.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"bm-case-aws\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-case-aws.md\",
    \"title\": \"Amazon Web Services: Resource-Driven Business Model\",
    \"content\": $CONTENT_BM_AWS
  }" | jq .
echo ""

echo "[33/39] Ingesting bm-case-lego.md..."
CONTENT_BM_LEGO=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-case-lego.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"bm-case-lego\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-case-lego.md\",
    \"title\": \"LEGO's Business Model Turnaround\",
    \"content\": $CONTENT_BM_LEGO
  }" | jq .
echo ""

echo "[34/39] Ingesting bm-case-disney.md..."
CONTENT_BM_DISNEY=$(jq -Rs . < "$SCRIPT_DIR/business-model/bm-case-disney.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"bm-case-disney\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/bm-case-disney.md\",
    \"title\": \"Disney's Scalable Business Model\",
    \"content\": $CONTENT_BM_DISNEY
  }" | jq .
echo ""

echo "[35/39] Ingesting vpc-explained.md..."
CONTENT_VPC_EXP=$(jq -Rs . < "$SCRIPT_DIR/business-model/vpc-explained.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"vpc-explained\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/vpc-explained.md\",
    \"title\": \"Value Proposition Canvas Explained\",
    \"content\": $CONTENT_VPC_EXP
  }" | jq .
echo ""

echo "[36/39] Ingesting vpc-mastering.md..."
CONTENT_VPC_MAST=$(jq -Rs . < "$SCRIPT_DIR/business-model/vpc-mastering.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"vpc-mastering\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/vpc-mastering.md\",
    \"title\": \"Mastering Value Propositions\",
    \"content\": $CONTENT_VPC_MAST
  }" | jq .
echo ""

echo "[37/39] Ingesting vpc-case-tesla.md..."
CONTENT_VPC_TESLA=$(jq -Rs . < "$SCRIPT_DIR/business-model/vpc-case-tesla.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-model\",
    \"knowledgeType\": \"benchmark\",
    \"topicSlug\": \"vpc-case-tesla\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/vpc-case-tesla.md\",
    \"title\": \"Tesla Value Proposition and Market Strategy\",
    \"content\": $CONTENT_VPC_TESLA
  }" | jq .
echo ""

# ============================================================
# VIDEO-GENERATED KNOWLEDGE — BOS (2 files)
# ============================================================

echo "[38/39] Ingesting bos-scalable-os.md..."
CONTENT_BOS_OS=$(jq -Rs . < "$SCRIPT_DIR/bos/bos-scalable-os.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bos-scalable-os\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/bos-scalable-os.md\",
    \"title\": \"How to Grow from \$10M to \$200M: Scalable Operating System\",
    \"content\": $CONTENT_BOS_OS
  }" | jq .
echo ""

echo "[39/39] Ingesting bos-systems-building.md..."
CONTENT_BOS_SYS=$(jq -Rs . < "$SCRIPT_DIR/bos/bos-systems-building.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"bos-systems-building\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/bos-systems-building.md\",
    \"title\": \"How to Build Systems So Your Business Runs Without You\",
    \"content\": $CONTENT_BOS_SYS
  }" | jq .
echo ""

# ============================================================
# PLATFORM KNOWLEDGE — BOS (1 file — update when platform evolves)
# To re-seed ONLY platform knowledge: ./src/content/seed_platform.sh
# ============================================================

echo "[40/47] Ingesting orchestra-bos-platform.md..."
CONTENT_BOS_PLATFORM=$(jq -Rs . < "$SCRIPT_DIR/bos/orchestra-bos-platform.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"orchestra-bos-platform\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/orchestra-bos-platform.md\",
    \"title\": \"OrchestrA BOS Platform Guide — Sub-Modules, Navigation, Agent Capabilities\",
    \"content\": $CONTENT_BOS_PLATFORM
  }" | jq .
echo ""

# ============================================================
# FINANCIAL INTELLIGENCE AGENT (7 files — from skill reference library)
# ============================================================

echo "[41/47] Ingesting fin-three-statement.md..."
CONTENT_FIN_3S=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-three-statement.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-three-statement\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-three-statement.md\",
    \"title\": \"3-Statement Integrated Financial Model — Build Sequence and Structure\",
    \"content\": $CONTENT_FIN_3S
  }" | jq .
echo ""

echo "[42/47] Ingesting fin-valuation.md..."
CONTENT_FIN_VAL=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-valuation.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-valuation\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-valuation.md\",
    \"title\": \"Valuation Methods — DCF, Comps, Precedents, M&A, LBO, IPO, Intangibles\",
    \"content\": $CONTENT_FIN_VAL
  }" | jq .
echo ""

echo "[43/47] Ingesting fin-archetypes.md..."
CONTENT_FIN_ARCH=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-archetypes.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-archetypes\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-archetypes.md\",
    \"title\": \"Business Archetypes — Financial Model Structure by Industry Type\",
    \"content\": $CONTENT_FIN_ARCH
  }" | jq .
echo ""

echo "[44/47] Ingesting fin-cashflow.md..."
CONTENT_FIN_CF=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-cashflow.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-cashflow\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-cashflow.md\",
    \"title\": \"Monthly Cash Flow Forecasting — Timing Disconnects and Liquidity Planning\",
    \"content\": $CONTENT_FIN_CF
  }" | jq .
echo ""

echo "[45/47] Ingesting fin-budgeting.md..."
CONTENT_FIN_BUD=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-budgeting.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-budgeting\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-budgeting.md\",
    \"title\": \"Master Budget — Revenue, OpEx, Capital, and Cash Budget Structure\",
    \"content\": $CONTENT_FIN_BUD
  }" | jq .
echo ""

echo "[46/47] Ingesting fin-scenarios.md..."
CONTENT_FIN_SCN=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-scenarios.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-scenarios\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-scenarios.md\",
    \"title\": \"Scenario, Sensitivity, and Monte Carlo Analysis\",
    \"content\": $CONTENT_FIN_SCN
  }" | jq .
echo ""

echo "[47/47] Ingesting fin-best-practices.md..."
CONTENT_FIN_BP=$(jq -Rs . < "$SCRIPT_DIR/financial-intelligence/fin-best-practices.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"financial-intelligence\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"fin-best-practices\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/financial-intelligence/fin-best-practices.md\",
    \"title\": \"Financial Modeling Best Practices — 5-Stage Lifecycle\",
    \"content\": $CONTENT_FIN_BP
  }" | jq .
echo ""

# ============================================================
# SIGNAL ORACLE AGENT (4 files — forecasting & time series)
# ============================================================

echo "[48/51] Ingesting signal-workflow.md..."
CONTENT_SIG_WF=$(jq -Rs . < "$SCRIPT_DIR/signal-oracle/signal-workflow.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"signal-oracle\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"signal-workflow\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/signal-oracle/signal-workflow.md\",
    \"title\": \"Signal Oracle — Forecasting Workflow and forecast.py Usage\",
    \"content\": $CONTENT_SIG_WF
  }" | jq .
echo ""

echo "[49/51] Ingesting signal-model-selection.md..."
CONTENT_SIG_MOD=$(jq -Rs . < "$SCRIPT_DIR/signal-oracle/signal-model-selection.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"signal-oracle\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"signal-model-selection\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/signal-oracle/signal-model-selection.md\",
    \"title\": \"Signal Oracle — Model Selection Guide and Quick Reference\",
    \"content\": $CONTENT_SIG_MOD
  }" | jq .
echo ""

echo "[50/51] Ingesting signal-energy-context.md..."
CONTENT_SIG_EN=$(jq -Rs . < "$SCRIPT_DIR/signal-oracle/signal-energy-context.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"signal-oracle\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"signal-energy-context\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/signal-oracle/signal-energy-context.md\",
    \"title\": \"Signal Oracle — Energy & Business Forecasting Context (Sproule ERCE)\",
    \"content\": $CONTENT_SIG_EN
  }" | jq .
echo ""

echo "[51/51] Ingesting signal-evaluation.md..."
CONTENT_SIG_EVAL=$(jq -Rs . < "$SCRIPT_DIR/signal-oracle/signal-evaluation.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"signal-oracle\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"signal-evaluation\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/signal-oracle/signal-evaluation.md\",
    \"title\": \"Signal Oracle — Forecast Evaluation, Metrics, and Failure Modes\",
    \"content\": $CONTENT_SIG_EVAL
  }" | jq .
echo ""

# ============================================================
# 14. Corporate Strategy
# ============================================================

echo "[52/55] Ingesting corp-portfolio-analysis.md..."
CONTENT_CORP_PORT=$(jq -Rs . < "$SCRIPT_DIR/corporate-strategy/corp-portfolio-analysis.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"corporate-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"corp-portfolio-analysis\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/corporate-strategy/corp-portfolio-analysis.md\",
    \"title\": \"Corporate Strategy — Portfolio Analysis: Four Lenses, SBU Definition, Portfolio Roles\",
    \"content\": $CONTENT_CORP_PORT
  }" | jq .
echo ""

echo "[53/55] Ingesting corp-growth-transformation.md..."
CONTENT_CORP_GROW=$(jq -Rs . < "$SCRIPT_DIR/corporate-strategy/corp-growth-transformation.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"corporate-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"corp-growth-transformation\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/corporate-strategy/corp-growth-transformation.md\",
    \"title\": \"Corporate Strategy — Growth, M&A, Divestitures & Portfolio Transformation\",
    \"content\": $CONTENT_CORP_GROW
  }" | jq .
echo ""

echo "[54/55] Ingesting corp-capital-allocation.md..."
CONTENT_CORP_CAP=$(jq -Rs . < "$SCRIPT_DIR/corporate-strategy/corp-capital-allocation.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"corporate-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"corp-capital-allocation\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/corporate-strategy/corp-capital-allocation.md\",
    \"title\": \"Corporate Strategy — Capital Allocation: ROIC, Five Principles & Resource Allocation\",
    \"content\": $CONTENT_CORP_CAP
  }" | jq .
echo ""

echo "[55/55] Ingesting corp-parenting-financial.md..."
CONTENT_CORP_PAR=$(jq -Rs . < "$SCRIPT_DIR/corporate-strategy/corp-parenting-financial.md")
curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"corporate-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"corp-parenting-financial\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/corporate-strategy/corp-parenting-financial.md\",
    \"title\": \"Corporate Strategy — Parenting Archetypes, Corporate Center Design & Financial Strategy\",
    \"content\": $CONTENT_CORP_PAR
  }" | jq .
echo ""

echo "==> Seeding complete (55 topics across 6 agents)."
echo ""
echo "Verify in Supabase SQL Editor:"
echo "  SELECT agent_id, topic_slug, count(*) as chunks"
echo "  FROM knowledge_chunks"
echo "  GROUP BY agent_id, topic_slug"
echo "  ORDER BY agent_id, topic_slug;"
echo ""
echo "Expected: 55 topic_slugs across 6 agents:"
echo "  bos (12): okr-methodology, kpi-design, capability-mapping, clarity-compass,"
echo "    value-engines, playbook-library, company-scorecard, meeting-rhythm,"
echo "    high-output-team, bos-scalable-os, bos-systems-building, orchestra-bos-platform"
echo "  strategy-foundation (5): purpose-design, vision-design, strategic-goals-methodology,"
echo "    what-is-strategy, plan-vs-strategy"
echo "  business-model (23): business-model-canvas, bmc-assessment, pestel-analysis,"
echo "    playing-to-win, odyssey-3-14, business-model-examples, bm-idea-to-model,"
echo "    bm-visualizing-canvas, bm-prototyping, bm-navigating-environment, bm-proving-model,"
echo "    bm-storytelling, bm-competing, bm-designing, bm-in-context, bm-numbers-improvement,"
echo "    bm-case-dong-energy, bm-case-aws, bm-case-lego, bm-case-disney,"
echo "    vpc-explained, vpc-mastering, vpc-case-tesla"
echo "  financial-intelligence (7): fin-three-statement, fin-valuation, fin-archetypes,"
echo "    fin-cashflow, fin-budgeting, fin-scenarios, fin-best-practices"
echo "  signal-oracle (4): signal-workflow, signal-model-selection,"
echo "    signal-energy-context, signal-evaluation"
echo "  corporate-strategy (4): corp-portfolio-analysis, corp-growth-transformation,"
echo "    corp-capital-allocation, corp-parenting-financial"
