import { runStrategyHealthAgent } from './agents/strategy-health';
import { runCoachAgent, runAgentContinue } from './agents/coach';
import { SupabaseClient } from './tools/supabase';
import type { Env, AgentType, TriggerSource, ChatRequest, IngestRequest } from './types';
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

