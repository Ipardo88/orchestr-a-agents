import { BosAgent } from './bosAgent';
import { BusinessModelAgent } from './businessModelAgent';
import { CorporateStrategyAgent } from './corporateStrategyAgent';
import { FinancialIntelligenceAgent } from './financialIntelligenceAgent';
import { SignalOracleAgent } from './signalOracleAgent';
import { StrategyFoundationAgent } from './strategyFoundationAgent';
import type { BaseAgent } from './base/BaseAgent';

export const AGENTS: Map<string, BaseAgent> = new Map<string, BaseAgent>([
  ['bos',                      new BosAgent()],
  ['business-model',           new BusinessModelAgent()],
  ['corporate-strategy',       new CorporateStrategyAgent()],
  ['financial-intelligence',   new FinancialIntelligenceAgent()],
  ['signal-oracle',            new SignalOracleAgent()],
  ['strategy-foundation',      new StrategyFoundationAgent()],
]);

export function getAgent(agentId: string): BaseAgent | undefined {
  return AGENTS.get(agentId);
}
