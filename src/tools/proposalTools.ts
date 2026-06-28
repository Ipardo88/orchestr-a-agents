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
          strategic_goal_id: { type: 'string', description: 'UUID of the strategic goal this objective cascades from. Use the ID shown next to the goal in the company context.' },
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
      name: 'propose_kpi',
      description: 'Propose creating a KPI (Key Performance Indicator) — a continuous metric tracked on a regular frequency with a target and alert thresholds. Use when the user asks to set up KPIs, add a metric to their dashboard, or track a business measure. KPIs are distinct from OKR Key Results: KPIs are always-on dashboards, KRs are cycle-specific targets.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'KPI name — short, specific e.g. "Monthly Recurring Revenue", "Lead Conversion Rate", "Net Promoter Score"' },
          description: { type: 'string', description: 'What this KPI measures and why it matters — 1-2 sentences' },
          unit: { type: 'string', description: 'Unit of measurement e.g. "$", "%", "NPS pts", "leads", "days"' },
          directionality: {
            type: 'string',
            enum: ['higher_better', 'lower_better'],
            description: 'Is higher better (revenue, NPS) or lower better (churn, cost, days-to-close)?',
          },
          target_value: { type: 'number', description: 'The target value to reach' },
          threshold_amber: { type: 'number', description: 'Amber/warning threshold — value at which this KPI is at risk. For higher_better: below this is amber. For lower_better: above this is amber.' },
          threshold_red: { type: 'number', description: 'Red/critical threshold — value at which action is required. For higher_better: below this is red. For lower_better: above this is red.' },
          frequency: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'quarterly'],
            description: 'How often this KPI should be reviewed/updated',
          },
        },
        required: ['name', 'directionality'],
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
      name: 'propose_engine',
      description: 'Propose creating a Value Engine in BOS → Engines. Use when the user discusses a lead generation engine, revenue engine, fulfillment engine, or any operational engine. Creates the engine with its activity nodes and edges. Always follow with propose_objective + propose_key_result to make the engine measurable.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Engine name e.g. "Lead Generation Engine", "Client Fulfillment Engine"' },
          type: {
            type: 'string',
            enum: ['acquisition', 'fulfillment', 'success', 'finance', 'hr', 'legal', 'product', 'custom'],
            description: 'Engine type — use "acquisition" for lead gen/sales engines, "fulfillment" for delivery/operations, "success" for retention/CS, "custom" for anything else',
          },
          nodes: {
            type: 'array',
            description: 'The activity steps in this engine in sequential order. Do NOT include Start/End nodes — they are added automatically.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'Step label e.g. "Run Digital Ads (Facebook + Google)", "Qualify Leads via CRM"' },
                stage: { type: 'string', description: 'Process stage e.g. "Lead Generation", "Lead Conversion", "Close Sale", "Onboarding", "Delivery"' },
                description: { type: 'string', description: 'What happens in this step — 1 sentence' },
              },
              required: ['label'],
            },
          },
        },
        required: ['name', 'type', 'nodes'],
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
  {
    type: 'function' as const,
    function: {
      name: 'propose_bmc_assessment',
      description: 'Propose BMC Assessment scores (phase 4B). Use after discussing the strengths and risks of one or more BMC blocks. Provide a score (1-10) and optional note for each assessed block.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'object',
            description: 'Assessment per BMC block. Keys: value, segments, channels, relationships, revenue, resources, activities, partners, cost. Each value has score (1-10) and optional note.',
            additionalProperties: {
              type: 'object',
              properties: {
                score: { type: 'number', description: 'Score from 1 (very weak) to 10 (excellent)' },
                note: { type: 'string', description: 'Brief observation about this block' },
              },
              required: ['score'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_playing_to_win',
      description: 'Propose Strategic Choices using the Playing to Win framework (phase 4D). Call when the user confirms one or more of the five strategic choices. All fields are optional — only include confirmed choices.',
      parameters: {
        type: 'object',
        properties: {
          winning_aspiration: { type: 'string', description: 'What winning looks like: "To be [position] in [market], measured by [metric]." Must be competitive — not just an internal goal.' },
          wtp_customer_segments: { type: 'string', description: 'Target customer segments — who you are serving (and implicitly who you are NOT serving)' },
          wtp_geographies: { type: 'string', description: 'Target geographies — which markets or regions' },
          wtp_channels: { type: 'string', description: 'Distribution channels — how you reach customers' },
          wtp_product_categories: { type: 'string', description: 'Product/service categories offered' },
          where_not_to_play: { type: 'string', description: 'Explicit exclusions — customers, markets, or channels the company will NOT pursue. Being explicit here sharpens the strategy.' },
          how_to_win: { type: 'string', description: 'Competitive advantage statement — what unique position or capability makes you the choice in your playing fields. Must pass the copy-paste test: a competitor cannot simply replicate it.' },
          competitive_advantage: { type: 'string', description: 'Whether advantage is low-cost (systemic cost reduction, standard product) or differentiation (deep customer understanding, premium positioning, customer loyalty)' },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Must-have capabilities — the activities the business must be genuinely excellent at to execute the strategy',
          },
          management_systems: {
            type: 'array',
            items: { type: 'string' },
            description: 'Management systems — the processes, metrics, and structures that reinforce the strategic choices and build capabilities',
          },
        },
      },
    },
  },
] as const;
