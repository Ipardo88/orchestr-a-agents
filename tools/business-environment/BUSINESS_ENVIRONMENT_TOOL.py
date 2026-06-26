"""
BUSINESS ENVIRONMENT ANALYSIS TOOL  v3.0
=========================================
Standalone analysis tool (Google Colab / local Python).
Complements the OrchestrA business-model-agent by providing deep,
live-data analysis of the macro environment before or during PESTEL work.

FRAMEWORKS IMPLEMENTED
----------------------
  Osterwalder BME 4 Forces   → Market Forces, Industry Forces, Key Trends, Macro Forces
  PESTEL                     → Political, Economic, Social, Technological, Environmental, Legal
  Odyssey 3.14               → Identifies most relevant innovation directions given environment
  BMC Block Vulnerability    → Maps forces to exposed BMC blocks

OUTPUT
------
  5 visual panels (PNG) + AI synthesis + export_for_orchestra() JSON

GOOGLE COLAB SECRETS (Tools → Secrets → Add)
---------------------------------------------
  FRED_API_KEY     | USCENSUS_API_KEY | BLS_API_KEY
  EIA_API_KEY      | GROQ_API_KEY

All free. No hardcoded economic values. Everything flows from live APIs.
"""

import requests
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.ticker as mticker
import json, os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

try:
    from IPython.display import display
    IN_NOTEBOOK = True
except ImportError:
    IN_NOTEBOOK = False


# ─────────────────────────────────────────────────────────────────────────────
# REFERENCE TABLES  (API identifiers — no hardcoded economic values)
# ─────────────────────────────────────────────────────────────────────────────

STATE_META = {
    "AL":{"fips":"01"},"AK":{"fips":"02"},"AZ":{"fips":"04"},"AR":{"fips":"05"},
    "CA":{"fips":"06"},"CO":{"fips":"08"},"CT":{"fips":"09"},"DE":{"fips":"10"},
    "FL":{"fips":"12"},"GA":{"fips":"13"},"HI":{"fips":"15"},"ID":{"fips":"16"},
    "IL":{"fips":"17"},"IN":{"fips":"18"},"IA":{"fips":"19"},"KS":{"fips":"20"},
    "KY":{"fips":"21"},"LA":{"fips":"22"},"ME":{"fips":"23"},"MD":{"fips":"24"},
    "MA":{"fips":"25"},"MI":{"fips":"26"},"MN":{"fips":"27"},"MS":{"fips":"28"},
    "MO":{"fips":"29"},"MT":{"fips":"30"},"NE":{"fips":"31"},"NV":{"fips":"32"},
    "NH":{"fips":"33"},"NJ":{"fips":"34"},"NM":{"fips":"35"},"NY":{"fips":"36"},
    "NC":{"fips":"37"},"ND":{"fips":"38"},"OH":{"fips":"39"},"OK":{"fips":"40"},
    "OR":{"fips":"41"},"PA":{"fips":"42"},"RI":{"fips":"44"},"SC":{"fips":"45"},
    "SD":{"fips":"46"},"TN":{"fips":"47"},"TX":{"fips":"48"},"UT":{"fips":"49"},
    "VT":{"fips":"50"},"VA":{"fips":"51"},"WA":{"fips":"53"},"WV":{"fips":"54"},
    "WI":{"fips":"55"},"WY":{"fips":"56"},"DC":{"fips":"11"},
}

METRO_CBSA = {
    "Chicago":"16980","New York":"35620","Los Angeles":"31080",
    "San Francisco":"41860","Dallas":"19100","Houston":"26420",
    "Miami":"33100","Atlanta":"12060","Boston":"14460","Seattle":"42660",
    "Phoenix":"38060","Denver":"19740","Minneapolis":"33460",
    "Detroit":"19820","San Diego":"41740",
}

BLS_INDUSTRY = {
    "restaurant":    {"employment":"CEU7072000001","wages":"CEU7072000003","hours":"CEU7072000002"},
    "retail":        {"employment":"CEU4200000001","wages":"CEU4200000003","hours":"CEU4200000002"},
    "healthcare":    {"employment":"CEU6500000001","wages":"CEU6500000003","hours":"CEU6500000002"},
    "technology":    {"employment":"CEU5051000001","wages":"CEU5051000003","hours":"CEU5051000002"},
    "software":      {"employment":"CEU5051100001","wages":"CEU5051100003","hours":"CEU5051100002"},
    "manufacturing": {"employment":"CEU3000000001","wages":"CEU3000000003","hours":"CEU3000000002"},
    "construction":  {"employment":"CEU2000000001","wages":"CEU2000000003","hours":"CEU2000000002"},
    "finance":       {"employment":"CEU5500000001","wages":"CEU5500000003","hours":"CEU5500000002"},
    "consulting":    {"employment":"CEU6054000001","wages":"CEU6054000003","hours":"CEU6054000002"},
    "logistics":     {"employment":"CEU4348400001","wages":"CEU4348400003","hours":"CEU4348400002"},
    "real_estate":   {"employment":"CEU5553000001","wages":"CEU5553000003","hours":"CEU5553000002"},
}

# Osterwalder BME 4 Forces framework — maps to PESTEL dimensions
BME_PESTEL_MAP = {
    "Macroeconomic Forces":  ["Economic", "Political"],
    "Industry Forces":       ["Economic", "Legal", "Environmental"],
    "Key Trends":            ["Technological", "Social", "Environmental"],
    "Market Forces":         ["Economic", "Social", "Legal"],
}

# Odyssey 3.14 — which innovation directions each BME force makes more urgent
ODYSSEY_TRIGGERS = {
    "High inflation / rising costs":      [1, 7, 9],   # Reduce cost, modify revenue, optimize chain
    "Tightening credit / high rates":     [7, 10, 12], # Revenue model, remove steps, partner
    "Slowing consumer demand":            [3, 4, 5],   # Non-clients, emotion/function, new segments
    "Tight labor market / wage pressure": [8, 9, 11],  # Technology, modify chain, leverage resources
    "Strong digital/AI adoption":         [8, 9, 13],  # Technology, modify chain, supplementors
    "Regulatory shift in industry":       [6, 12, 14], # Third party, competitors, new resources
    "Demographic shift in customer base": [3, 4, 5],   # Non-clients, emotion, other segments
    "Supply chain disruption":            [10, 12, 14],# Remove steps, partner, new resources
}

# BMC blocks most exposed by each macro force type
BMC_VULNERABILITY_MAP = {
    "Economic downturn":         ["Revenue Streams", "Customer Segments", "Cost Structure"],
    "Interest rate rises":       ["Cost Structure", "Revenue Streams", "Key Partnerships"],
    "AI/tech disruption":        ["Key Activities", "Key Resources", "Value Propositions"],
    "Labor shortage":            ["Key Resources", "Key Activities", "Cost Structure"],
    "Regulatory change":         ["Revenue Streams", "Key Partnerships", "Channels"],
    "Consumer confidence drop":  ["Customer Segments", "Value Propositions", "Channels"],
    "Supply chain disruption":   ["Key Partnerships", "Key Activities", "Cost Structure"],
    "Energy cost spike":         ["Cost Structure", "Value Propositions", "Key Activities"],
}

ACS_VARS = {
    "population":"B01003_001E","median_income":"B19013_001E",
    "median_home_value":"B25077_001E","median_age":"B01002_001E",
    "median_rent":"B25064_001E","total_households":"B11001_001E",
    "bach_or_higher":"B15003_022E","labor_force":"B23025_002E",
    "employed":"B23025_004E","owner_occupied":"B25003_002E",
    "renter_occupied":"B25003_003E","income_under_25k":"B19001_002E",
    "income_25_50k":"B19001_006E","income_50_75k":"B19001_010E",
    "income_75_100k":"B19001_012E","income_100_150k":"B19001_013E",
    "income_over_150k":"B19001_017E",
}

PALETTE = {
    "primary":"#1A6FBF","secondary":"#F4A836","positive":"#2ECC71",
    "negative":"#E74C3C","neutral":"#95A5A6","background":"#F8F9FA","text":"#2C3E50",
}


# ─────────────────────────────────────────────────────────────────────────────
# SECRET LOADER
# ─────────────────────────────────────────────────────────────────────────────

def _load_secrets() -> Dict[str, Optional[str]]:
    keys: Dict[str, Optional[str]] = {}
    in_colab = False
    try:
        from google.colab import userdata
        in_colab = True
    except ImportError:
        pass
    for secret, env in [
        ("FRED_API_KEY","FRED_API_KEY"),("USCENSUS_API_KEY","USCENSUS_API_KEY"),
        ("BLS_API_KEY","BLS_API_KEY"),("EIA_API_KEY","EIA_API_KEY"),
        ("GROQ_API_KEY","GROQ_API_KEY"),
    ]:
        val = None
        if in_colab:
            try:
                from google.colab import userdata
                val = userdata.get(secret)
            except Exception:
                pass
        keys[secret] = val or os.getenv(env)
    labels = {
        "FRED_API_KEY":"FRED  (Macro / National / Global)",
        "USCENSUS_API_KEY":"Census (Demographics)",
        "BLS_API_KEY":"BLS   (Labor & Industry)",
        "EIA_API_KEY":"EIA   (Energy)",
        "GROQ_API_KEY":"Groq  (AI Synthesis)",
    }
    print("─"*55)
    print("  API KEY STATUS")
    print("─"*55)
    for k, lbl in labels.items():
        print(f"  {lbl:<36} {'✓  Ready' if keys.get(k) else '✗  Missing'}")
    if not any(keys.values()):
        print("\n  Add keys: Tools → Secrets  (Google Colab)")
        print("  All free: fred.stlouisfed.org | api.census.gov")
        print("            data.bls.gov | eia.gov/opendata | console.groq.com")
    print("─"*55)
    return keys


# ─────────────────────────────────────────────────────────────────────────────
# LOW-LEVEL API HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _fred(series_id: str, keys: Dict, years: int = 5) -> pd.Series:
    """Fetch FRED time series. Returns empty Series on any failure."""
    if not keys.get("FRED_API_KEY"):
        return pd.Series(dtype=float, name=series_id)
    start = (datetime.now() - timedelta(days=years*365)).strftime("%Y-%m-%d")
    try:
        r = requests.get(
            "https://api.stlouisfed.org/fred/series/observations",
            params=dict(series_id=series_id, api_key=keys["FRED_API_KEY"],
                        file_type="json", observation_start=start),
            timeout=15)
        r.raise_for_status()
        obs  = r.json().get("observations", [])
        data = {o["date"]: float(o["value"]) for o in obs if o["value"] not in (".", "")}
        s    = pd.Series(data, dtype=float, name=series_id)
        s.index = pd.to_datetime(s.index)
        return s
    except Exception as e:
        print(f"    FRED {series_id}: {e}")
        return pd.Series(dtype=float, name=series_id)


def _fred_kpi(series_id: str, keys: Dict) -> Tuple[Optional[float], str, Optional[float]]:
    s = _fred(series_id, keys)
    if s.empty:
        return None, "N/A", None
    v   = s.iloc[-1]
    dt  = s.index[-1].strftime("%b %Y")
    ya  = s[s.index <= s.index[-1] - pd.DateOffset(years=1)]
    yoy = ((v - ya.iloc[-1]) / abs(ya.iloc[-1])) * 100 if not ya.empty else None
    return v, dt, yoy


def _bls(series_ids: List[str], keys: Dict, years: int = 5) -> Dict[str, pd.Series]:
    if not keys.get("BLS_API_KEY") or not series_ids:
        return {}
    cy = datetime.now().year
    try:
        r = requests.post(
            "https://api.bls.gov/publicAPI/v2/timeseries/data/",
            json=dict(seriesid=series_ids, startyear=str(cy-years),
                      endyear=str(cy), registrationkey=keys["BLS_API_KEY"]),
            headers={"Content-type":"application/json"}, timeout=20)
        r.raise_for_status()
        res = r.json()
        out = {}
        if res.get("status") == "REQUEST_SUCCEEDED":
            for series in res["Results"]["series"]:
                recs = {}
                for d in series["data"]:
                    if d.get("period","").startswith("M") and d["period"] != "M13":
                        recs[pd.Timestamp(year=int(d["year"]),month=int(d["period"][1:]),day=1)] = float(d["value"])
                out[series["seriesID"]] = pd.Series(recs, dtype=float, name=series["seriesID"]).sort_index()
        return out
    except Exception as e:
        print(f"    BLS: {e}")
        return {}


def _census(state_fips: str, variables: Dict[str, str], keys: Dict) -> Dict[str, Optional[int]]:
    if not keys.get("USCENSUS_API_KEY") or not state_fips:
        return {}
    codes = list(variables.values())
    try:
        r = requests.get(
            "https://api.census.gov/data/2022/acs/acs5",
            params={"get":"NAME,"+",".join(codes), "for":f"state:{state_fips}",
                    "key":keys["USCENSUS_API_KEY"]}, timeout=15)
        r.raise_for_status()
        data = r.json(); header = data[0][1:]; row = data[1][1:]
        out  = {}
        for name, code in variables.items():
            idx = header.index(code)
            try:
                out[name] = int(row[idx]) if row[idx] not in (None,"-666666666") else None
            except Exception:
                out[name] = None
        return out
    except Exception as e:
        print(f"    Census: {e}")
        return {}


def _eia_gas(keys: Dict) -> Tuple[Optional[float], Optional[float]]:
    if not keys.get("EIA_API_KEY"):
        return None, None
    try:
        r = requests.get(
            "https://api.eia.gov/v2/petroleum/pri/gnd/data/",
            params={"api_key":keys["EIA_API_KEY"],"frequency":"monthly","data[0]":"value",
                    "facets[product][]":"EPM0","sort[0][column]":"period",
                    "sort[0][direction]":"desc","length":"24"}, timeout=15)
        r.raise_for_status()
        data = r.json().get("response",{}).get("data",[])
        if len(data) >= 13:
            l = float(data[0]["value"]); ya = float(data[12]["value"])
            return l, ((l-ya)/ya)*100
        elif data:
            return float(data[0]["value"]), None
    except Exception as e:
        print(f"    EIA: {e}")
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# CHART PRIMITIVES
# ─────────────────────────────────────────────────────────────────────────────

def _style(ax, title):
    ax.set_title(title, fontsize=9, fontweight="bold", color=PALETTE["text"], pad=7)
    ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
    ax.tick_params(labelsize=7, colors=PALETTE["text"])
    ax.set_facecolor(PALETTE["background"])

def _kpi(ax, label, value, fmt, change=None, unit=""):
    ax.set_xlim(0,1); ax.set_ylim(0,1); ax.axis("off"); ax.set_facecolor("white")
    for sp in ax.spines.values(): sp.set_visible(False)
    if value is None:
        ax.text(0.5,0.55,"N/A",ha="center",va="center",fontsize=14,color=PALETTE["neutral"])
    else:
        ax.text(0.5,0.62,f"{fmt.format(value)}{unit}",ha="center",va="center",
                fontsize=16,fontweight="bold",color=PALETTE["primary"])
        if change is not None:
            col = PALETTE["positive"] if change>=0 else PALETTE["negative"]
            ax.text(0.5,0.38,f"{'▲' if change>=0 else '▼'} {abs(change):.1f}% YoY",
                    ha="center",va="center",fontsize=8.5,color=col)
    ax.text(0.5,0.14,label,ha="center",va="center",fontsize=7.5,color=PALETTE["text"])

def _line(ax, s, title, ylabel, color=None, fill=False):
    color = color or PALETTE["primary"]
    if isinstance(s, pd.Series) and not s.empty:
        ax.plot(s.index, s.values, color=color, linewidth=1.8)
        if fill:
            ax.fill_between(s.index, s.values, alpha=0.12, color=color)
    else:
        ax.text(0.5,0.5,"API key required",ha="center",va="center",
                transform=ax.transAxes,fontsize=8,color=PALETTE["neutral"])
    ax.set_ylabel(ylabel, fontsize=7, color=PALETTE["text"])
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x,_: f"{x:,.1f}"))
    _style(ax, title)

def _multiline(ax, series_dict, title, ylabel):
    colors = [PALETTE["primary"],PALETTE["secondary"],"#8E44AD",PALETTE["positive"]]
    has = False
    for (lbl,s),col in zip(series_dict.items(), colors):
        if isinstance(s, pd.Series) and not s.empty:
            ax.plot(s.index, s.values, label=lbl, color=col, linewidth=1.8); has=True
    if not has:
        ax.text(0.5,0.5,"API key required",ha="center",va="center",
                transform=ax.transAxes,fontsize=8,color=PALETTE["neutral"])
    else:
        ax.legend(fontsize=6.5, frameon=False)
    ax.set_ylabel(ylabel, fontsize=7, color=PALETTE["text"])
    _style(ax, title)

def _hbar(ax, labels, values, title, xlabel, colors=None):
    colors = colors or [PALETTE["primary"]]*len(labels)
    pairs  = [(l,v,c) for l,v,c in zip(labels,values,colors) if v is not None]
    if pairs:
        ls,vs,cs = zip(*pairs)
        ax.barh(ls, vs, color=cs, edgecolor="none", height=0.55)
        ax.set_xlabel(xlabel, fontsize=7, color=PALETTE["text"])
        for i,v in enumerate(vs):
            ax.text(v*0.97,i,f"{v:,.1f}",va="center",ha="right",
                    fontsize=7,color="white",fontweight="bold")
    else:
        ax.text(0.5,0.5,"No data",ha="center",va="center",
                transform=ax.transAxes,fontsize=8,color=PALETTE["neutral"])
    _style(ax, title)

def _table(ax, rows, col_labels, title):
    ax.axis("off")
    if not rows:
        ax.text(0.5,0.5,"No data",ha="center",va="center",
                transform=ax.transAxes,fontsize=8,color=PALETTE["neutral"])
        ax.set_title(title,fontsize=9,fontweight="bold",color=PALETTE["text"])
        return
    tbl = ax.table(cellText=rows, colLabels=col_labels, cellLoc="center", loc="center")
    tbl.auto_set_font_size(False); tbl.set_fontsize(8); tbl.scale(1,1.65)
    for (r,c),cell in tbl.get_celld().items():
        cell.set_edgecolor("#CCCCCC")
        if r==0:
            cell.set_facecolor(PALETTE["primary"]); cell.set_text_props(color="white",fontweight="bold")
        else:
            cell.set_facecolor("white" if r%2 else "#EEF4FB")
    ax.set_title(title,fontsize=9,fontweight="bold",color=PALETTE["text"])

def _save_panel(fig, filename, save):
    if save:
        fig.savefig(filename, dpi=130, bbox_inches="tight", facecolor=PALETTE["background"])
    if IN_NOTEBOOK:
        plt.show()
    plt.close(fig)
    return filename if save else None


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CLASS
# ─────────────────────────────────────────────────────────────────────────────

class BusinessEnvironmentTool:
    """
    Business Environment Analysis Tool v3.0

    Implements Osterwalder's Business Model Environment (BME) 4 Forces framework,
    mapped to PESTEL dimensions. AI synthesis identifies which Odyssey 3.14
    innovation directions are most urgent given the environment, and which BMC
    blocks are most exposed.

    Use export_for_orchestra() to generate structured JSON compatible with
    the OrchestrA business-model-agent PESTEL phase.
    """

    def __init__(self):
        print("\n" + "="*55)
        print("  BUSINESS ENVIRONMENT ANALYSIS TOOL  v3.0")
        print("="*55)
        self.keys = _load_secrets()
        self._last_analysis: Optional[Dict] = None
        self._ai_text: str = ""

    def analyze(self,
                business_name: str,
                industry: str,
                location: str,
                target_customers: str,
                years_history: int = 5,
                save_panels: bool = True) -> Dict:
        """
        Run the complete BME analysis.

        industry: restaurant | retail | healthcare | technology | software |
                  manufacturing | construction | finance | consulting | logistics | real_estate
        """
        valid_industries = list(BLS_INDUSTRY.keys())
        if industry.lower() not in valid_industries:
            print(f"  ⚠  Unknown industry '{industry}'. Using 'technology'. Valid: {valid_industries}")
            industry = "technology"

        city, state = [p.strip() for p in (location+",").split(",")][:2]
        metro_cbsa  = METRO_CBSA.get(city)
        state_fips  = STATE_META.get(state.upper(), {}).get("fips")
        ind_codes   = BLS_INDUSTRY.get(industry.lower(), {})

        ctx = dict(business_name=business_name, industry=industry,
                   location=location, city=city, state=state,
                   target_customers=target_customers, years=years_history)

        print(f"\n{'='*55}")
        print(f"  {business_name.upper()}")
        print(f"  {industry.title()}  |  {location}")
        print(f"{'='*55}\n")

        print("STEP 1/3  Collecting data from APIs ...")
        data = self._collect_all(city, state, state_fips, metro_cbsa, ind_codes, years_history)

        print("\nSTEP 2/3  Rendering panels ...")
        panels = {}
        for key, fn, label in [
            ("panel_macro",       self._panel_macro,       "Panel 1 — Macroeconomic Forces (BME)"),
            ("panel_labor",       self._panel_labor,       "Panel 2 — Labor Market & Industry"),
            ("panel_real_estate", self._panel_real_estate, "Panel 3 — Real Estate & Demographics"),
            ("panel_energy",      self._panel_energy,      "Panel 4 — Energy & Input Costs"),
        ]:
            panels[key] = fn(data, ctx, save_panels)
            print(f"  ✓  {label}")

        print("\nSTEP 3/3  AI synthesis (BME + PESTEL + Odyssey 3.14 + BMC) ...")
        ai_text = self._ai_analysis(data, ctx)
        data["ai_analysis"] = ai_text
        self._ai_text = ai_text

        print("\n" + "="*55)
        print("  STRATEGIC ENVIRONMENT ANALYSIS")
        print("="*55)
        print(ai_text)

        if save_panels:
            saved = [v for v in panels.values() if v]
            if saved:
                print(f"\n  Panels saved: {', '.join(saved)}")

        self._last_analysis = {"data": data, "ctx": ctx}
        return data

    def export_for_orchestra(self, filepath: str = "orchestra_pestel.json") -> Dict:
        """
        Export structured PESTEL analysis compatible with the OrchestrA platform.
        Run analyze() first.
        """
        if not self._last_analysis:
            print("Run analyze() first.")
            return {}

        ctx = self._last_analysis["ctx"]
        data = self._last_analysis["data"]

        def snap(s):
            if not isinstance(s, pd.Series) or s.empty:
                return None
            v = s.iloc[-1]; dt = s.index[-1].strftime("%Y-%m")
            ya = s[s.index <= s.index[-1] - pd.DateOffset(years=1)]
            yoy = round(((v - ya.iloc[-1]) / abs(ya.iloc[-1])) * 100, 2) if not ya.empty else None
            return {"value": round(v, 3), "date": dt, "yoy_pct": yoy}

        macro = data.get("macro", {})
        labor = data.get("labor", {})
        energy = data.get("energy", {})

        export = {
            "generated_at": datetime.now().isoformat(),
            "business": ctx["business_name"],
            "industry": ctx["industry"],
            "location": ctx["location"],
            "pestel": {
                "political": {
                    "framework": "BME Macroeconomic Forces",
                    "notes": "Derived from fiscal/monetary policy environment",
                    "indicators": {
                        "fed_funds_rate": snap(macro.get("fed_funds")),
                        "treasury_10y":   snap(macro.get("treasury_10y")),
                    }
                },
                "economic": {
                    "framework": "BME Macroeconomic Forces",
                    "indicators": {
                        "gdp_growth":       snap(macro.get("gdp_growth")),
                        "unemployment":     snap(labor.get("unemp_national")),
                        "cpi_inflation":    snap(macro.get("cpi")),
                        "consumer_sentiment": snap(macro.get("sentiment")),
                        "retail_sales":     snap(macro.get("retail_sales")),
                        "industry_wages":   snap(labor.get("ind_wages")),
                    }
                },
                "social": {
                    "framework": "BME Market Forces",
                    "indicators": {
                        "labor_force_participation": snap(labor.get("lfpr")),
                        "job_openings":             snap(labor.get("job_openings")),
                        "quits_rate":               snap(labor.get("quits")),
                    },
                    "demographics": data.get("demographics", {})
                },
                "technological": {
                    "framework": "BME Key Trends",
                    "indicators": {
                        "industry_employment_trend": snap(labor.get("ind_employment")),
                        "industry_hours_trend":      snap(labor.get("ind_hours")),
                    },
                    "notes": "Automation and productivity tracked via hours vs employment ratio"
                },
                "environmental": {
                    "framework": "BME Key Trends",
                    "indicators": {
                        "oil_wti":    snap(energy.get("oil_wti")),
                        "natgas":     snap(energy.get("natgas")),
                        "ppi_energy": snap(energy.get("ppi_energy")),
                    }
                },
                "legal": {
                    "framework": "BME Industry Forces",
                    "indicators": {
                        "building_permits": snap(data.get("real_estate", {}).get("building_permits")),
                    },
                    "notes": "Regulatory environment reflected in permit/licensing trends"
                },
            },
            "ai_synthesis": self._ai_text,
        }

        with open(filepath, "w") as f:
            json.dump(export, f, indent=2, default=str)
        print(f"\n  ✓  Exported to {filepath} — import into OrchestrA PESTEL section")
        return export

    # ── Data collection ──────────────────────────────────────────────────────

    def _collect_all(self, city, state, state_fips, metro_cbsa, ind_codes, years):
        k = self.keys
        print("  → Macroeconomic (FRED) ...")
        macro = {
            "gdp":              _fred("GDP",             k, years),
            "gdp_growth":       _fred("A191RL1Q225SBEA", k, years),
            "cpi":              _fred("CPIAUCSL",        k, years),
            "pce":              _fred("PCEPI",           k, years),
            "fed_funds":        _fred("DFF",             k, years),
            "treasury_10y":     _fred("DGS10",           k, years),
            "treasury_2y":      _fred("DGS2",            k, years),
            "sentiment":        _fred("UMCSENT",         k, years),
            "retail_sales":     _fred("RSXFS",           k, years),
            "saving_rate":      _fred("PSAVERT",         k, years),
            "ind_production":   _fred("INDPRO",          k, years),
            "initial_claims":   _fred("ICSA",            k, years),   # Leading: jobless claims
            "new_orders":       _fred("NEWORDER",        k, years),   # Leading: mfg orders
            "ism_pmi":          _fred("NAPM",            k, years),   # Leading: ISM PMI
        }
        print(f"  → Labor (FRED + BLS) ...")
        bls_raw = _bls(list(ind_codes.values()), k, years) if ind_codes else {}
        labor = {
            "unemp_national": _fred("UNRATE",        k, years),
            "unemp_state":    _fred(f"{state}UR",    k, years),
            "unemp_metro":    _fred(f"{metro_cbsa}UR",k,years) if metro_cbsa else pd.Series(dtype=float),
            "lfpr":           _fred("CIVPART",        k, years),
            "avg_wages":      _fred("CES0500000003",  k, years),
            "job_openings":   _fred("JTSJOL",         k, years),
            "quits":          _fred("JTSQUR",         k, years),
            "ind_employment": bls_raw.get(ind_codes.get("employment"), pd.Series(dtype=float)),
            "ind_wages":      bls_raw.get(ind_codes.get("wages"),      pd.Series(dtype=float)),
            "ind_hours":      bls_raw.get(ind_codes.get("hours"),      pd.Series(dtype=float)),
        }
        print(f"  → Real estate (FRED) + Demographics (Census) ...")
        real_estate = {
            "housing_starts":  _fred("HOUST",           k, years),
            "building_permits":_fred("PERMIT",          k, years),
            "home_price_idx":  _fred("CSUSHPISA",       k, years),
            "mortgage_30y":    _fred("MORTGAGE30US",    k, years),
            "vacancy_rate":    _fred("RRVRUSQ156N",     k, years),
            "state_permits":   _fred(f"{state}BPPRIVSA",k, years),
        }
        demographics = _census(state_fips, ACS_VARS, k) if state_fips else {}
        print(f"  → Energy (FRED + EIA) ...")
        gas_price, gas_yoy = _eia_gas(k)
        energy = {
            "oil_wti":          _fred("DCOILWTICO",  k, years),
            "natgas":           _fred("DHHNGSP",      k, years),
            "ppi_energy":       _fred("WPU0531",      k, years),
            "gas_price_latest": gas_price,
            "gas_yoy":          gas_yoy,
        }
        return dict(macro=macro, labor=labor, real_estate=real_estate,
                    demographics=demographics, energy=energy)

    def _latest(self, series) -> Tuple[Optional[float], str, Optional[float]]:
        if not isinstance(series, pd.Series) or series.empty:
            return None, "N/A", None
        v = series.iloc[-1]; dt = series.index[-1].strftime("%b %Y")
        ya = series[series.index <= series.index[-1] - pd.DateOffset(years=1)]
        yoy = ((v - ya.iloc[-1]) / abs(ya.iloc[-1])) * 100 if not ya.empty else None
        return v, dt, yoy

    # ── Panel 1: Macroeconomic Forces (BME) ─────────────────────────────────

    def _panel_macro(self, data, ctx, save):
        mac = data["macro"]; lab = data["labor"]; state = ctx["state"]
        gdp_v,_,gdp_yoy  = _fred_kpi("GDP",          self.keys)
        ur_v, _,ur_yoy   = _fred_kpi("UNRATE",        self.keys)
        _,    _,cpi_yoy  = _fred_kpi("CPIAUCSL",      self.keys)
        ff_v, _,ff_yoy   = _fred_kpi("DFF",           self.keys)
        ret_v,_,ret_yoy  = _fred_kpi("RSXFS",         self.keys)
        snt_v,_,snt_yoy  = _fred_kpi("UMCSENT",       self.keys)

        fig = plt.figure(figsize=(16,12), facecolor=PALETTE["background"])
        fig.suptitle(f"BME: MACROECONOMIC FORCES  |  USA → {state} → {ctx['city']}",
                     fontsize=13, fontweight="bold", color=PALETTE["text"], y=0.98)
        outer = gridspec.GridSpec(3,1,figure=fig,hspace=0.45,height_ratios=[0.9,0.9,4])
        r1 = gridspec.GridSpecFromSubplotSpec(1,3,subplot_spec=outer[0],wspace=0.22)
        r2 = gridspec.GridSpecFromSubplotSpec(1,3,subplot_spec=outer[1],wspace=0.22)
        cg = gridspec.GridSpecFromSubplotSpec(2,2,subplot_spec=outer[2],hspace=0.45,wspace=0.3)
        for col,(lbl,val,chg,fmt,unit) in enumerate([
            ("Real GDP ($B)",   gdp_v, gdp_yoy, "{:,.0f}", ""),
            ("US Unemployment", ur_v,  ur_yoy,  "{:.1f}",  "%"),
            ("CPI YoY %",       cpi_yoy, None,  "{:.1f}",  "%" if cpi_yoy else ""),
        ]): _kpi(fig.add_subplot(r1[col]),lbl,val,fmt,chg,unit)
        for col,(lbl,val,chg,fmt,unit) in enumerate([
            ("Fed Funds Rate",      ff_v,  ff_yoy,  "{:.2f}", "%"),
            ("Retail Sales ($M)",   ret_v, ret_yoy, "{:,.0f}",""),
            ("Consumer Sentiment",  snt_v, snt_yoy, "{:.1f}", ""),
        ]): _kpi(fig.add_subplot(r2[col]),lbl,val,fmt,chg,unit)
        _line(fig.add_subplot(cg[0,0]), mac["gdp_growth"],
              "Real GDP Growth Rate (%)","% chg",fill=True)
        _multiline(fig.add_subplot(cg[0,1]),
                   {"US":lab["unemp_national"],f"{state}":lab["unemp_state"],
                    ctx["city"]:lab["unemp_metro"]},
                   f"Unemployment: US / {state} / {ctx['city']} (%)","%")
        _multiline(fig.add_subplot(cg[1,0]),
                   {"CPI":mac["cpi"],"PCE":mac["pce"]},
                   "Inflation Indices (CPI & PCE)","Index")
        _multiline(fig.add_subplot(cg[1,1]),
                   {"10Y Treasury":mac["treasury_10y"],
                    "2Y Treasury": mac["treasury_2y"],
                    "Fed Funds":   mac["fed_funds"]},
                   "Interest Rates (%)","%" )
        return _save_panel(fig,"panel_1_macro.png",save)

    # ── Panel 2: Labor Market ────────────────────────────────────────────────

    def _panel_labor(self, data, ctx, save):
        lab = data["labor"]; state = ctx["state"]; ind = ctx["industry"]
        ur_v,_,ur_yoy  = _fred_kpi("UNRATE",        self.keys)
        lf_v,_,_       = _fred_kpi("CIVPART",        self.keys)
        wg_v,_,wg_yoy  = _fred_kpi("CES0500000003",  self.keys)
        jo_v,_,jo_yoy  = _fred_kpi("JTSJOL",         self.keys)

        fig = plt.figure(figsize=(16,11), facecolor=PALETTE["background"])
        fig.suptitle(f"BME: INDUSTRY FORCES — Labor  |  {ctx['city']}, {state}  |  {ind.title()}",
                     fontsize=13, fontweight="bold", color=PALETTE["text"], y=0.98)
        outer = gridspec.GridSpec(3,1,figure=fig,hspace=0.45,height_ratios=[0.9,4,3])
        r1 = gridspec.GridSpecFromSubplotSpec(1,4,subplot_spec=outer[0],wspace=0.18)
        cg = gridspec.GridSpecFromSubplotSpec(2,2,subplot_spec=outer[1],hspace=0.45,wspace=0.3)
        bg = gridspec.GridSpecFromSubplotSpec(1,2,subplot_spec=outer[2],wspace=0.35)
        for col,(lbl,val,chg,fmt,unit) in enumerate([
            ("US Unemployment",     ur_v,jo_v and ur_yoy,"{:.1f}","%"),
            ("Labor Force Part.",   lf_v, None,          "{:.1f}","%"),
            ("All-Sector Avg Wage", wg_v, wg_yoy,        "{:.2f}","$"),
            ("Job Openings (000s)", jo_v, jo_yoy,        "{:,.0f}",""),
        ]): _kpi(fig.add_subplot(r1[col]),lbl,val,fmt,chg,unit)
        _multiline(fig.add_subplot(cg[0,0]),
                   {"US":lab["unemp_national"],f"{state}":lab["unemp_state"],
                    ctx["city"]:lab["unemp_metro"]},
                   "Unemployment by Geography (%)","%")
        _line(fig.add_subplot(cg[0,1]),lab["ind_employment"],
              f"{ind.title()} Employment (000s)","000s",color=PALETTE["secondary"],fill=True)
        _line(fig.add_subplot(cg[1,0]),lab["ind_wages"],
              f"{ind.title()} Avg Hourly Earnings ($)","$/hr",color=PALETTE["positive"])
        _line(fig.add_subplot(cg[1,1]),lab["ind_hours"],
              f"{ind.title()} Avg Weekly Hours","hours",color="#8E44AD")

        def _snap(s, lbl):
            if not isinstance(s,pd.Series) or s.empty: return None
            v=s.iloc[-1]; dt=s.index[-1].strftime("%b %Y")
            ya=s[s.index<=s.index[-1]-pd.DateOffset(years=1)]
            c=f"{((v-ya.iloc[-1])/abs(ya.iloc[-1]))*100:+.1f}%" if not ya.empty else "N/A"
            return [lbl, f"{v:,.2f}", dt, c]
        rows = [r for r in [
            _snap(lab["unemp_national"],   f"US Unemployment (%)"),
            _snap(lab["unemp_state"],      f"{state} Unemployment (%)"),
            _snap(lab["unemp_metro"],      f"{ctx['city']} Unemployment (%)"),
            _snap(lab["ind_employment"],   f"{ind.title()} Employment (000s)"),
            _snap(lab["ind_wages"],        f"{ind.title()} Avg Wage ($/hr)"),
            _snap(lab["ind_hours"],        f"{ind.title()} Avg Weekly Hours"),
            _snap(lab["job_openings"],     "Job Openings (000s)"),
            _snap(lab["quits"],            "Quits Rate (%)"),
        ] if r]
        _table(fig.add_subplot(bg[0]),rows,["Indicator","Latest","Date","YoY Δ"],"Labor Snapshot")

        dem = data["demographics"]; ax_inc = fig.add_subplot(bg[1])
        if dem:
            brackets = [("< $25k",dem.get("income_under_25k")),("$25-50k",dem.get("income_25_50k")),
                        ("$50-75k",dem.get("income_50_75k")),("$75-100k",dem.get("income_75_100k")),
                        ("$100-150k",dem.get("income_100_150k")),("> $150k",dem.get("income_over_150k"))]
            tot  = sum(v for _,v in brackets if v) or 1
            pcts = [v/tot*100 if v else None for _,v in brackets]
            cols = [PALETTE["negative"],PALETTE["neutral"],PALETTE["secondary"],
                    PALETTE["secondary"],PALETTE["primary"],PALETTE["positive"]]
            _hbar(ax_inc,[l for l,_ in brackets],pcts,
                  f"{state} Income Distribution (%)","% of households",cols)
        else:
            ax_inc.axis("off")
            ax_inc.text(0.5,0.5,"Census API key needed",ha="center",va="center",
                        fontsize=9,color=PALETTE["neutral"])
        return _save_panel(fig,"panel_2_labor.png",save)

    # ── Panel 3: Real Estate ─────────────────────────────────────────────────

    def _panel_real_estate(self, data, ctx, save):
        re=data["real_estate"]; dem=data["demographics"]; state=ctx["state"]
        hs_v,_,hs_yoy = _fred_kpi("HOUST",       self.keys)
        bp_v,_,bp_yoy = _fred_kpi("PERMIT",       self.keys)
        hp_v,_,hp_yoy = _fred_kpi("CSUSHPISA",    self.keys)
        mr_v,_,mr_yoy = _fred_kpi("MORTGAGE30US", self.keys)

        fig = plt.figure(figsize=(16,11), facecolor=PALETTE["background"])
        fig.suptitle(f"BME: MARKET FORCES — Real Estate  |  {ctx['city']}, {state}",
                     fontsize=13, fontweight="bold", color=PALETTE["text"], y=0.98)
        outer = gridspec.GridSpec(3,1,figure=fig,hspace=0.45,height_ratios=[0.9,4,3])
        r1 = gridspec.GridSpecFromSubplotSpec(1,4,subplot_spec=outer[0],wspace=0.18)
        cg = gridspec.GridSpecFromSubplotSpec(2,2,subplot_spec=outer[1],hspace=0.45,wspace=0.3)
        bg = gridspec.GridSpecFromSubplotSpec(1,2,subplot_spec=outer[2],wspace=0.35)
        for col,(lbl,val,chg,fmt,unit) in enumerate([
            ("Housing Starts (000s)",   hs_v,hs_yoy,"{:,.0f}",""),
            ("Building Permits (000s)", bp_v,bp_yoy,"{:,.0f}",""),
            ("Case-Shiller HPI",        hp_v,hp_yoy,"{:.1f}", ""),
            ("30-Yr Mortgage Rate",     mr_v,mr_yoy,"{:.2f}", "%"),
        ]): _kpi(fig.add_subplot(r1[col]),lbl,val,fmt,chg,unit)
        _line(fig.add_subplot(cg[0,0]),re["housing_starts"],
              "National Housing Starts (000s)","000s",fill=True)
        _line(fig.add_subplot(cg[0,1]),re["home_price_idx"],
              "Case-Shiller Home Price Index","Index",color=PALETTE["secondary"])
        _line(fig.add_subplot(cg[1,0]),re["mortgage_30y"],
              "30-Year Mortgage Rate (%)","%" ,color=PALETTE["negative"])
        _multiline(fig.add_subplot(cg[1,1]),
                   {"US Permits":re["building_permits"],f"{state}":re["state_permits"]},
                   f"Building Permits: US vs {state}","000s")
        if dem:
            pop=dem.get("population"); inc=dem.get("median_income"); age=dem.get("median_age")
            hv=dem.get("median_home_value"); rent=dem.get("median_rent")
            own=dem.get("owner_occupied"); ren=dem.get("renter_occupied")
            tot_hh=(own or 0)+(ren or 0)
            emp=dem.get("employed"); lf=dem.get("labor_force")
            rows=[
                ["Population",              f"{pop:,}" if pop else "N/A"],
                ["Median Household Income",  f"${inc:,}" if inc else "N/A"],
                ["Median Age",              f"{age}" if age else "N/A"],
                ["Median Home Value",        f"${hv:,}" if hv else "N/A"],
                ["Median Monthly Rent",      f"${rent:,}" if rent else "N/A"],
                ["Owner-Occupied",           f"{own/tot_hh*100:.0f}%" if tot_hh else "N/A"],
                ["Employment Rate",          f"{emp/lf*100:.1f}%" if emp and lf else "N/A"],
            ]
            _table(fig.add_subplot(bg[0]),rows,["Demographic","Value"],f"Demographics — {state}")
        else:
            ax=fig.add_subplot(bg[0]); ax.axis("off")
            ax.text(0.5,0.5,"Census API key needed",ha="center",va="center",
                    fontsize=9,color=PALETTE["neutral"])
        _line(fig.add_subplot(bg[1]),re["vacancy_rate"],
              "Rental Vacancy Rate (%)","%" ,color=PALETTE["secondary"],fill=True)
        return _save_panel(fig,"panel_3_real_estate.png",save)

    # ── Panel 4: Energy ──────────────────────────────────────────────────────

    def _panel_energy(self, data, ctx, save):
        eng=data["energy"]
        oil_v,_,oil_yoy = _fred_kpi("DCOILWTICO",  self.keys)
        gas_v,_,gas_yoy = _fred_kpi("DHHNGSP",     self.keys)
        ppi_v,_,ppi_yoy = _fred_kpi("WPU0531",     self.keys)

        fig = plt.figure(figsize=(16,8), facecolor=PALETTE["background"])
        fig.suptitle("BME: KEY TRENDS — Energy & Input Costs",
                     fontsize=13, fontweight="bold", color=PALETTE["text"], y=0.98)
        outer = gridspec.GridSpec(2,1,figure=fig,hspace=0.5,height_ratios=[0.9,4])
        r1 = gridspec.GridSpecFromSubplotSpec(1,4,subplot_spec=outer[0],wspace=0.2)
        cg = gridspec.GridSpecFromSubplotSpec(1,3,subplot_spec=outer[1],wspace=0.3)
        for col,(lbl,val,chg,fmt,unit) in enumerate([
            ("WTI Crude ($/bbl)",     oil_v,                    oil_yoy,              "{:.2f}",""),
            ("Natural Gas ($/MMBtu)", gas_v,                    gas_yoy,              "{:.2f}",""),
            ("Retail Gas ($/gal)",    eng.get("gas_price_latest"),eng.get("gas_yoy"), "{:.3f}",""),
            ("PPI Energy Index",      ppi_v,                    ppi_yoy,              "{:.1f}", ""),
        ]): _kpi(fig.add_subplot(r1[col]),lbl,val,fmt,chg,unit)
        _line(fig.add_subplot(cg[0]),eng["oil_wti"],"WTI Crude Oil ($/bbl)","USD",
              fill=True,color=PALETTE["negative"])
        _line(fig.add_subplot(cg[1]),eng["natgas"],"Natural Gas ($/MMBtu)","USD",
              color=PALETTE["secondary"],fill=True)
        _line(fig.add_subplot(cg[2]),eng["ppi_energy"],"PPI Energy Index","Index",
              color="#8E44AD")
        return _save_panel(fig,"panel_4_energy.png",save)

    # ── AI Synthesis (BME + PESTEL + Odyssey 3.14 + BMC) ────────────────────

    def _ai_analysis(self, data, ctx) -> str:
        if not self.keys.get("GROQ_API_KEY"):
            return ("No AI analysis — add GROQ_API_KEY to Colab Secrets.\n"
                    "Free key: https://console.groq.com/")
        def snap(s):
            if not isinstance(s,pd.Series) or s.empty:
                return {"latest":None,"date":None,"yoy_pct":None}
            v=s.iloc[-1]; dt=s.index[-1].strftime("%Y-%m")
            ya=s[s.index<=s.index[-1]-pd.DateOffset(years=1)]
            yoy=round(((v-ya.iloc[-1])/abs(ya.iloc[-1]))*100,2) if not ya.empty else None
            return {"latest":round(v,3),"date":dt,"yoy_pct":yoy}
        summary = {
            "context":ctx,
            "macro":       {k:snap(v) for k,v in data["macro"].items()},
            "labor":       {k:snap(v) for k,v in data["labor"].items() if isinstance(v,pd.Series)},
            "real_estate": {k:snap(v) for k,v in data["real_estate"].items() if isinstance(v,pd.Series)},
            "energy":      {k:snap(v) if isinstance(v,pd.Series) else v for k,v in data["energy"].items()},
            "demographics": data.get("demographics",{}),
        }

        odyssey_ref = json.dumps(ODYSSEY_TRIGGERS, indent=2)
        bmc_vuln_ref = json.dumps(BMC_VULNERABILITY_MAP, indent=2)

        system = f"""
You are a senior business strategist analyzing live economic data using three frameworks:
  1. Osterwalder's Business Model Environment (BME) — 4 Forces
  2. PESTEL framework
  3. Odyssey 3.14 — 14 innovation directions

RULES:
- Base EVERY conclusion solely on the numbers provided.
- Quantify: always cite actual values and YoY changes.
- If data is missing (null), say so — never speculate.
- Connect macro forces to specific business model implications.

Odyssey 3.14 direction reference (which directions each environment condition triggers):
{odyssey_ref}

BMC block vulnerability reference (which blocks are exposed by each force type):
{bmc_vuln_ref}

OUTPUT FORMAT (follow exactly):

## OSTERWALDER BME — 4 FORCES ANALYSIS

### 1. MACROECONOMIC FORCES  (PESTEL: Economic + Political)
[GDP growth rate, inflation, interest rates, consumer sentiment — cite values + YoY]
[What this means for revenue potential, cost of capital, consumer spending]

### 2. INDUSTRY FORCES  (PESTEL: Economic + Legal + Environmental)
[Labor costs, employment trends, competitive dynamics in industry — cite BLS data]
[Supplier power, buyer power, threat of new entrants — what the data implies]

### 3. KEY TRENDS  (PESTEL: Technological + Social + Environmental)
[Technology adoption (hours/employment automation proxy), energy cost trajectory]
[Demographic shifts (Census), behavioral trends, environmental cost pressures]

### 4. MARKET FORCES  (PESTEL: Economic + Social)
[Consumer income distribution, sentiment, retail sales — who is this market serving?]
[Real estate/location costs, market accessibility, switching costs]

## PESTEL PRIORITY TABLE
Format as a table with columns: Factor | Dimension | Impact (H/M/L) | Direction (↑↓→) | Certainty (Trend/Uncertainty/Wild Card) | Business Implication
Include 8-10 highest-priority factors based on the data.

## ODYSSEY 3.14 — ENVIRONMENT-TRIGGERED DIRECTIONS
Based on the identified forces, list the top 4 Odyssey 3.14 innovation directions that are most urgent, and WHY the data supports each direction. Format:
  Direction X (Name): [Why the data makes this direction urgent for {ctx['business_name']}]

## BMC BLOCK VULNERABILITY ASSESSMENT
For each of the 9 BMC blocks, rate vulnerability (High/Medium/Low) based on identified forces:
Customer Segments | Value Propositions | Channels | Customer Relationships | Revenue Streams
Key Resources | Key Activities | Key Partnerships | Cost Structure

## STRATEGIC IMPLICATIONS

### Opportunities (cite data for each)
### Threats (cite data for each)
### 3 Priority Actions for {ctx['business_name']}
### 5 Leading Indicators to Monitor Quarterly (with threshold values derived from data)
"""
        prompt = (f"Analyze this live economic data for strategic environment assessment:\n"
                  f"Business: {ctx['business_name']}\n"
                  f"Industry: {ctx['industry']}\n"
                  f"Location: {ctx['location']}\n"
                  f"Target customers: {ctx['target_customers']}\n\n"
                  f"LIVE DATA:\n{json.dumps(summary, indent=2, default=str)}")
        try:
            from groq import Groq
            r = Groq(api_key=self.keys["GROQ_API_KEY"]).chat.completions.create(
                model="llama-3.3-70b-versatile", temperature=0.2, max_tokens=4500,
                messages=[{"role":"system","content":system},
                          {"role":"user","content":prompt}])
            return r.choices[0].message.content
        except Exception as e:
            return f"AI synthesis error: {e}"


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    tool = BusinessEnvironmentTool()

    result = tool.analyze(
        business_name    = "Joe's Pizza",
        industry         = "restaurant",
        location         = "Chicago, IL",
        target_customers = "Families and young professionals",
        years_history    = 5,
    )

    # Export structured PESTEL JSON for OrchestrA platform
    tool.export_for_orchestra("orchestra_pestel.json")

    # Other examples:
    # tool.analyze("SaaS Startup",   "software",    "San Francisco, CA", "enterprise clients")
    # tool.analyze("Consulting Firm","consulting",  "New York, NY",      "mid-market CFOs")
    # tool.analyze("Clinic",         "healthcare",  "Dallas, TX",        "adults 35-65")
    # tool.analyze("Distribution Co","logistics",   "Chicago, IL",       "SMB manufacturers")
