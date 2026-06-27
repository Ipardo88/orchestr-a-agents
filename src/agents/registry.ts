import { BosAgent } from './bosAgent';
import { BusinessModelAgent } from './businessModelAgent';
import { FinancialIntelligenceAgent } from './financialIntelligenceAgent';
import { SignalOracleAgent } from './signalOracleAgent';
import { StrategyFoundationAgent } from './strategyFoundationAgent';
import type { BaseAgent } from './base/BaseAgent';

export const AGENTS: Map<string, BaseAgent> = new Map<string, BaseAgent>([
  ['bos',                      new BosAgent()],
  ['business-model',           new BusinessModelAgent()],
  ['financial-intelligence',   new FinancialIntelligenceAgent()],
  ['signal-oracle',            new SignalOracleAgent()],
  ['strategy-foundation',      new StrategyFoundationAgent()],
]);

export function getAgent(agentId: string): BaseAgent | undefined {
  return AGENTS.get(agentId);
}
