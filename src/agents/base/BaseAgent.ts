import { callOpenAIWithTools } from '../../tools/openai';
import type { ToolCall } from '../../tools/openai';
import { retrieveKnowledge, captureMemory } from '../../knowledge/retrieval';
import type { Env, CompanyContext, ChatMessage, AgentKnowledgeConfig, KnowledgeContext } from '../../types';
import type { RoutingConfig } from './types';
import { PROPOSAL_TOOLS } from '../../tools/proposalTools';

export abstract class BaseAgent {
  abstract readonly agentId: string;
  abstract readonly description: string;
  abstract readonly knowledgeConfig: AgentKnowledgeConfig;
  abstract readonly routing: RoutingConfig;

  /**
   * Build the system prompt given company context, retrieved knowledge, and history.
   * Called by run() after knowledge retrieval completes.
   */
  abstract buildSystemPrompt(
    ctx: CompanyContext,
    knowledge: KnowledgeContext,
    history: ChatMessage[],
  ): string;

  /**
   * Main entry point. Retrieves knowledge, builds prompt, calls LLM, captures memory.
   */
  async run(
    ctx: CompanyContext,
    history: ChatMessage[],
    userMessage: string,
    env: Env,
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const phase = this.detectPhase(history, userMessage);

    const knowledge = await retrieveKnowledge({
      agentId: this.agentId,
      phase,
      userMessage,
      orgId: ctx.id,
      config: this.knowledgeConfig,
      env,
    });

    const systemPrompt = this.buildSystemPrompt(ctx, knowledge, history);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(m => m.role !== 'tool' && m.content)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content as string })),
      { role: 'user', content: userMessage },
    ];

    const { content, toolCalls } = await callOpenAIWithTools(env.OPENAI_API_KEY, messages, PROPOSAL_TOOLS, 950);

    if (!content && toolCalls.length === 0) throw new Error(`Empty response from ${this.agentId}`);

    captureMemory({ agentId: this.agentId, orgId: ctx.id, userMessage, assistantResponse: content, env }).catch(() => {});

    return { content, toolCalls };
  }

  /**
   * Detect current sub-phase from recent conversation history.
   * Tries each phaseSignal key in order; returns first match.
   * Falls back to the first key in phaseTopics.
   */
  detectPhase(history: ChatMessage[], userMessage: string): string {
    const recent = [
      ...history.slice(-8).map(m => m.content ?? ''),
      userMessage,
    ].join(' ');

    const phases = Object.keys(this.knowledgeConfig.phaseTopics);
    for (const phase of phases) {
      // Phase key is also used as a regex pattern for detection
      if (phase !== 'default' && new RegExp(phase, 'i').test(recent)) {
        return phase;
      }
    }
    return phases[0] ?? 'default';
  }

  /**
   * Format retrieved knowledge chunks as a <knowledge> block for injection
   * into the system prompt.
   */
  protected formatKnowledge(knowledge: KnowledgeContext): string {
    if (knowledge.chunks.length === 0) return '';

    const lines = [
      '<knowledge>',
      `Phase: ${knowledge.phase} | Topics: ${knowledge.topicSlugs.join(', ')}`,
      '',
      ...knowledge.chunks.map((c, i) => `[${i + 1}] ${c.content}`),
      '</knowledge>',
    ];
    return lines.join('\n');
  }
}
