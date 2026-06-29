import type { Proposal } from '../types';
import type { ToolCall } from '../tools/openai';

const BMC_BLOCK_LABELS: Record<string, string> = {
  value: 'Value Proposition',
  segments: 'Customer Segments',
  channels: 'Channels',
  relationships: 'Customer Relationships',
  revenue: 'Revenue Streams',
  resources: 'Key Resources',
  activities: 'Key Activities',
  partners: 'Key Partners',
  cost: 'Cost Structure',
};

const ORG_FIELD_LABELS: Record<string, string> = {
  vision: 'Vision',
  mission: 'Mission',
  long_term_ambition: 'Long-Term Ambition',
};

/**
 * Convert OpenAI tool_calls into Proposal[] objects ready to return to the client.
 * Objectives are tracked so key results can reference their parent by proposal ID.
 * Malformed tool call arguments are skipped (never throw).
 */
export function buildProposals(toolCalls: ToolCall[], orgId: string): Proposal[] {
  const proposals: Proposal[] = [];
  const objectiveProposalIds: string[] = [];

  for (const tc of toolCalls) {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    } catch {
      continue;
    }

    const id = crypto.randomUUID();

    switch (tc.function.name) {
      case 'propose_strategic_goal':
        proposals.push({
          id,
          action: 'create',
          entity: 'strategic_goal',
          label: `Strategic Goal: "${String(args.goal)}"`,
          payload: args,
          orgId,
        });
        break;

      case 'propose_value_creation_target':
        proposals.push({
          id,
          action: 'create',
          entity: 'value_creation_target',
          label: `Target: ${String(args.metric)} → ${String(args.target_value)}`,
          payload: args,
          orgId,
        });
        break;

      case 'propose_objective':
        objectiveProposalIds.push(id);
        proposals.push({
          id,
          action: 'create',
          entity: 'objective',
          label: `OKR: "${String(args.title)}"`,
          payload: args,
          orgId,
        });
        break;

      case 'propose_key_result': {
        const parentIdx = Number(args.objective_proposal_index ?? 0);
        const parentProposalId = objectiveProposalIds[parentIdx] ?? null;
        proposals.push({
          id,
          action: 'create',
          entity: 'key_result',
          label: `Key Result: "${String(args.title)}"`,
          payload: { ...args, parent_proposal_id: parentProposalId },
          orgId,
        });
        break;
      }

      case 'propose_kpi': {
        const kpiLabel = args.name ? `KPI: ${String(args.name)}` : 'KPI';
        proposals.push({
          id,
          action: 'create',
          entity: 'kpi',
          label: kpiLabel,
          payload: args,
          orgId,
        });
        break;
      }

      case 'propose_engine': {
        const nodeCount = Array.isArray(args.nodes) ? (args.nodes as unknown[]).length : 0;
        proposals.push({
          id,
          action: 'create',
          entity: 'value_engine',
          label: `Engine: "${String(args.name)}"`,
          payload: args,
          orgId,
        });
        void nodeCount;
        break;
      }

      case 'propose_organization_update': {
        const field = String(args.field);
        proposals.push({
          id,
          action: 'update',
          entity: 'organization',
          label: `Update ${ORG_FIELD_LABELS[field] ?? field}`,
          payload: args,
          orgId,
        });
        break;
      }

      case 'propose_bmc_update': {
        const block = String(args.block);
        proposals.push({
          id,
          action: 'update',
          entity: 'business_model_canvas',
          label: `BMC: ${BMC_BLOCK_LABELS[block] ?? block}`,
          payload: args,
          orgId,
        });
        break;
      }

      case 'propose_bmc_assessment': {
        const items = args.items as Record<string, { score: number; note?: string }>;
        const blockCount = items ? Object.keys(items).length : 0;
        proposals.push({
          id,
          action: 'update',
          entity: 'bmc_assessment',
          label: `BMC Assessment: ${blockCount} block${blockCount !== 1 ? 's' : ''} scored`,
          payload: args,
          orgId,
        });
        break;
      }

      case 'propose_playing_to_win': {
        const fields = Object.keys(args).filter(k => args[k] !== undefined && args[k] !== null && args[k] !== '');
        proposals.push({
          id,
          action: 'update',
          entity: 'playing_to_win',
          label: `Playing to Win: ${fields.length} choice${fields.length !== 1 ? 's' : ''} defined`,
          payload: args,
          orgId,
        });
        break;
      }
    }
  }

  return proposals;
}
