# Pohjoinen Performance Report Agent
### Mission 02 — Proof of Concept

**Opportunity built:** Opportunity 3 — Automated monthly performance reporting (replacing Hanna's 2-day manual process)

---

## What it does

An AI agent that pulls data from GA4, Google Ads, Meta Ads Manager, and Klaviyo, then uses Claude to write:

- A channel-by-channel performance analysis with verdict + anomaly flag
- An automated anomaly scan across all channels
- A 3-sentence CEO-level executive summary with one clear priority for next month

Output is a formatted Markdown report. A Next.js web UI lets you generate and view the report in the browser — deployable to Vercel in one click.

**See [`sample_report.md`](sample_report.md) for exactly what it produces.**

---

## Why this opportunity

Hanna spends 2 days per month copying numbers into slides. That is 24 days a year of mechanical work — and the 2-day lag means the data is stale before Arttu sees it. This tool cuts generation time to ~3 minutes and makes mid-month reports possible.

Claude is not just writing code here — it is reading the numbers and forming opinions: which channel underperformed, which anomaly needs attention, what the single priority for next month should be. That is the core value.

---

## Stack

| Tool | Role |
|------|------|
| **Claude API** | Commentary generation, anomaly detection, CEO narrative |
| **Python 3.12** | CLI script, data orchestration |
| **Next.js 14** | Web UI with streaming progress |
| **Vercel** | One-click deploy for the UI |
| **GitHub Actions** | Monthly cron scheduler (optional) |
| **Slack Webhooks** | Notification when report is ready (optional) |

---

## Quick start — CLI (demo mode, no API key needed)

```bash
git clone https://github.com/roynykanen/Proof_of_Concept
cd Proof_of_Concept
pip install -r requirements.txt

python run_report.py --demo
```

## Quick start — with a real API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python run_report.py --output report.md
```

## Quick start — Web UI

```bash
cd ui
npm install
npm run dev
# open http://localhost:3000
```

Toggle **Demo mode** off and add your `ANTHROPIC_API_KEY` to use live Claude calls.

---

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import this repo
2. Set **Root Directory** to `ui`
3. Deploy — demo mode works immediately, no env vars needed
4. To enable live mode: add `ANTHROPIC_API_KEY` in Vercel project settings → Environment Variables

---

## Project structure

```
.
├── run_report.py                  # CLI entry point
├── requirements.txt
├── sample_report.md               # Pre-generated example output
├── pohjoinen_report/
│   ├── mock_data.py               # Mock data (replace with real API calls)
│   └── prompts.py                 # Claude prompt templates
└── ui/
    ├── app/
    │   ├── page.tsx               # Web UI
    │   └── api/report/route.ts    # Streaming API route (calls Claude)
    ├── package.json
    └── next.config.js
```

---

## Wiring up real APIs

Each function in `pohjoinen_report/mock_data.py` is a standalone data source. Replace the mock return value with a real API call — no other changes needed:

| Function | Real API |
|----------|----------|
| `get_ga4_data()` | GA4 Data API via `google-analytics-data` |
| `get_google_ads_data()` | Google Ads API via `google-ads` |
| `get_meta_ads_data()` | Meta Marketing API via `facebook-business` |
| `get_klaviyo_data()` | Klaviyo API v2024-02-15 via `klaviyo-api` |

---

## What I'd build next

1. **Real API connectors** for GA4 and Klaviyo — the two most straightforward (~1 day)
2. **Hanna's approval step** — one-click email approval before the report reaches Arttu (FastAPI + Render free tier)
3. **Trend detection** — feed Claude 3 months of history for directional callouts, not just MoM comparisons
4. **Google Sheets write-back** — push the summary table into Arttu's existing template via `gspread`
