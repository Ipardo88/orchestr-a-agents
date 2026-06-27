# Portfolio Analysis Reference

## Table of Contents
1. [History and Purpose of Portfolio Analysis](#history-and-purpose)
2. [Defining Strategic Business Units](#defining-sbus)
3. [The Four Portfolio Lenses](#four-lenses)
4. [Market Lens](#market-lens)
5. [Value Lens](#value-lens)
6. [Ownership Lens](#ownership-lens)
7. [Risk Lens](#risk-lens)
8. [Integrating the Lenses](#integration)
9. [Portfolio Evaluation](#portfolio-evaluation)
10. [Portfolio Roles](#portfolio-roles)
11. [Target Portfolio Configuration](#target-portfolio)

---

## History and Purpose

Portfolio analysis originated with Harry Markowitz's financial portfolio theory (Nobel Prize 1990) and was applied to corporate strategy by Bruce Henderson (BCG) in 1970 with the growth-share matrix. The BCG matrix plotted market growth rate vs. relative market share to reflect cash need vs. cash generation.

Four purposes of portfolio analysis:
- **Monitoring**: Standardized transparency across businesses, objective comparison
- **Steering**: Role-specific strategic and financial targets for each SBU
- **Resource allocation**: Prioritize scarce capital, talent, and management attention
- **Corporate development**: Identify divestiture needs and acquisition opportunities

Key insight: The value lies not in the framework or its output, but in the **process** of performing the analysis—the strategic questions and insights generated along the way.

## Defining SBUs

Apply six criteria:

**Strategic requirements:**
1. **Strategic homogeneity** — Activities in an SBU share common strategic success factors (calls for more, smaller SBUs)
2. **Strategic independence** — Activities in an SBU are largely independent from other SBUs (calls for fewer, larger SBUs)

**Managerial requirements:**
3. **Relevant decision level** — SBUs represent the level at which the board takes strategic decisions
4. **Managerial accountability** — Clear responsibility for achieving SBU targets (avoid splits across organizational units)

**Practical requirements:**
5. **Data availability** — Internal financial data plus external market/competitor information at SBU level
6. **Manageable number** — Typically 9-15 SBUs for deep strategic involvement; more requires standardized approaches

Typical definition basis: ~70% product lines, 38% organizational entity, 31% geographic entity, 22% customer group.

## The Four Portfolio Lenses

### Market Lens

Evaluates the **fundamental strategic potential** of each SBU through market attractiveness and competitive position.

**Market Attractiveness** (future size of profit pools):
| Criterion | What It Measures | Metric Examples |
|-----------|-----------------|-----------------|
| Market size | Current profit pool size | Revenue in $bn |
| Market profitability | Current profit pool margins | Average EBIT/Sales |
| Market growth rate | Change in profit pool size | CAGR % |
| Competitive intensity | Pressure on future margins | 5-point qualitative scale |

**Competitive Position** (future share of profit pools):
| Criterion | What It Measures | Metric Examples |
|-----------|-----------------|-----------------|
| Relative market share | Current share of profit pools | Share vs. largest competitor |
| Relative profitability | Current profit capture | SBU EBIT margin / competitor avg |
| Relative growth rate | Momentum in profit share | SBU growth / market growth |
| Fulfillment of KSFs | Future profit capture potential | Assessment vs. top 3 competitors |

**Profit Pool Concept**: What matters is the size of the profit pools and the SBU's ability to capture them. Market size × market profitability = today's profit pools. Growth and competition intensity predict future pools. Market share × relative profitability = today's share. Relative growth and KSF fulfillment predict future share.

**Scoring Model** (example calibration):
- Market size: <$5bn=1, <$10bn=2, <$20bn=3, <$50bn=4, >$50bn=5
- Market profitability (EBIT/Sales): <0%=1, <2%=2, <4%=3, <6%=4, >6%=5
- Market growth (p.a.): <0%=1, <2%=2, <5%=3, <10%=4, >10%=5
- Relative market share: <0.1=1, <0.4=2, <0.7=3, <1.0=4, >1.0=5

**Calibration choices**: Absolute (vs. broad industry samples—allows cross-company comparison) or relative (vs. own portfolio average—identifies relative positions within portfolio).

**Alternative to scoring**: Two separate matrices (market growth × market profitability; market share × relative profitability) with arrows showing expected future development. Increases transparency, avoids aggregation pitfalls.

### Value Lens

Assesses how well strategic potential converts into **financial performance**.

**Dimension 1 — Financial Health** (backward-looking):
- Preferred metric: Cash Flow Return on Investment (CFROI) vs. WACC
- Practical alternative: Return on Capital Employed (ROCE) vs. WACC
- Fallback: EBIT margins (but must adjust for capital intensity differences)
- Use 3-year averages to normalize cycle effects
- If ROCE > WACC → financially healthy, earning positive economic returns

**Dimension 2 — Value-Creation Potential** (forward-looking):
- Preferred metric: Expected growth in Cash Value Added (CVA) or Economic Value Added (EVA)
- Alternative: ΔEVA(Year5 - Year0) / Capital Employed(Year0)
- Base on financial momentum case (continuous development consistent with historic pathway), not aspirational plans
- Time horizon: typically 3-5 years, consistent with strategic planning horizon

**Four Quadrants**:
| | Positive Value-Creation Outlook | Negative Value-Creation Outlook |
|-|------|------|
| **Above WACC** | Most promising for investment | Manage for cash; understand root causes |
| **Below WACC** | Must prove why future differs from past; "question marks" | Justify portfolio membership or consider exit |

### Ownership Lens

Investigates whether the SBU **benefits from being part of this portfolio**.

**Dimension 1 — Parenting Advantage** (net value from corporate parent):

Value Added Sources (rate 1-5):
- Financial benefits (cheaper funding, tax optimization)
- Strategic direction (clear vision, targets)
- Superior governance (long-term perspective)
- HR benefits (access to talent, training programs)
- Central assets (brands, patents, technology)
- Bundled functions (accounting, IT, procurement)
- Support in operations (expertise, monitoring)

Value Subtracted Sources (rate 1-5):
- Weak understanding of SBU's key success factors
- Expensive corporate services and overhead charges
- Slow decision-making processes
- Conflicts of interest between center and SBU
- Insufficient investment budgets due to assigned role
- High indirect costs for corporate requirements
- Low motivation from limited execution autonomy

**Dimension 2 — Linkage Advantage** (net synergies with other SBUs):

Synergy Sources (rate 1-5):
- Vertical integration of products/services
- Pooling physical assets
- Pooling purchasing power
- Coordinating strategies against joint competitors
- Sharing know-how
- Joint development of new opportunities

Value Destruction Sources (rate 1-5):
- Cross-subsidization of weak SBUs
- Wasted resources for internal coordination
- Complex decision-making processes
- Internal power struggles between SBUs

**Summary**: 3×3 matrix with three categories per axis: "Company is best possible owner" / "Unclear" / "Other company is clearly better owner"

**Ashridge Parenting Matrix** (Campbell et al.): Plots understanding (fit with SBU's KSFs) vs. benefit (fit with SBU's parenting needs). Creates four types: Heartland (high both—core), Ballast (high understanding, low benefit—independent), Value Trap (low understanding, high benefit—dangerous), Alien (low both—exit).

### Risk Lens

Evaluates **risk-return profiles** and portfolio-level diversification.

**Four-Step Risk Modeling**:
1. **Risk identification**: Financial, market, operational, hazard, strategic risks. Prioritize by impact on revenues, cost, investments.
2. **Financial risk model**: Link risk indicators to integrated financial model (starting from existing planning models).
3. **Quantify risk parameters**: Expected values, probability distributions, and **correlations** between risk drivers.
4. **Model impact**: Sensitivity analysis → scenario analysis → Monte Carlo simulation. Calculate Value-at-Risk (VaR), Cash-flow-at-Risk (CFaR), or Earnings-at-Risk (EaR).

**Portfolio-Level Analysis**: Compare alternative portfolio configurations on a risk-return chart. Efficient portfolios maximize return for a given risk level. Account for **correlations between SBUs**—a high-risk stand-alone business may contribute low marginal risk if its risk factors are negatively correlated with the rest.

Practical reality: Full Monte Carlo is rare due to data challenges, model complexity, and assumption sensitivity. At minimum, systematic risk identification and qualitative risk-return comparison adds significant value.

## Integrating the Lenses

**Do not** aggregate everything into a single "super matrix." Too much information is lost, and the tendency toward average values makes differences between SBUs too small for reliable interpretation.

**Recommended approach**: Interpret lenses one-by-one per SBU, then mentally integrate findings:

Example SBU A: Dominant position in mature market + weak financial performance + strong synergies → Turnaround candidate, manage as cash cow with productivity focus, reduce linkage dependencies as insurance against exit.

Example SBU B: Weak position in high-growth profitable market + strong financials + no ownership advantage → Manage as financial asset, consider selling to better owner at attractive price, OR build ownership advantage if SBU is cornerstone of long-term portfolio development.

## Portfolio Evaluation

A good portfolio must be evaluated against the company's specific ambition and objectives:

**Portfolio Health Indicators**:
- Growth profile: Does the portfolio deliver required growth from its markets and competitive positions?
- Financial performance: What share of capital is invested in value-creating vs. value-destroying businesses?
- Ownership advantage: What share of the portfolio has clear ownership justification?
- Risk profile: Is the portfolio appropriately diversified? Are there cluster risks?
- Balance: Is there an appropriate mix of growth engines, cash generators, and development businesses?
- Resilience: Does the portfolio perform adequately across multiple scenarios?

**Advantaged Portfolio Characteristics** (Deloitte Monitor framework):
- **Strategically Sound**: Competitively positioned, balances innovation (70/20/10 core/adjacent/transformational), creates synergies (management-oversight, horizontal, downward, portfolio-system)
- **Value-Creating**: Maximizes intrinsic value (DCF), addresses capital markets value, finds the right owner for each business
- **Resilient**: Survives scenarios, builds optionality (stage-gating, transaction pathways, trend triggers), weighs feasibility and risk (pre-build and post-build)

## Portfolio Roles

Assign each SBU a distinctive role based on multi-lens analysis. Typical role framework:

| Role | Characteristics | Strategic Mandate | Financial Targets | Investment Level |
|------|----------------|-------------------|-------------------|-----------------|
| **Growth Engine** | Strong position in attractive growing market, good ownership fit | Invest for above-market growth, build competitive position | Revenue growth, market share gains | High: priority access to capital |
| **Value Creator** | Strong position in mature market, high returns | Optimize profitability, defend market position | ROCE, EVA, margin improvement | Moderate: maintenance + selective growth |
| **Cash Generator** | Dominant in mature/declining market | Maximize cash generation, minimize investment | Cash flow, dividend to center | Low: maintenance only |
| **Development Business** | Early-stage or turnaround, uncertain outlook | Prove viability within defined timeframe | Milestone-based (not profit) | Targeted: time-limited investment |
| **Exit Candidate** | Weak ownership fit, underperforming, better owner exists | Prepare for orderly divestiture | Maximize sale price | Minimal: maintain sale attractiveness |

## Target Portfolio Configuration

**Process**:
1. Develop 2-4 portfolio development options (ranging from status quo to transformational)
2. For each option, define: which businesses to keep/acquire/divest, target size/composition, required investments, expected synergies
3. Evaluate options against: intrinsic value creation, strategic fit with vision, feasibility (financing, targets, management bandwidth), risk profile, scenario resilience
4. Select preferred option and define transformation roadmap with milestones
5. Translate into portfolio roles, resource allocation guidelines, and M&A pipeline

**Five Value-Creation Approaches to Portfolio Composition** (McKinsey):
1. **Core centricity**: Anchor in core business, add similar businesses for scale
2. **Vertical integration**: Move up/down value chain to capture adjacent profit pools
3. **Diversification**: Loosely connected businesses, leverage financial firepower
4. **Transformation**: Build new portfolio, plan to divest former core over time
5. **VC investment**: Equity investments in/beyond core for insights and optionality
