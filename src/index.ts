import { runStrategyHealthAgent } from './agents/strategy-health';
import { runCoachAgent } from './agents/coach';
import { SupabaseClient } from './tools/supabase';
import type { Env, AgentType, TriggerSource, ChatRequest } from './types';

// ── CORS headers for requests from the web app ────────────────────────────
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
  // ── Cron triggers (autonomous scheduled runs) ────────────────────────────
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const agentType: AgentType = controller.cron === '0 9 * * 1' ? 'strategy_health' : 'performance_watch';
    console.log(`[cron] ${controller.cron} → ${agentType}`);
    ctx.waitUntil(dispatchAgent(agentType, null, 'cron', env));
  },

  // ── HTTP handler (manual triggers from web app) ──────────────────────────
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

      // Fire-and-forget — respond immediately, run in background
      ctx.waitUntil(dispatchAgent(agentType, orgId, 'manual', env));

      return Response.json(
        { ok: true, message: `${agentType} triggered`, org_id: orgId },
        { headers: CORS },
      );
    }

    // Conversation history: GET /history?org_id=X&user_id=Y
    // Used by the chat panel on open to load existing messages before triggering welcome.
    if (request.method === 'GET' && url.pathname === '/history') {
      const orgId  = url.searchParams.get('org_id');
      const userId = url.searchParams.get('user_id');
      if (!orgId || !userId) {
        return Response.json({ error: 'org_id and user_id are required' }, { status: 400, headers: CORS });
      }
      try {
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const conversationId = await db.getOrCreateConversation(orgId, userId);
        const history = await db.getConversationHistory(conversationId);
        const messages = history
          .filter(m => m.role !== 'tool' && m.content)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
        return Response.json({ conversation_id: conversationId, messages }, { headers: CORS });
      } catch (err) {
        console.error('[history]', err);
        return Response.json({ error: 'Failed to load history' }, { status: 500, headers: CORS });
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

    return new Response('Not found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
