# Playing to Win — Making Strategic Choices That Create Competitive Advantage

## Why Strategy Requires Choices

Most organizations don't have a strategy. They have a plan — a collection of initiatives, goals, and resource allocations. Plans answer "what will we do?" Strategy answers a different question: "what choices will we make that allow us to win?"

Roger Martin and A.G. Lafley's *Playing to Win: How Strategy Really Works* (2013) is the most practically useful framework for strategic choice-making available. It emerged from Lafley's work leading Procter & Gamble through two transformative decades and Martin's work advising CEOs across industries. Its core argument: **strategy is an integrated set of choices, not a plan, not a vision, and not a set of aspirations**.

The framework structures strategy as five interconnected choices — the **Strategy Cascade**:

1. Winning Aspiration — What does winning look like?
2. Where to Play (WTP) — In which markets, segments, and channels will we compete?
3. How to Win (HTW) — How do we achieve superior returns in those markets?
4. Must-Have Capabilities — What capabilities must be excellent for WTP + HTW to work?
5. Management Systems — What systems and processes support and reinforce the choices?

The five choices form a cascade: each choice must be consistent with and enabled by the choices above and below it. A Winning Aspiration that calls for premium positioning but a HTW that pursues cost leadership is internally inconsistent. A set of Must-Have Capabilities that don't connect to any HTW choice are not strategic — they are operational preferences.

**Playing to Win in OrchestrA:** The Playing to Win choices become the `strategy` object in CompanyContext — `winning_aspiration`, `where_to_play`, `how_to_win`, `must_have_capabilities`. The BOS Agent uses these choices to evaluate whether OKRs connect to strategy. This makes the quality of Playing to Win choices foundational to the value of the entire OrchestrA system.

---

## Choice 1: Winning Aspiration — What Does Winning Look Like?

The Winning Aspiration defines the purpose and ambition of the organization from the perspective of the customers it serves and the competitive context it operates in. It sets the tone and the boundaries for every subsequent choice.

**What a Winning Aspiration is:**
- External and customer-facing: it defines what winning means in the market, not just inside the organization
- Specific enough to name a customer, a competitive context, and what "winning" means for that customer
- Ambitious but bounded: it creates aspiration without claiming to serve everyone or do everything

**What a Winning Aspiration is not:**
- A Mission statement (which is internal and purpose-focused: "why we exist")
- A Vision statement (which is a future state of the organization: "what we want to become")
- A generic aspiration ("be the best," "lead the market," "delight our customers") that applies equally to any company in any industry

**The Winning Aspiration test:** Does it name a customer? Does it name a competitive context (even implicitly)? Does it define what "winning" means from the customer's perspective — not from the organization's internal perspective? If you removed the company name and the industry name, could this aspiration apply to anyone? If yes, it is not a Winning Aspiration — it is a platitude.

**Examples:**

| Weak (Not a Strategy) | Strong (Winning Aspiration) |
|---|---|
| "Be the leading provider of HR software" | "Be the platform that growing companies use to manage every stage of the employee lifecycle — from hire to retire — without needing a second system" |
| "Deliver exceptional client value" | "Be the first call that PE-backed CEOs make when operational execution is the bottleneck to their growth story" |
| "Achieve sustainable growth" | "Serve the 50,000 mid-market manufacturers in North America who are systematically underserved by both enterprise ERP vendors and spreadsheet-based approaches" |

**Aspiration vs. Mission:**

| Dimension | Mission | Winning Aspiration |
|---|---|---|
| Orientation | Internal (why we exist) | External (what winning looks like for our customers) |
| Audience | Employees, culture | Strategy team, investors, competitive analysis |
| Stability | Relatively permanent | Updated as competitive context evolves |
| Test | Inspires employees | Names a customer and a competitive framing |

---

## Choice 2: Where to Play (WTP) — Which Arenas Will We Compete In?

Where to Play defines the competitive arenas — markets, customer segments, channels, geographies, and product categories — where the organization will choose to compete. It is simultaneously a decision about where to compete and where NOT to compete.

**The NOT is as important as the IS.** Strategy is fundamentally about choice and therefore about exclusion. An organization that competes everywhere has made no choices. It has preserved all options and therefore committed to none — which means it is systematically out-invested by focused competitors in every arena it occupies.

**WTP dimensions — the five arenas:**

| Dimension | WTP Question |
|---|---|
| Geography | Which countries, regions, cities, or territories will we compete in? Which will we consciously exclude? |
| Customer Segment | Which specific customer types will we serve? How are they defined (industry, size, buyer persona, need-state)? |
| Channel | Through which channels will we reach and serve customers — direct, partner, digital, retail, inside sales? |
| Product/Service Category | Which offerings will we compete with? Which adjacent categories will we decline to enter? |
| Vertical Stage | Where in the value chain will we operate — upstream (supply, component), downstream (distribution, service), or integrated? |

**Common WTP mistakes:**

| Mistake | What It Looks Like | Why It's a Problem |
|---|---|---|
| "Everywhere" | WTP lists all segments, all geographies, all channels | Not a choice; spreads resources across too many arenas to be excellent anywhere |
| Following competitors | WTP decisions driven by where competitors are competing | Reactive strategy guarantees that the organization is always one step behind |
| Past performance as WTP | "We serve [segments] because that's where our revenue comes from" | Backward-looking; WTP should be a forward choice, not a historical description |
| Theoretical attractiveness | "We should enter this segment because it's large and fast-growing" | WTP must pair with HTW; entering a market you cannot win in is a waste of resources |

**WTP and the BMC:** Where to Play choices define which Customer Segment (CS) blocks to invest in and which to deprioritize or exit. WTP without CS specificity is abstract; CS without a WTP choice lacks strategic rationale. They must be aligned.

**WTP output format:** List 2–4 specific arenas. For each: the segment/market/geography defined precisely, and the rationale for inclusion (what makes this arena attractive and winnable for us). Then list 2–3 explicit exclusions with rationale — choices the organization is making NOT to compete in a potentially attractive arena, because it cannot win there or because the opportunity cost is too high.

---

## Choice 3: How to Win (HTW) — How Do We Achieve Superior Returns Where We've Chosen to Play?

How to Win defines the competitive logic — the specific approach the organization will use to create value for customers and capture a superior share of returns in the chosen arenas. HTW is not about working harder or being better at everything. It is about being distinctly better at the things that matter most to the customer segments in the chosen arenas.

**Porter's two generic strategies — the foundational choice:**

| Strategy | Logic | Implication |
|---|---|---|
| Cost Leadership | Provide equivalent value to alternatives at a lower cost | Must have structural cost advantage (scale, process, technology) that competitors cannot easily replicate. Revenue at lower price still yields acceptable margin. |
| Differentiation | Provide superior value to alternatives, justifying a premium price | Must create value that the target segment genuinely values more than alternatives and is willing to pay for. The premium must exceed the cost of differentiation. |

**"Stuck in the middle" (Porter):** Attempting to simultaneously pursue cost leadership and differentiation without a clear primary choice produces an organization that is neither cheap enough to win on price nor distinctive enough to command a premium. The result is below-average margins in every arena.

**Martin's How to Win categories:**

| HTW Category | Description | What It Requires |
|---|---|---|
| Cost Leadership | Achieve lower delivered cost than any alternative for equivalent value | Scale advantages, operational excellence, structural cost position |
| Differentiation via Unique Capabilities | Deliver a VP that competitors cannot match because they lack the underlying capabilities | Must-Have Capabilities that are genuinely hard to build or acquire |
| Industry Access (Exclusive Position) | Win through exclusive channel relationships, customer lock-in, or regulatory position that competitors cannot access | Long-term relationship investment, switching cost architecture, regulatory engagement |
| Ecosystem Position | Win by occupying a platform or network position that becomes more valuable as more participants join | Platform design, network effect mechanics, critical mass strategy |

**HTW and the BMC:**
- HTW choices determine which Key Resources (KR) and Key Activities (KA) are critical (must be excellent) versus table stakes (need them but they don't create advantage)
- A differentiation HTW built on superior customer insight requires customer data and analytics as KR and customer research and feedback loops as KA
- A cost leadership HTW requires operational efficiency, automation, and scale as KA, and capital, technology infrastructure, and supplier relationships as KR

**The HTW cascade test:**

For each HTW choice, run two tests:
1. **Customer test**: "If we execute this HTW successfully, will customers in our chosen WTP arenas consistently choose us over available alternatives?" If no, the HTW is insufficient.
2. **Economic test**: "If customers choose us as predicted, can we deliver the VP and capture sufficient margin to fund the capabilities we need and generate an acceptable return?" If no, the HTW is commercially unviable.

Both tests must pass. A HTW that customers love but that destroys value is not a strategy — it is a charity. A HTW that is economically attractive but that customers don't actually choose is a theory.

---

## Choice 4: Must-Have Capabilities — What Must We Be World-Class At?

Must-Have Capabilities are the activities, skills, systems, and organizational competencies that must be excellent — not merely adequate — for the chosen WTP and HTW combination to work. They are the operational foundation of strategy.

**The critical distinction:**

| Capability Type | Definition | Strategic Role |
|---|---|---|
| Must-Have Capabilities | Activities where the organization must be distinctly superior to execute the HTW | Source of competitive advantage; requires sustained investment |
| Table-Stakes Capabilities | Activities where the organization must be competent to stay in the market | Necessary but not sufficient; not a source of advantage |
| Non-Core Activities | Activities that can be executed by partners, outsourced, or automated | Should not consume strategic investment |

**How to identify Must-Have Capabilities:**
Ask the question: "What would have to be true about this organization — what would we have to be genuinely excellent at — for our HTW to actually work in our chosen WTP arenas?" The answers are Must-Have Capabilities.

If HTW = "Differentiation through superior customer success outcomes in mid-market SaaS":
- Customer onboarding program design is a Must-Have Capability
- Proactive churn risk identification is a Must-Have Capability
- Executive relationship management within customer accounts is a Must-Have Capability
- Accounting software is not a Must-Have Capability (table stakes)
- Office management is not a Must-Have Capability (non-core)

**Building Must-Have Capabilities — three paths:**

| Path | Description | When to Use |
|---|---|---|
| Build | Invest over time in developing internal capability through hiring, training, process design, and technology | When the capability is central to long-term competitive advantage and cannot be replicated through a partner |
| Buy | Acquire a company, team, or individual that brings the capability | When time-to-capability is urgent and the market has talent or teams that embody the capability |
| Borrow | Partner, outsource, or license to access the capability externally | When the capability is important but not a source of long-term differentiation — better deployed by a specialist partner |

**Capability stack — connecting capability to strategy:**

Every Must-Have Capability should be traceable to a specific HTW choice. If a capability cannot be linked to an HTW choice, it is not a Must-Have — it is either table stakes or a legacy investment. Build the following mapping:

| Must-Have Capability | Connected HTW Choice | Build/Buy/Borrow | Investment Priority |
|---|---|---|---|
| [Capability 1] | [Specific HTW] | [Path] | [High/Medium] |
| [Capability 2] | [Specific HTW] | [Path] | [High/Medium] |

This mapping prevents the common error of investing in capabilities that are interesting but not connected to how the organization actually wins.

---

## Choice 5: Management Systems — What Supports and Reinforces the Choices?

Management Systems are the formal processes, structures, metrics, and governance mechanisms that an organization uses to support strategic choices and translate them into daily behavior. The fifth choice acknowledges a structural truth: **most strategies fail not because the choices are wrong, but because the organization cannot execute them**.

The strategy execution gap has three root causes:
1. **Misaligned incentives**: People are rewarded for behaviors that are inconsistent with the strategic choices
2. **Misaligned decision rights**: People who should make strategic decisions are not authorized to do so; people who make operational decisions don't understand the strategic context
3. **Misaligned measurement**: KPIs track activity and short-term performance but not the capabilities and behaviors that the strategy requires

**Management systems that reinforce strategy:**

| System | What It Does | Connection to Strategy Cascade |
|---|---|---|
| Hiring and Selection Criteria | Defines which skills, behaviors, and values the organization recruits for | Should explicitly select for Must-Have Capabilities; avoid hiring generic talent into strategic roles |
| Performance Management | Defines what behaviors and outcomes are measured and rewarded | KPIs must track HTW progress, not just financial outcomes that lag strategic effectiveness |
| Incentive Design | Aligns compensation and recognition with strategic priorities | Incentives that reward volume over margin, or short-term retention over long-term expansion, undermine HTW |
| Governance and Decision Rights | Defines who makes which decisions, at what level | Strategic decisions (WTP, HTW) must be protected from being overridden by short-term operational logic |
| Planning and Resource Allocation | Annual and quarterly processes for setting priorities and allocating budget | Must prioritize Must-Have Capability development even when short-term returns are not visible |
| Strategy Communication | How the choices are communicated to the organization | People who don't know the WTP and HTW cannot make good decisions in their day-to-day work |

**The most common management systems failures:**
- Incentivizing sales reps to close any deal (volume) when HTW requires winning in specific segments (focus)
- Measuring customer success on activity metrics (QBR completion rate, ticket resolution time) when HTW is customer outcome-based
- Budgeting process that allocates resources equally across business units when strategy calls for disproportionate investment in priority arenas
- Promoting managers who are good at execution in the current model when strategy requires transformation

---

## The Cascade Test — Ensuring Internal Consistency

The five choices must form a logically consistent chain. The cascade test verifies this by examining each pair of adjacent choices:

**Test 1: Winning Aspiration → Where to Play**
"Given our Winning Aspiration, does our WTP include the arenas where winning that aspiration is most achievable? Are there important arenas we're excluding that should be included? Are we including arenas that don't connect to the aspiration?"

**Test 2: Where to Play → How to Win**
"In each WTP arena, does our HTW give us a genuine reason to believe customers will choose us over alternatives? Is the HTW realistic given the competitive dynamics and our starting position in each arena?"

**Test 3: How to Win → Must-Have Capabilities**
"If we execute our HTW successfully, what capabilities must be excellent? Do our stated Must-Have Capabilities map precisely to what the HTW requires — and are we investing in them accordingly?"

**Test 4: Must-Have Capabilities → Management Systems**
"Do our management systems (hiring, incentives, governance, measurement) create the conditions for developing and sustaining our Must-Have Capabilities? Or do our systems inadvertently undermine the capabilities we've said are critical?"

**The overall cascade test:** Read the five choices sequentially. If each choice logically follows from the one above it, and enables the one below it, the strategy is internally consistent. If there is a break in the logic at any point, the strategy has a structural flaw that must be resolved before execution begins.

---

## Playing to Win vs. Playing Not to Lose

Martin's most important insight: most organizations don't play to win — they play not to lose. The distinction:

| Dimension | Playing to Win | Playing Not to Lose |
|---|---|---|
| Nature of choices | Specific, bounded, exclusive — commitment to some arenas, explicit exclusion of others | Broad, hedged, inclusive — preserving all options, committing to none |
| Risk orientation | Accepts the risk of being wrong in order to create the possibility of being right | Minimizes the risk of being obviously wrong; guarantees against exceptional success |
| WTP | "We will compete in [specific arenas] and not in others" | "We will explore all opportunities and allocate based on demand" |
| HTW | "We will win by being distinctly better at [specific things]" | "We will compete by being broadly good at many things" |
| Resource allocation | Concentrated in priority arenas; explicit trade-offs made | Spread to maintain optionality; few explicit trade-offs |
| Outcome | Competitive advantage in chosen arenas; vulnerability in excluded arenas | No sustainable competitive advantage; average returns across all arenas |

**Why organizations default to playing not to lose:**
- Strategy choices that commit to some arenas and exclude others create organizational losers (businesses, leaders, regions that are deprioritized)
- Vague strategies are more comfortable to agree on than specific ones
- The cost of a wrong strategic choice is visible and accountable; the cost of no strategic choice (mediocrity) is diffuse and deniable

**The discipline of specificity:** A strategy is not specific enough if it would not cause any current employee, partner, or resource allocation to change. If the strategy is compatible with everything you're already doing, it is not a strategy — it is a ratification.

---

## Playing to Win and OrchestrA

The Playing to Win choices are the strategic core of the OrchestrA system. They are stored as:

```json
{
  "strategy": {
    "winning_aspiration": "[Specific, customer-facing aspiration]",
    "where_to_play": ["[Arena 1]", "[Arena 2]"],
    "how_to_win": "[Specific competitive logic per arena]",
    "must_have_capabilities": ["[Capability 1]", "[Capability 2]", "[Capability 3]"]
  }
}
```

The BOS Agent uses these choices to evaluate whether OKRs are:
- Connected to a real WTP arena (not generic growth goals)
- Building the Must-Have Capabilities required by the HTW
- Measured in ways that track HTW progress (not just lagging financial indicators)

An OKR that cannot be traced to a WTP arena or a Must-Have Capability is either a table-stakes operational goal (important, but not strategic) or an organizational noise goal (consuming resources without strategic rationale). The Playing to Win framework provides the filter.

**The most important question the BOS Agent will ask about any OKR:** "Which element of the Playing to Win cascade does this OKR serve?" If the answer is "none," the OKR should be reclassified, deprioritized, or eliminated.
