import { BosAgent } from './bosAgent';
import type { BaseAgent } from './base/BaseAgent';

export const AGENTS: Map<string, BaseAgent> = new Map([
  ['bos', new BosAgent()],
]);

export function getAgent(agentId: string): BaseAgent | undefined {
  return AGENTS.get(agentId);
}
