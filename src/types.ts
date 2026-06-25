export interface Env {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_SECRET: string;
  AGENT_MEMORY: KVNamespace;
  KNOWLEDGE_BUCKET: R2Bucket;
  FRED_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

// ── Supabase data shapes ────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  firm_type: 'single' | 'multi';
}

export interface Objective {
  id: string;
  title: string;
  level: 'company' | 'bu' | 'team' | 'individual';
  status: 'draft' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'paused';
  progress: number;
  cycle_start: string;
  cycle_end: string;
  business_unit_id: string | null;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  current_value: number | null;
  target_value: number | null;
  start_value: number | null;
  metric_type: string;
  unit: string | null;
}

export interface Kpi {
  id: string;
  name: string;
  current_value: number | null;
  target_value: number | null;
  threshold_red: number | null;
  threshold_amber: number | null;
  directionality: 'higher_better' | 'lower_better';
  unit: string | null;
}

export interface StrategicGoal {
  id: string;
  goal: string;
  category: string;
  timeframe: string | null;
}

export interface Capability {
  id: string;
  name: string;
  is_critical: boolean;
  description: string | null;
}

export interface EmployeeCapability {
  capability_id: string;
  current_proficiency: number | null;
}

// ── Agent output shapes ─────────────────────────────────────────────────────

export interface StrategyHealthReport {
  health_score: number;
  health_rationale: string;
  gaps: Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium';
    affected_objectives: string[];
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    suggested_owner: string;
    timeframe: string;
  }>;
  risks: Array<{
    title: string;
    description: string;
  }>;
}

export type InsightType = 'health_report' | 'gap' | 'recommendation' | 'alert' | 'risk';
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'read' | 'actioned' | 'dismissed';
export type AgentType = 'strategy_health' | 'performance_watch' | 'execution_coach';
export type TriggerSource = 'cron' | 'manual' | 'webhook';

// ── Proposal system ──────────────────────────────────────────────────────────

export type ProposalAction = 'create' | 'update';

export type ProposalEntity =
  | 'strategic_goal'
  | 'value_creation_target'
  | 'objective'
  | 'key_result'
  | 'organization'
  | 'business_model_canvas';

export interface Proposal {
  id: string;
  action: ProposalAction;
  entity: ProposalEntity;
  label: string;
  payload: Record<string, unknown>;
  orgId: string;
}

// ── AI Coach (conversational) ───────────────────────────────────────────────

export interface OrgProfile {
  id: string;
  name: string;
  industry: string | null;
  entity_type: string | null;
  business_model_type: string | null;
  stage: string | null;
  revenue_range: string | null;
  pains: string[];
  gains: string[];
}

export interface PlatformState {
  hasStrategicGoals: boolean;
  hasObjectives: boolean;
  hasKpis: boolean;
  hasEngines: boolean;
  hasFinancialData: boolean;
}

export interface CompanyContext {
  // Identity
  id: string;
  name: string;
  industry: string | null;
  entity_type: string | null;
  business_model_type: string | null;
  stage: string | null;
  revenue_range: string | null;
  mission: string | null;
  vision: string | null;
  long_term_ambition: string | null;
  pains: string[];
  gains: string[];

  // Strategy Foundation
  strategic_goals: Array<{ goal: string; category: string; timeframe: string | null }>;
  value_creation_targets: Array<{ metric: string; target_value: string; current_value: string | null }>;

  // Business Model Canvas (block id → text content)
  business_model_canvas: Record<string, string> | null;

  // Business Model Assessment (SWOT per block)
  bm_assessment: Record<string, { score?: number; note?: string }> | null;

  // Strategy: Playing to Win
  strategy: {
    winning_aspiration: string | null;
    where_to_play: string | null;
    where_not_to_play: string | null;
    how_to_win: string | null;
    competitive_advantage: string | null;
    must_have_capabilities: string[];
    management_systems: string[];
  } | null;

  // BOS: OKRs (at-risk / behind first, limited)
  objectives: Array<{ title: string; level: string; status: string; progress: number }>;

  // BOS: KPIs (with thresholds for alert context)
  kpis: Array<{
    name: string;
    current_value: number | null;
    target_value: number | null;
    threshold_amber: number | null;
    threshold_red: number | null;
    directionality: string;
    unit: string | null;
  }>;

  // BOS: Capabilities
  capabilities: Array<{ name: string; is_critical: boolean; description: string | null }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: object | null;
  tool_results?: object | null;
}

export interface ChatRequest {
  org_id: string;
  user_id: string;
  conversation_id?: string | null;
  message: string;
  user_name?: string | null;
}

export interface ChatResponse {
  conversation_id: string;
  content: string;
  role: 'assistant';
  proposals?: Proposal[];
}

// ── Knowledge Architecture ──────────────────────────────────────────────────

export type KnowledgeType = 'framework' | 'benchmark' | 'market_intel' | 'company_docs' | 'company_memory';
export type SourceType = 'github' | 'gcs' | 's3' | 'azure_blob' | 'url' | 'platform' | 'upload';

export interface KnowledgeChunk {
  content: string;
  metadata: Record<string, unknown>;
  rrf_score?: number;
}

export interface AgentKnowledgeConfig {
  /** Map of phase name → array of topic_slugs to load for that phase */
  phaseTopics: Record<string, string[]>;
  /** Max chunks to retrieve per request */
  topK: number;
}

export interface KnowledgeContext {
  chunks: KnowledgeChunk[];
  topicSlugs: string[];
  phase: string;
}

export interface IngestRequest {
  agentId: string;
  knowledgeType: KnowledgeType;
  topicSlug: string;
  source: SourceType;
  sourcePath: string;
  title: string;
  orgId?: string;
  content?: string;
}
