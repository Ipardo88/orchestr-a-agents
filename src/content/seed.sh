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
echo "[1/3] Ingesting okr-methodology.md..."
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
echo "[2/3] Ingesting kpi-design.md..."
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
echo "[3/3] Ingesting capability-mapping.md..."
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
echo "==> Seeding complete."
echo ""
echo "Verify in Supabase SQL Editor:"
echo "  SELECT topic_slug, count(*) as chunks"
echo "  FROM knowledge_chunks"
echo "  WHERE agent_id = 'bos'"
echo "  GROUP BY topic_slug;"
echo ""
echo "Expected: 3 rows (okr-methodology, kpi-design, capability-mapping), each 3-8 chunks."
