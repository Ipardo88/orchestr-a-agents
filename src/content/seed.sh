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

echo "==> Seeding complete."
echo ""
echo "Verify in Supabase SQL Editor:"
echo "  SELECT agent_id, topic_slug, count(*) as chunks"
echo "  FROM knowledge_chunks"
echo "  GROUP BY agent_id, topic_slug"
echo "  ORDER BY agent_id, topic_slug;"
echo ""
echo "Expected: 18 topic_slugs across 3 agents:"
echo "  bos (9): okr-methodology, kpi-design, capability-mapping,"
echo "    clarity-compass, value-engines, playbook-library,"
echo "    company-scorecard, meeting-rhythm, high-output-team"
echo "  strategy-foundation (3): purpose-design, vision-design, strategic-goals-methodology"
echo "  business-model (6): business-model-canvas, bmc-assessment, pestel-analysis,"
echo "    playing-to-win, odyssey-3-14, business-model-examples"
