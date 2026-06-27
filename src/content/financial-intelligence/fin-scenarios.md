# Scenario Analysis, Sensitivity Analysis & Monte Carlo Simulation

## When to Use Each

| Technique | Question it answers | Inputs | Output |
|---|---|---|---|
| Scenario Analysis | "What happens under different stories?" | 3–5 coherent sets of assumptions | One outcome per scenario |
| Sensitivity Analysis | "Which single variable matters most?" | One or two variables swept across a range | Table or tornado chart |
| Monte Carlo Simulation | "What is the probability distribution of outcomes?" | Probability distributions for key inputs | Histogram of 1,000+ outcomes |

These techniques build on top of a completed financial model (3-statement,
DCF, cash flow, or budget). They do not replace the base model — they
stress-test it.

## Scenario Analysis

### Designing Scenarios

Define 3–5 internally consistent scenarios. Each scenario is a **story**
with a coherent set of assumptions, not a random mix of optimistic and
pessimistic numbers.

**Standard set:**
- **Base Case**: Management guidance or consensus estimates.
- **Upside Case**: Favourable market conditions, accelerated growth, margin
  expansion. All assumptions should be consistent with a positive story.
- **Downside Case**: Recession, market share loss, cost inflation. All
  assumptions move in a negative direction together.
- **Stress Case** (optional): Severe but plausible tail risk (e.g., key
  customer loss, regulatory action, supply chain disruption).
- **Break-Even Case** (optional): What assumptions produce exactly zero NPV,
  zero cash balance, or a target return threshold?

### Implementation

**Excel**: Create a scenario selector (dropdown using data validation) on the
Assumptions tab. Use `INDEX/MATCH` or `CHOOSE` to pull the correct assumption
set based on the selected scenario. All downstream calculations automatically
update.

```
Scenario selector: [Base ▼]

Revenue Growth: =CHOOSE(Scenario_Index, 3%, 8%, -5%, -15%)
EBITDA Margin:  =CHOOSE(Scenario_Index, 20%, 24%, 16%, 12%)
```

**Python**: Store scenarios as a dictionary of dictionaries. Loop through
each scenario, run the model, and collect outputs into a comparison DataFrame.

```python
scenarios = {
    "Base":     {"rev_growth": 0.03, "ebitda_margin": 0.20, ...},
    "Upside":   {"rev_growth": 0.08, "ebitda_margin": 0.24, ...},
    "Downside": {"rev_growth": -0.05, "ebitda_margin": 0.16, ...},
}

results = {}
for name, assumptions in scenarios.items():
    results[name] = run_model(**assumptions)
```

### Presenting Scenario Results

Show a comparison table with key outputs side by side:
```
                    Base    Upside  Downside  Stress
Revenue ($M)        520     580     440       380
EBITDA ($M)         104     139     70        46
FCF ($M)            62      92      28        -12
Net Debt/EBITDA     2.1×    1.6×    3.1×      4.7×
Implied Equity ($)  48      62      32        18
```

## Sensitivity Analysis

### One-Way Sensitivity (Tornado Chart)

Vary one input at a time (holding all others at base case) and record the
impact on a single output metric (e.g., NPV, share price, IRR).

**Steps:**
1. Choose the output metric.
2. Identify 6–10 key input variables.
3. Define a plausible range for each (e.g., ±20% from base, or specific
   low/high values).
4. For each variable, run the model at the low and high end.
5. Sort by the spread (high minus low) to see which variable has the
   largest impact.

Display as a horizontal tornado chart — the widest bars are the most
influential drivers.

### Two-Way Sensitivity (Data Table)

Vary two inputs simultaneously and display the output in a matrix.

**Excel**: Use Data Tables (`Data → What-If Analysis → Data Table`).
Select the row input cell and column input cell. Excel auto-populates
the grid.

**Python**: Use nested loops or `numpy.meshgrid` + vectorised model runs.

The classic two-way table for a DCF:
- Rows: WACC (e.g., 7% to 12% in 0.5% steps)
- Columns: Terminal growth rate (e.g., 1% to 4% in 0.5% steps)
- Cell values: Implied share price

Conditionally format the table so that values above the current share price
are green and below are red — this instantly shows the "margin of safety."

## Monte Carlo Simulation

### When It Adds Value

Monte Carlo is most useful when:
- Multiple uncertain inputs interact in non-linear ways.
- You need a probability distribution, not just point estimates.
- Stakeholders care about the likelihood of specific thresholds (e.g.,
  "What is the probability cash goes below $10M?").

### Implementation (Python)

Monte Carlo is best done in Python. Excel can do it with add-ins (@RISK,
Crystal Ball) but native Python is more flexible and reproducible.

**Step 1 — Define Input Distributions**

For each uncertain variable, assign a probability distribution:

```python
import numpy as np

n_simulations = 10_000

# Revenue growth: normally distributed around 5%, σ = 3%
rev_growth = np.random.normal(0.05, 0.03, n_simulations)

# EBITDA margin: triangular distribution (min=12%, mode=20%, max=28%)
ebitda_margin = np.random.triangular(0.12, 0.20, 0.28, n_simulations)

# Capex: uniform between $40M and $70M
capex = np.random.uniform(40, 70, n_simulations)
```

Common distributions:
- **Normal**: symmetric uncertainty around a central estimate.
- **Triangular**: when you can specify min, most likely, and max.
- **Uniform**: equal probability across a range (maximum uncertainty).
- **Lognormal**: for variables that can't go negative (e.g., prices).
- **Discrete**: for event risks (e.g., 30% probability of losing a
  contract).

**Step 2 — Run the Model n Times**

```python
outputs = []
for i in range(n_simulations):
    result = run_model(
        rev_growth=rev_growth[i],
        ebitda_margin=ebitda_margin[i],
        capex=capex[i],
    )
    outputs.append(result)

df = pd.DataFrame(outputs)
```

For performance, vectorise the model if possible (compute all simulations
in one pass using numpy arrays instead of a Python loop).

**Step 3 — Analyse the Distribution**

```python
# Summary statistics
print(df["npv"].describe())
print(f"P(NPV < 0) = {(df['npv'] < 0).mean():.1%}")
print(f"5th percentile = {df['npv'].quantile(0.05):,.0f}")
print(f"95th percentile = {df['npv'].quantile(0.95):,.0f}")

# Histogram
df["npv"].hist(bins=50)
```

**Step 4 — Present Results**

Key outputs to show:
- Histogram of the output metric with mean, median, and percentile markers.
- Probability of exceeding (or falling below) critical thresholds.
- Tornado chart of input contribution to output variance (run a correlation
  analysis between each input and the output).
- Cumulative distribution function (CDF) for reading off any probability.

### Correlation Between Inputs

Real-world inputs are often correlated (e.g., revenue growth and margin may
move together in a boom). If correlations are important, use a Cholesky
decomposition or copula to generate correlated random samples:

```python
from scipy.stats import norm

# Define correlation matrix
corr_matrix = np.array([
    [1.0, 0.6],
    [0.6, 1.0],
])

# Cholesky decomposition
L = np.linalg.cholesky(corr_matrix)

# Generate correlated normals
uncorrelated = np.random.normal(size=(n_simulations, 2))
correlated = uncorrelated @ L.T
```

## Workbook / Script Layout

| Component | Contents |
|---|---|
| Scenario Manager Tab / module | Scenario definitions, selector dropdown |
| Sensitivity Tab / module | One-way and two-way data tables |
| Monte Carlo Script (Python) | Distributions, simulation loop, output analysis |
| Results Dashboard | Scenario comparison table, tornado chart, histogram |
