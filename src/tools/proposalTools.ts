export const PROPOSAL_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'propose_strategic_goal',
      description: 'Propose creating a strategic goal for the company. Call this when the user asks for help defining goals or when strategic goals are missing/incomplete.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'The strategic goal statement — clear, outcome-oriented, one sentence' },
          category: {
            type: 'string',
            enum: ['growth', 'profitability', 'customer', 'operational', 'people', 'innovation', 'financial'],
            description: 'Category that best fits this goal',
          },
          timeframe: { type: 'string', description: 'Target timeframe e.g. "Q4 2026" or "2027" — omit if unclear' },
        },
        required: ['goal', 'category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_value_creation_target',
      description: 'Propose a value creation target (a measurable strategic metric with a target value). Use when the user asks for help with value targets, financial goals, or KPIs at the strategy level.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric name e.g. "Annual Revenue", "NPS Score", "Active Clients"' },
          target_value: { type: 'string', description: 'Target value with unit e.g. "$1M", "85", "500 clients", "15%"' },
          current_value: { type: 'string', description: 'Current value in same unit — omit if unknown' },
        },
        required: ['metric', 'target_value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_objective',
      description: 'Propose creating an OKR Objective. Use when the user asks for help creating OKRs, when the BOS is empty, or when execution planning is needed. Can be followed by propose_key_result calls.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Objective title — inspiring, outcome-focused, 5-10 words' },
          level: {
            type: 'string',
            enum: ['company', 'bu', 'team', 'individual'],
            description: 'Organizational level for this objective',
          },
          description: { type: 'string', description: 'Optional longer description of what success looks like' },
          cycle_start: { type: 'string', description: 'ISO date string e.g. 2026-01-01' },
          cycle_end: { type: 'string', description: 'ISO date string e.g. 2026-12-31' },
        },
        required: ['title', 'level'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_key_result',
      description: 'Propose a Key Result for a previously proposed Objective in this same response. objective_proposal_index is 0-based (first propose_objective = 0, second = 1). Always call propose_objective first.',
      parameters: {
        type: 'object',
        properties: {
          objective_proposal_index: {
            type: 'number',
            description: '0-based index of the parent objective in this batch (0 = first propose_objective call in this response)',
          },
          title: { type: 'string', description: 'Key Result title — specific and measurable' },
          metric_type: {
            type: 'string',
            enum: ['number', 'percentage', 'currency', 'boolean'],
            description: 'How progress will be measured',
          },
          unit: { type: 'string', description: 'Unit of measurement e.g. "%", "$", "clients", "NPS pts" — omit for boolean' },
          start_value: { type: 'number', description: 'Starting value (default 0)' },
          target_value: { type: 'number', description: 'Target value to reach' },
        },
        required: ['objective_proposal_index', 'title', 'metric_type', 'target_value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_organization_update',
      description: 'Propose updating a company profile field: vision, mission, or long_term_ambition. Use when the user asks for help drafting any of these.',
      parameters: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            enum: ['vision', 'mission', 'long_term_ambition'],
            description: 'Which field to update',
          },
          value: { type: 'string', description: 'The proposed content — 1-3 sentences' },
        },
        required: ['field', 'value'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_bmc_update',
      description: 'Propose updating a Business Model Canvas block. Use when the user asks for help filling in the BMC.',
      parameters: {
        type: 'object',
        properties: {
          block: {
            type: 'string',
            enum: ['value', 'segments', 'channels', 'relationships', 'revenue', 'resources', 'activities', 'partners', 'cost'],
            description: 'Which BMC block to update',
          },
          content: { type: 'string', description: 'The proposed content for this BMC block' },
        },
        required: ['block', 'content'],
      },
    },
  },
] as const;
