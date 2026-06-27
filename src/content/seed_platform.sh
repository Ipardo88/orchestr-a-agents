#!/bin/bash
# ============================================================
# OrchestrA Agents — Platform Knowledge Re-Seeder
# ============================================================
# Re-seeds platform-specific knowledge files only.
# Agent ID assignments:
#   bos                → orchestra-bos-platform.md
#   strategy-foundation → orchestra-strategy-foundation-platform.md
#   corporate-strategy  → orchestra-corporate-strategy-platform.md (future agent)
#   business-strategy   → orchestra-business-strategy-platform.md (future agent)
#
# When to run:
#   - New module sub-page shipped
#   - Agent capability added (new proposal tool)
#   - Navigation path changed
#   - User journey updated
#
# Usage:
#   chmod +x src/content/seed_platform.sh
#   WORKER_URL="https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev" \
#   ADMIN_SECRET="your-secret-here" \
#   ./src/content/seed_platform.sh
# ============================================================

set -e

WORKER_URL="${WORKER_URL:-https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev}"
ADMIN_SECRET="${ADMIN_SECRET:-YOUR_ADMIN_SECRET}"

if [[ "$WORKER_URL" == *"YOUR_SUBDOMAIN"* ]]; then
  echo "ERROR: Set WORKER_URL before running."
  echo "  export WORKER_URL=https://orchestr-a-agents.YOUR_SUBDOMAIN.workers.dev"
  exit 1
fi

if [[ "$ADMIN_SECRET" == "YOUR_ADMIN_SECRET" ]]; then
  echo "ERROR: Set ADMIN_SECRET before running."
  echo "  export ADMIN_SECRET=your-secret-here"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Re-seeding platform knowledge to $WORKER_URL"
echo ""

# ============================================================
# 1. BOS Platform Guide
# Agent: bos (active)
# ============================================================
echo "[1/4] Ingesting orchestra-bos-platform.md (agent: bos)..."
CONTENT=$(jq -Rs . < "$SCRIPT_DIR/bos/orchestra-bos-platform.md")

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
    \"content\": $CONTENT
  }" | jq .
echo ""

# ============================================================
# 2. Strategy Foundation Platform Guide
# Agent: strategy-foundation (active)
# Scope: mission/vision pages, Strategic Intent (strategic goals)
# ============================================================
echo "[2/4] Ingesting orchestra-strategy-foundation-platform.md (agent: strategy-foundation)..."
CONTENT=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/orchestra-strategy-foundation-platform.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"strategy-foundation\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"orchestra-strategy-foundation-platform\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/orchestra-strategy-foundation-platform.md\",
    \"title\": \"OrchestrA Strategy Foundation Platform Guide — Mission, Vision, Strategic Goals\",
    \"content\": $CONTENT
  }" | jq .
echo ""

# ============================================================
# 3. Corporate Strategy Platform Guide
# Agent: corporate-strategy (FUTURE — seeds now, agent TBD)
# ============================================================
echo "[3/4] Ingesting orchestra-corporate-strategy-platform.md (agent: corporate-strategy — future)..."
CONTENT=$(jq -Rs . < "$SCRIPT_DIR/strategy-foundation/orchestra-corporate-strategy-platform.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"corporate-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"orchestra-corporate-strategy-platform\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/strategy-foundation/orchestra-corporate-strategy-platform.md\",
    \"title\": \"OrchestrA Corporate Strategy Platform Guide — Portfolio, Parenting, Growth, Capital Allocation\",
    \"content\": $CONTENT
  }" | jq .
echo ""

# ============================================================
# 4. Business Strategy Platform Guide
# Agent: business-strategy (FUTURE — seeds now, agent TBD)
# ============================================================
echo "[4/4] Ingesting orchestra-business-strategy-platform.md (agent: business-strategy — future)..."
CONTENT=$(jq -Rs . < "$SCRIPT_DIR/business-model/orchestra-business-strategy-platform.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"business-strategy\",
    \"knowledgeType\": \"framework\",
    \"topicSlug\": \"orchestra-business-strategy-platform\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/business-model/orchestra-business-strategy-platform.md\",
    \"title\": \"OrchestrA Business Strategy Platform Guide — BMC, Playing to Win, PESTEL, Functional Strategies\",
    \"content\": $CONTENT
  }" | jq .
echo ""

echo "==> Platform knowledge re-seeded (4 files)."
echo ""
echo "Active agents retrieving platform knowledge:"
echo "  bos               → orchestra-bos-platform"
echo "  strategy-foundation → orchestra-strategy-foundation-platform"
echo ""
echo "Future agents (chunks ready, agents not yet built):"
echo "  corporate-strategy → orchestra-corporate-strategy-platform"
echo "  business-strategy  → orchestra-business-strategy-platform"
echo ""
echo "Verify in Supabase:"
echo "  SELECT agent_id, topic_slug, count(*) as chunks, max(created_at) as last_seeded"
echo "  FROM knowledge_chunks"
echo "  WHERE topic_slug IN ("
echo "    'orchestra-bos-platform',"
echo "    'orchestra-strategy-foundation-platform',"
echo "    'orchestra-corporate-strategy-platform',"
echo "    'orchestra-business-strategy-platform'"
echo "  )"
echo "  GROUP BY agent_id, topic_slug ORDER BY agent_id;"
