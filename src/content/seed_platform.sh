#!/bin/bash
# ============================================================
# OrchestrA Agents — Platform Knowledge Re-Seeder
# ============================================================
# Run this script ONLY when platform docs change — it re-seeds
# just the platform-specific knowledge files, leaving all
# methodology/framework knowledge untouched.
#
# When to run:
#   - New BOS sub-module shipped
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
# BOS Platform Guide
# File: src/content/bos/orchestra-bos-platform.md
# ============================================================
echo "[1/1] Ingesting orchestra-bos-platform.md..."
CONTENT=$(jq -Rs . < "$SCRIPT_DIR/bos/orchestra-bos-platform.md")

curl -sf -X POST "$WORKER_URL/admin/ingest" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"agentId\": \"bos\",
    \"knowledgeType\": \"platform\",
    \"topicSlug\": \"orchestra-bos-platform\",
    \"source\": \"upload\",
    \"sourcePath\": \"src/content/bos/orchestra-bos-platform.md\",
    \"title\": \"OrchestrA BOS Platform Guide — Sub-Modules, Navigation, Agent Capabilities\",
    \"content\": $CONTENT
  }" | jq .
echo ""

echo "==> Platform knowledge re-seeded."
echo ""
echo "Verify in Supabase:"
echo "  SELECT topic_slug, count(*) as chunks, max(created_at) as last_seeded"
echo "  FROM knowledge_chunks"
echo "  WHERE topic_slug = 'orchestra-bos-platform'"
echo "  GROUP BY topic_slug;"
echo ""
echo "When the platform evolves:"
echo "  1. Edit src/content/bos/orchestra-bos-platform.md"
echo "  2. Update 'Last updated' date in the file header"
echo "  3. Re-run this script"
echo "  4. Commit the updated .md file"
