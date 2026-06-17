import type {
  Org, Objective, KeyResult, Kpi, StrategicGoal, Capability, EmployeeCapability,
  InsightType, InsightPriority, TriggerSource, AgentType,
  OrgProfile, PlatformState, ChatMessage, CompanyContext,
} from '../types';

export class SupabaseClient {
  private base: string;
  private headers: Record<string, string>;

  constructor(url: string, serviceRoleKey: string) {
    this.base = `${url}/rest/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  private async get<T>(table: string, params: Record<string, string>): Promise<T[]> {
    const url = new URL(`${this.base}/${table}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers: this.headers });
    if (!res.ok) throw new Error(`GET ${table} → ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T[]>;
  }

  private async post<T>(table: string, body: object): Promise<T> {
    const res = await fetch(`${this.base}/${table}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${table} → ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  // ── Readers ───────────────────────────────────────────────────────────────

  async getActiveOrgs(): Promise<Org[]> {
    return this.get<Org>('organizations', {
      select: 'id,name,firm_type',
      is_active: 'eq.true',
    });
  }

  async getOrg(orgId: string): Promise<Org | null> {
    const rows = await this.get<Org>('organizations', {
      id: `eq.${orgId}`,
      select: 'id,name,firm_type',
    });
    return rows[0] ?? null;
  }

  async getObjectives(orgId: string): Promise<Objective[]> {
    return this.get<Objective>('objectives', {
      org_id: `eq.${orgId}`,
      select: 'id,title,level,status,progress,cycle_start,cycle_end,business_unit_id',
      status: 'not.in.(completed,paused)',
      order: 'level.asc,progress.asc',
    });
  }

  async getKeyResults(_orgId: string, objectiveIds: string[]): Promise<KeyResult[]> {
    if (objectiveIds.length === 0) return [];
    return this.get<KeyResult>('key_results', {
      objective_id: `in.(${objectiveIds.join(',')})`,
      select: 'id,objective_id,title,current_value,target_value,start_value,metric_type,unit',
    });
  }

  async getKpis(orgId: string): Promise<Kpi[]> {
    return this.get<Kpi>('kpis', {
      org_id: `eq.${orgId}`,
      select: 'id,name,current_value,target_value,threshold_red,threshold_amber,directionality,unit',
    });
  }

  async getStrategicGoals(orgId: string): Promise<StrategicGoal[]> {
    return this.get<StrategicGoal>('strategic_goals', {
      org_id: `eq.${orgId}`,
      select: 'id,goal,category,timeframe',
    });
  }

  async getCapabilities(orgId: string): Promise<Capability[]> {
    return this.get<Capability>('capabilities', {
      org_id: `eq.${orgId}`,
      select: 'id,name,is_critical',
    });
  }

  async getEmployeeCapabilities(orgId: string): Promise<EmployeeCapability[]> {
    return this.get<EmployeeCapability>('employee_capabilities', {
      select: 'capability_id,current_proficiency,employees!inner(org_id)',
      'employees.org_id': `eq.${orgId}`,
    });
  }

  // ── Coach: org profile + conversation ────────────────────────────────────

  /** Full company context for the AI Coach — pulls all platform data. */
  async getCompanyContext(orgId: string): Promise<CompanyContext | null> {
    // Phase 1: all org_id-scoped tables + business_unit IDs (needed for BMC)
    const [
      orgRows, ctxRows, goalsRows, targetsRows,
      buRows, assessRows, ptwRows,
      objectivesRows, kpisRows, capsRows,
    ] = await Promise.all([
      // Identity + mission/vision/ambition
      this.get<{
        id: string; name: string; industry: string | null; entity_type: string | null;
        business_model_type: string | null; stage: string | null; revenue_range: string | null;
        mission: string | null; vision: string | null; long_term_ambition: string | null;
      }>('organizations', {
        id: `eq.${orgId}`,
        select: 'id,name,industry,entity_type,business_model_type,stage,revenue_range,mission,vision,long_term_ambition',
      }),
      // Pains & gains
      this.get<{ pains: string[] | null; gains: string[] | null }>('org_context', {
        org_id: `eq.${orgId}`, select: 'pains,gains',
      }),
      // Strategic goals
      this.get<{ goal: string; category: string; timeframe: string | null }>('strategic_goals', {
        org_id: `eq.${orgId}`, select: 'goal,category,timeframe', order: 'created_at.asc',
      }),
      // Value creation targets
      this.get<{ metric: string; target_value: string; current_value: string | null }>('value_creation_targets', {
        org_id: `eq.${orgId}`, select: 'metric,target_value,current_value',
      }),
      // Business units — IDs needed for BMC (scoped by business_unit_id, not org_id)
      this.get<{ id: string; name: string }>('business_units', {
        org_id: `eq.${orgId}`, select: 'id,name', order: 'name.asc',
      }),
      // BM Assessment (has org_id)
      this.get<{ items: Record<string, unknown> | null }>('bm_assessments', {
        org_id: `eq.${orgId}`, select: 'items', limit: '1',
      }),
      // Playing to Win strategy (has org_id)
      this.get<{
        winning_aspiration: string | null;
        wtp_customer_segments: string | null; wtp_geographies: string | null;
        wtp_channels: string | null; wtp_product_categories: string | null;
        where_not_to_play: string | null; how_to_win: string | null;
        competitive_advantage: string | null;
        capabilities: string[]; management_systems: string[];
      }>('playing_to_win', {
        org_id: `eq.${orgId}`,
        select: 'winning_aspiration,wtp_customer_segments,wtp_geographies,wtp_channels,wtp_product_categories,where_not_to_play,how_to_win,competitive_advantage,capabilities,management_systems',
        limit: '1',
      }),
      // OKRs — at-risk/behind first
      this.get<{ title: string; level: string; status: string; progress: number }>('objectives', {
        org_id: `eq.${orgId}`,
        select: 'title,level,status,progress',
        status: 'not.in.(completed,paused,draft)',
        order: 'status.asc,progress.asc',
        limit: '8',
      }),
      // KPIs with thresholds for alert detection
      this.get<{
        name: string; current_value: number | null; target_value: number | null;
        threshold_amber: number | null; threshold_red: number | null;
        directionality: string; unit: string | null;
      }>('kpis', {
        org_id: `eq.${orgId}`,
        select: 'name,current_value,target_value,threshold_amber,threshold_red,directionality,unit',
        limit: '15',
      }),
      // Capabilities — critical first
      this.get<{ name: string; is_critical: boolean; description: string | null }>('capabilities', {
        org_id: `eq.${orgId}`,
        select: 'name,is_critical,description',
        order: 'is_critical.desc,name.asc',
        limit: '15',
      }),
    ]);

    if (!orgRows[0]) return null;
    const org = orgRows[0];

    // Phase 2: BMC — business_model_profiles has no org_id; join via BU IDs
    type BmcRow = {
      business_unit_id: string;
      customer_segments: string | null; value_proposition: string | null;
      channels: string | null; revenue_model: string | null;
      key_activities: string | null; key_resources: string | null;
      cost_structure: string | null; key_partners: string | null;
      capabilities: string | null; customer_relationships: string | null;
      profit_formula: string | null; strategic_notes: string | null;
    };
    let bmcRows: BmcRow[] = [];
    if (buRows.length > 0) {
      const buIds = buRows.map(bu => bu.id).join(',');
      bmcRows = await this.get<BmcRow>('business_model_profiles', {
        business_unit_id: `in.(${buIds})`,
        select: 'business_unit_id,customer_segments,value_proposition,channels,revenue_model,key_activities,key_resources,cost_structure,key_partners,capabilities,customer_relationships,profit_formula,strategic_notes',
      }).catch(() => []);
    }

    // Parse BMC — map flat columns to block IDs, merge multi-BU into single map
    let bmcBlocks: Record<string, string> | null = null;
    if (bmcRows.length > 0) {
      const isMultiBu = bmcRows.length > 1;
      const blockMap: Record<string, string[]> = {};

      for (const row of bmcRows) {
        const buName = isMultiBu
          ? (buRows.find(bu => bu.id === row.business_unit_id)?.name ?? 'BU')
          : null;
        const prefix = buName ? `[${buName}] ` : '';

        const fields: [string, string | null][] = [
          ['partners', row.key_partners],
          ['activities', row.key_activities],
          ['resources', row.key_resources],
          ['capabilities', row.capabilities],
          ['value', row.value_proposition],
          ['relationships', row.customer_relationships],
          ['channels', row.channels],
          ['segments', row.customer_segments],
          ['profit', row.profit_formula],
          ['cost', row.cost_structure],
          ['revenue', row.revenue_model],
        ];
        for (const [blockId, val] of fields) {
          if (val?.trim()) {
            if (!blockMap[blockId]) blockMap[blockId] = [];
            blockMap[blockId].push(`${prefix}${val.trim()}`);
          }
        }
      }

      if (Object.keys(blockMap).length > 0) {
        bmcBlocks = Object.fromEntries(
          Object.entries(blockMap).map(([k, arr]) => [k, arr.join(' | ')])
        );
      }
    }

    // Parse BM Assessment
    let assessment: Record<string, { score?: number; note?: string }> | null = null;
    const rawAssess = assessRows[0]?.items as Record<string, unknown> | null;
    if (rawAssess && Object.keys(rawAssess).length > 0) {
      assessment = rawAssess as Record<string, { score?: number; note?: string }>;
    }

    // Parse Playing to Win
    const ptw = ptwRows[0] ?? null;
    const strategy = ptw ? {
      winning_aspiration: ptw.winning_aspiration,
      where_to_play: [
        ptw.wtp_customer_segments, ptw.wtp_geographies,
        ptw.wtp_channels, ptw.wtp_product_categories,
      ].filter(Boolean).join(' | ') || null,
      where_not_to_play: ptw.where_not_to_play,
      how_to_win: ptw.how_to_win,
      competitive_advantage: ptw.competitive_advantage,
      must_have_capabilities: ptw.capabilities ?? [],
      management_systems: ptw.management_systems ?? [],
    } : null;

    return {
      id: org.id,
      name: org.name,
      industry: org.industry,
      entity_type: org.entity_type,
      business_model_type: org.business_model_type,
      stage: org.stage,
      revenue_range: org.revenue_range,
      mission: org.mission,
      vision: org.vision,
      long_term_ambition: org.long_term_ambition,
      pains: ctxRows[0]?.pains ?? [],
      gains: ctxRows[0]?.gains ?? [],
      strategic_goals: goalsRows,
      value_creation_targets: targetsRows,
      business_model_canvas: bmcBlocks,
      bm_assessment: assessment,
      strategy,
      objectives: objectivesRows,
      kpis: kpisRows,
      capabilities: capsRows,
    };
  }

  async getOrgProfile(orgId: string): Promise<OrgProfile | null> {
    const rows = await this.get<{
      id: string; name: string; industry: string | null;
      entity_type: string | null; business_model_type: string | null;
      stage: string | null; revenue_range: string | null;
    }>('organizations', {
      id: `eq.${orgId}`,
      select: 'id,name,industry,entity_type,business_model_type,stage,revenue_range',
    });
    if (!rows[0]) return null;

    const ctxRows = await this.get<{ pains: string[] | null; gains: string[] | null }>(
      'org_context',
      { org_id: `eq.${orgId}`, select: 'pains,gains' },
    );

    return {
      ...rows[0],
      pains: ctxRows[0]?.pains ?? [],
      gains: ctxRows[0]?.gains ?? [],
    };
  }

  async getPlatformState(orgId: string): Promise<PlatformState> {
    const [goals, objectives, kpis, budgets] = await Promise.all([
      this.get<{ id: string }>('strategic_goals', { org_id: `eq.${orgId}`, select: 'id', limit: '1' }),
      this.get<{ id: string }>('objectives', { org_id: `eq.${orgId}`, select: 'id', limit: '1' }),
      this.get<{ id: string }>('kpis', { org_id: `eq.${orgId}`, select: 'id', limit: '1' }),
      this.get<{ id: string }>('budget_cycles', { org_id: `eq.${orgId}`, select: 'id', limit: '1' }),
    ]);
    return {
      hasStrategicGoals: goals.length > 0,
      hasObjectives: objectives.length > 0,
      hasKpis: kpis.length > 0,
      hasEngines: objectives.length > 0, // proxy: BOS is active if OKRs exist
      hasFinancialData: budgets.length > 0,
    };
  }

  async getOrCreateConversation(orgId: string, userId: string): Promise<string> {
    const rows = await this.get<{ id: string }>('agent_conversations', {
      org_id: `eq.${orgId}`,
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
      limit: '1',
      select: 'id',
    });
    if (rows[0]) return rows[0].id;

    const created = await this.post<unknown>('agent_conversations', {
      org_id: orgId,
      user_id: userId,
    });
    return (created as { id: string }[])[0].id;
  }

  async getConversationHistory(conversationId: string, limit = 30): Promise<ChatMessage[]> {
    const rows = await this.get<{
      role: string; content: string | null;
      tool_calls: object | null; tool_results: object | null;
    }>('agent_messages', {
      conversation_id: `eq.${conversationId}`,
      order: 'created_at.asc',
      limit: String(limit),
      select: 'role,content,tool_calls,tool_results',
    });
    return rows.map(r => ({
      role: r.role as 'user' | 'assistant' | 'tool',
      content: r.content,
      tool_calls: r.tool_calls,
      tool_results: r.tool_results,
    }));
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'tool',
    content: string | null,
  ): Promise<void> {
    await this.post('agent_messages', { conversation_id: conversationId, role, content });
  }

  // ── Writers ───────────────────────────────────────────────────────────────

  async createInsight(params: {
    orgId: string;
    agentType: AgentType;
    insightType: InsightType;
    title: string;
    body: string;
    priority: InsightPriority;
    data?: object;
    triggeredBy: TriggerSource;
  }): Promise<void> {
    await this.post('strategy_insights', {
      org_id: params.orgId,
      agent_type: params.agentType,
      insight_type: params.insightType,
      title: params.title,
      body: params.body,
      priority: params.priority,
      data: params.data ?? null,
      triggered_by: params.triggeredBy,
      status: 'new',
    });
  }

  async createAgentRun(params: {
    orgId: string | null;
    agentType: AgentType;
    triggeredBy: TriggerSource;
  }): Promise<string> {
    const rows = await this.post<{ id: string }[]>('agent_runs', {
      org_id: params.orgId,
      agent_type: params.agentType,
      triggered_by: params.triggeredBy,
      status: 'running',
    });
    return (rows as unknown as { id: string }[])[0].id;
  }

  async completeAgentRun(runId: string, params: {
    status: 'completed' | 'failed';
    durationMs: number;
    tokensUsed: number;
    insightsCreated: number;
    errorMessage?: string;
  }): Promise<void> {
    const res = await fetch(`${this.base}/agent_runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        status: params.status,
        duration_ms: params.durationMs,
        tokens_used: params.tokensUsed,
        insights_created: params.insightsCreated,
        error_message: params.errorMessage ?? null,
        completed_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`PATCH agent_runs → ${res.status}`);
  }
}
