export interface RoutingConfig {
  /** Regex patterns that hard-route a message to this agent */
  routingSignals: RegExp;
  /** Regex patterns that keep routing to this agent when already in domain */
  stickySignals: RegExp;
  /** Key in DomainState to mark as 'active' when this agent runs */
  domainKey: string;
}
