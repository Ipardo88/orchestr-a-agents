import { SupabaseClient } from '../tools/supabase';
import { callOpenAI } from '../tools/openai';
import type { Env, StrategyHealthReport, Objective } from '../types';

const SYSTEM_PROMPT = `You are a senior strategy execution analyst. You receive structured data about a company's OKRs, KPIs, strategic goals, and capabilities. Your job is to identify execution gaps, surface actionable insights, and recommend specific next steps.

Be direct and specific — not generic. Every recommendation must reference actual data points from the input. Respond with valid JSON only.`;

function buildPrompt(
  orgName: string,
  objectives: Objective[],
  atRiskObjectives: Objective[],
  kpiAlerts: string[],
  strategicGoals: string[],
  capabilityGaps: string[],
): string {
  const statusCounts = objectives.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return `Analyze strategy execution health for: ${orgName}

STRATEGIC GOALS:
${strategicGoals.length ? strategicGoals.map((g, i) => `${i + 1}. ${g}`).join('\n') : 'None defined'}

OKR STATUS SUMMARY (${objectives.length} active):
${Object.entries(statusCounts).map(([s, n]) => `- ${s}: ${n}`).join('\n')}

OBJECTIVES REQUIRING ATTENTION (at_risk or behind):
${atRiskObjectives.length
    ? atRiskObjectives.map(o => `- [${o.level.toUpperCase()}] "${o.title}" — ${o.status} (${Math.round(o.progress)}% progress)`).join('\n')
    : 'None — all objectives on track'}

KPI ALERTS (at amber or red threshold):
${kpiAlerts.length ? kpiAlerts.join('\n') : 'No KPI alerts'}

CRITICAL CAPABILITY GAPS:
${capabilityGaps.length ? capabilityGaps.join('\n') : 'No critical gaps identified'}

Return a JSON object with this exact structure:
{
  "health_score": <integer 1-10>,
  "health_rationale": "<2 sentences explaining the score>",
  "gaps": [
    {
      "title": "<concise gap title>",
      "description": "<specific description referencing actual data>",
      "priority": "critical|high|medium",
      "affected_objectives": ["<objective title>"]
    }
  ],
  "recommendations": [
    {
      "title": "<action title>",
      "description": "<specific action with expected outcome>",
      "suggested_owner": "<role, e.g. CEO, CFO, BU Lead>",
      "timeframe": "<e.g. This week, Next 30 days>"
    }
  ],
  "risks": [
    {
      "title": "<risk title>",
      "description": "<what could go wrong and why>"
    }
  ]
}

Provide 2-4 gaps, 3 recommendations, and 1-2 risks. Be specific, not generic.`;
}

export async function runStrategyHealthAgent(
  orgId: string,
  triggeredBy: 'cron' | 'manual',
  env: Env,
): Promise<{ tokensUsed: number; insightsCreated: number }> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Gather all data in parallel
  const [org, objectives, kpis, strategicGoals, capabilities, employeeCapabilities] = await Promise.all([
    db.getOrg(orgId),
    db.getObjectives(orgId),
    db.getKpis(orgId),
    db.getStrategicGoals(orgId),
    db.getCapabilities(orgId),
    db.getEmployeeCapabilities(orgId),
  ]);

  if (!org) throw new Error(`Org ${orgId} not found`);

  // 2. Derive signals
  const atRiskObjectives = objectives.filter(o => o.status === 'at_risk' || o.status === 'behind');

  const kpiAlerts = kpis
    .filter(k => {
      if (k.current_value == null) return false;
      if (k.directionality === 'higher_better') {
        return k.threshold_red != null && k.current_value <= k.threshold_red
            || k.threshold_amber != null && k.current_value <= k.threshold_amber;
      }
      return k.threshold_red != null && k.current_value >= k.threshold_red
          || k.threshold_amber != null && k.current_value >= k.threshold_amber;
    })
    .map(k => {
      const isRed = k.directionality === 'higher_better'
        ? k.current_value! <= (k.threshold_red ?? -Infinity)
        : k.current_value! >= (k.threshold_red ?? Infinity);
      return `- [${isRed ? 'RED' : 'AMBER'}] ${k.name}: ${k.current_value}${k.unit ?? ''} (target: ${k.target_value}${k.unit ?? ''})`;
    });

  const TARGET_PROFICIENCY = 3; // baseline: "Independent" level for critical capabilities

  const avgProficiencyByCapability = new Map<string, number>();
  for (const cap of capabilities) {
    const scores = employeeCapabilities
      .filter(ec => ec.capability_id === cap.id && ec.current_proficiency != null)
      .map(ec => ec.current_proficiency as number);
    if (scores.length) {
      avgProficiencyByCapability.set(cap.id, scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }

  const capabilityGaps = capabilities
    .filter(c => {
      const avg = avgProficiencyByCapability.get(c.id);
      return c.is_critical && avg != null && avg < TARGET_PROFICIENCY;
    })
    .map(c => `- "${c.name}": avg ${avgProficiencyByCapability.get(c.id)!.toFixed(1)}/5 vs required ${TARGET_PROFICIENCY}/5`);

  const goalTitles = strategicGoals.map(g => g.goal);

  // 3. Call Azure OpenAI
  const prompt = buildPrompt(org.name, objectives, atRiskObjectives, kpiAlerts, goalTitles, capabilityGaps);
  const { result: report, usage } = await callOpenAI<StrategyHealthReport>(
    {
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      apiKey: env.AZURE_OPENAI_API_KEY,
      deployment: env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
    },
    SYSTEM_PROMPT,
    prompt,
  );

  // 4. Persist insights
  let insightsCreated = 0;

  // 4a. Top-level health report
  await db.createInsight({
    orgId,
    agentType: 'strategy_health',
    insightType: 'health_report',
    title: `Strategy Health: ${report.health_score}/10 — ${report.health_rationale.split('.')[0]}`,
    body: report.health_rationale,
    priority: report.health_score <= 4 ? 'critical' : report.health_score <= 6 ? 'high' : 'medium',
    data: report,
    triggeredBy,
  });
  insightsCreated++;

  // 4b. Individual gaps
  for (const gap of report.gaps) {
    await db.createInsight({
      orgId,
      agentType: 'strategy_health',
      insightType: 'gap',
      title: gap.title,
      body: gap.description,
      priority: gap.priority,
      data: gap,
      triggeredBy,
    });
    insightsCreated++;
  }

  // 4c. Recommendations
  for (const rec of report.recommendations) {
    await db.createInsight({
      orgId,
      agentType: 'strategy_health',
      insightType: 'recommendation',
      title: rec.title,
      body: `${rec.description} — Owner: ${rec.suggested_owner} | ${rec.timeframe}`,
      priority: 'medium',
      data: rec,
      triggeredBy,
    });
    insightsCreated++;
  }

  return { tokensUsed: usage.inputTokens + usage.outputTokens, insightsCreated };
}
