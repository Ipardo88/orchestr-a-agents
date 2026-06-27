import { runStrategyHealthAgent } from './agents/strategy-health';
import { runCoachAgent, runAgentContinue } from './agents/coach';
import { SupabaseClient } from './tools/supabase';
import type { Env, AgentType, TriggerSource, ChatRequest, IngestRequest, Proposal } from './types';
import { ingestDocument } from './knowledge/ingestion';

// â”€â”€ CORS headers for requests from the web app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function dispatchAgent(
  agentType: AgentType,
  orgId: string | null,
  triggeredBy: TriggerSource,
  env: Env,
): Promise<{ insightsCreated: number; tokensUsed: number }> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // If no orgId, run across all active orgs
  const orgs = orgId
    ? [{ id: orgId }]
    : await db.getActiveOrgs();

  let totalInsights = 0;
  let totalTokens = 0;

  for (const org of orgs) {
    const runId = await db.createAgentRun({
      orgId: org.id,
      agentType,
      triggeredBy,
    });

    const startMs = Date.now();
    try {
      let result = { insightsCreated: 0, tokensUsed: 0 };

      if (agentType === 'strategy_health') {
        result = await runStrategyHealthAgent(org.id, triggeredBy === 'cron' ? 'cron' : 'manual', env);
      }
      // performance_watch and execution_coach will be added in subsequent sprints

      await db.completeAgentRun(runId, {
        status: 'completed',
        durationMs: Date.now() - startMs,
        tokensUsed: result.tokensUsed,
        insightsCreated: result.insightsCreated,
      });

      totalInsights += result.insightsCreated;
      totalTokens += result.tokensUsed;
    } catch (err) {
      await db.completeAgentRun(runId, {
        status: 'failed',
        durationMs: Date.now() - startMs,
        tokensUsed: 0,
        insightsCreated: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      console.error(`[${agentType}] org=${org.id} FAILED:`, err);
    }
  }

  return { insightsCreated: totalInsights, tokensUsed: totalTokens };
}

export default {
  // â”€â”€ Cron triggers (autonomous scheduled runs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const agentType: AgentType = controller.cron === '0 9 * * 1' ? 'strategy_health' : 'performance_watch';
    console.log(`[cron] ${controller.cron} â†’ ${agentType}`);
    ctx.waitUntil(dispatchAgent(agentType, null, 'cron', env));
  },

  // â”€â”€ HTTP handler (manual triggers from web app) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ ok: true, ts: new Date().toISOString() }, { headers: CORS });
    }

    // Manual trigger: POST /run/:agentType  body: { org_id: string }
    if (request.method === 'POST' && url.pathname.startsWith('/run/')) {
      const agentType = url.pathname.replace('/run/', '') as AgentType;
      const validAgents: AgentType[] = ['strategy_health', 'performance_watch', 'execution_coach'];

      if (!validAgents.includes(agentType)) {
        return Response.json({ error: `Unknown agent: ${agentType}` }, { status: 400, headers: CORS });
      }

      const body = await request.json<{ org_id?: string }>();
      const orgId = body.org_id ?? null;

      // Fire-and-forget â€” respond immediately, run in background
      ctx.waitUntil(dispatchAgent(agentType, orgId, 'manual', env));

      return Response.json(
        { ok: true, message: `${agentType} triggered`, org_id: orgId },
        { headers: CORS },
      );
    }

    // â”€â”€ Conversation list: GET /conversations?org_id=X&user_id=Y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (request.method === 'GET' && url.pathname === '/conversations') {
      const orgId  = url.searchParams.get('org_id');
      const userId = url.searchParams.get('user_id');
      if (!orgId || !userId) {
        return Response.json({ error: 'org_id and user_id are required' }, { status: 400, headers: CORS });
      }
      try {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const conversations = await db.listConversations(orgId, userId);
        return Response.json({ conversations }, { headers: CORS });
      } catch (err) {
        console.error('[conversations]', err);
        return Response.json({ error: 'Failed to list conversations' }, { status: 500, headers: CORS });
      }
    }

    // â”€â”€ New conversation: POST /conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (request.method === 'POST' && url.pathname === '/conversations') {
      const body = await request.json<{ org_id: string; user_id: string }>();
      if (!body.org_id || !body.user_id) {
        return Response.json({ error: 'org_id and user_id are required' }, { status: 400, headers: CORS });
      }
      try {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const conversationId = await db.createNewConversation(body.org_id, body.user_id);
        return Response.json({ conversation_id: conversationId }, { headers: CORS });
      } catch (err) {
        console.error('[new-conversation]', err);
        return Response.json({ error: 'Failed to create conversation' }, { status: 500, headers: CORS });
      }
    }

    // â”€â”€ Conversation history with IDs: GET /history?org_id=X&user_id=Y[&conversation_id=Z]
    // Returns message IDs + timestamps (needed for edit+regenerate).
    // If no conversation_id, loads or creates the most recent one.
    if (request.method === 'GET' && url.pathname === '/history') {
      const orgId          = url.searchParams.get('org_id');
      const userId         = url.searchParams.get('user_id');
      const convIdParam    = url.searchParams.get('conversation_id');
      if (!orgId || !userId) {
        return Response.json({ error: 'org_id and user_id are required' }, { status: 400, headers: CORS });
      }
      try {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const conversationId = convIdParam ?? await db.getOrCreateConversation(orgId, userId);
        const rows = await db.getConversationHistoryWithIds(conversationId);
        const messages = rows
          .filter(r => r.role !== 'tool' && r.content)
          .map(r => ({ id: r.id, role: r.role as 'user' | 'assistant', content: r.content as string, created_at: r.created_at }));
        return Response.json({ conversation_id: conversationId, messages }, { headers: CORS });
      } catch (err) {
        console.error('[history]', err);
        return Response.json({ error: 'Failed to load history' }, { status: 500, headers: CORS });
      }
    }

    // â”€â”€ Edit message + regenerate: PATCH /messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Updates user message content, deletes subsequent messages, re-runs AI.
    if (request.method === 'PATCH' && url.pathname === '/messages') {
      const body = await request.json<{
        message_id: string;
        conversation_id: string;
        created_at: string;
        new_content: string;
        org_id: string;
      }>();
      if (!body.message_id || !body.conversation_id || !body.new_content || !body.org_id) {
        return Response.json({ error: 'message_id, conversation_id, created_at, new_content, org_id are required' }, { status: 400, headers: CORS });
      }
      try {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        await db.editMessageAndTruncate(body.conversation_id, body.message_id, body.created_at, body.new_content);
        const response = await runAgentContinue(body.conversation_id, body.org_id, env);
        return Response.json(response, { headers: CORS });
      } catch (err) {
        console.error('[edit-message]', err);
        return Response.json({ error: err instanceof Error ? err.message : 'Edit failed' }, { status: 500, headers: CORS });
      }
    }

    // AI Coach: POST /chat  body: ChatRequest
    if (request.method === 'POST' && url.pathname === '/chat') {
      const body = await request.json<ChatRequest>();

      if (!body.org_id || !body.user_id) {
        return Response.json({ error: 'org_id and user_id are required' }, { status: 400, headers: CORS });
      }

      try {
        const response = await runCoachAgent(body, env);
        return Response.json(response, { headers: CORS });
      } catch (err) {
        console.error('[coach] error:', err);
        return Response.json(
          { error: err instanceof Error ? err.message : 'Coach agent failed' },
          { status: 500, headers: CORS },
        );
      }
    }


    // ── POST /proposals/apply ─────────────────────────────────────────────────────

    if (request.method === 'POST' && url.pathname === '/proposals/apply') {
      const origin = request.headers.get('Origin') ?? '';
      if (env.ALLOWED_ORIGINS && !env.ALLOWED_ORIGINS.split(',').includes(origin)) {
        return new Response('Forbidden', { status: 403 });
      }

      let body: { proposals: Proposal[]; userId?: string };
      try {
        body = await request.json() as { proposals: Proposal[]; userId?: string };
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
        });
      }

      const { proposals } = body;
      if (!Array.isArray(proposals) || proposals.length === 0) {
        return new Response(JSON.stringify({ error: 'proposals array required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
        });
      }

      const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // Map proposal ID → created DB id (for KR parent linking)
      const createdIds = new Map<string, string>();
      const results: Array<{ id: string; status: 'applied' | 'error'; error?: string }> = [];

      for (const proposal of proposals) {
        try {
          const { id, action, entity, payload, orgId } = proposal;

          if (action === 'create') {
            if (entity === 'strategic_goal') {
              const dbId = await db.createStrategicGoal(orgId, {
                goal: String(payload.goal),
                category: String(payload.category),
                timeframe: payload.timeframe ? String(payload.timeframe) : undefined,
              });
              createdIds.set(id, dbId);

            } else if (entity === 'value_creation_target') {
              const dbId = await db.createValueCreationTarget(orgId, {
                metric: String(payload.metric),
                target_value: String(payload.target_value),
                current_value: payload.current_value ? String(payload.current_value) : undefined,
              });
              createdIds.set(id, dbId);

            } else if (entity === 'objective') {
              const dbId = await db.createObjective(orgId, {
                title: String(payload.title),
                level: String(payload.level),
                description: payload.description ? String(payload.description) : undefined,
                cycle_start: payload.cycle_start ? String(payload.cycle_start) : undefined,
                cycle_end: payload.cycle_end ? String(payload.cycle_end) : undefined,
                strategic_goal_id: payload.strategic_goal_id ? String(payload.strategic_goal_id) : undefined,
              });
              createdIds.set(id, dbId);

            } else if (entity === 'kpi') {
              const dbId = await db.createKpi(orgId, {
                name: String(payload.name),
                description: payload.description ? String(payload.description) : undefined,
                unit: payload.unit ? String(payload.unit) : undefined,
                directionality: (payload.directionality as 'higher_better' | 'lower_better') ?? 'higher_better',
                target_value: payload.target_value !== undefined ? Number(payload.target_value) : undefined,
                threshold_amber: payload.threshold_amber !== undefined ? Number(payload.threshold_amber) : undefined,
                threshold_red: payload.threshold_red !== undefined ? Number(payload.threshold_red) : undefined,
                frequency: payload.frequency ? (payload.frequency as 'daily' | 'weekly' | 'monthly' | 'quarterly') : undefined,
              });
              createdIds.set(id, dbId);

            } else if (entity === 'key_result') {
              // Resolve parent objective DB id via parent_proposal_id
              const parentProposalId = payload.parent_proposal_id ? String(payload.parent_proposal_id) : null;
              const objectiveId = parentProposalId ? (createdIds.get(parentProposalId) ?? null) : null;
              if (!objectiveId) {
                results.push({ id, status: 'error', error: 'Parent objective not found or not yet applied' });
                continue;
              }
              const dbId = await db.createKeyResult(objectiveId, {
                title: String(payload.title),
                metric_type: String(payload.metric_type),
                unit: payload.unit ? String(payload.unit) : undefined,
                start_value: payload.start_value !== undefined ? Number(payload.start_value) : undefined,
                target_value: Number(payload.target_value),
              });
              createdIds.set(id, dbId);
            }
          } else if (action === 'update') {
            if (entity === 'organization') {
              await db.updateOrganizationField(
                orgId,
                payload.field as 'vision' | 'mission' | 'long_term_ambition',
                String(payload.value),
              );

            } else if (entity === 'business_model_canvas') {
              await db.upsertBMCBlock(orgId, String(payload.block), String(payload.content));
            }
          }

          results.push({ id: proposal.id, status: 'applied' });
        } catch (err) {
          results.push({
            id: proposal.id,
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const appliedCount = results.filter(r => r.status === 'applied').length;
      return new Response(
        JSON.stringify({ applied: appliedCount, total: proposals.length, results }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
        },
      );
    }

    // Admin: POST /admin/ingest – seed framework knowledge
    // Protected by ADMIN_SECRET header to prevent unauthorized ingestion.
    if (request.method === 'POST' && url.pathname === '/admin/ingest') {
      const secret = request.headers.get('x-admin-secret');
      if (!secret || secret !== env.ADMIN_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
      }

      const body = await request.json<IngestRequest>();
      if (!body.agentId || !body.knowledgeType || !body.topicSlug || !body.source || !body.sourcePath || !body.title) {
        return Response.json({ error: 'Missing required fields: agentId, knowledgeType, topicSlug, source, sourcePath, title' }, { status: 400, headers: CORS });
      }

      try {
        const result = await ingestDocument(body, env);
        return Response.json({ ok: true, ...result }, { headers: CORS });
      } catch (err) {
        console.error('[admin/ingest] error:', err);
        return Response.json(
          { error: err instanceof Error ? err.message : 'Ingestion failed' },
          { status: 500, headers: CORS },
        );
      }
    }
    return new Response('Not found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;

