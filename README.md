# Pohjoinen Performance Report Agent
### Mission 02 — Proof of Concept

**Opportunity built:** Opportunity 3 — Automated monthly performance reporting (replacing Hanna's 2-day manual process)

---

## What I built

A Python agent (`run_report.py`) that pulls GA4, Google Ads, Meta Ads, and Klaviyo data, then makes 5 sequential calls to Claude to produce a structured monthly report: channel-by-channel verdicts with specific numbers, an automated anomaly scan, and a 3-sentence CEO executive summary with one concrete action for next month.

The AI is the core. Claude is not generating boilerplate — it is reading the actual numbers and forming opinions: which campaign is underperforming, where to move budget, what the single priority is. Mock data mode means it runs end-to-end immediately with just an `ANTHROPIC_API_KEY`. Real API connectors are drop-in replacements in `mock_data.py`. GitHub Actions runs the cron on the 1st of each month and pings Slack when the draft is ready — zero infrastructure, no servers.

**See [`sample_report.md`](sample_report.md) for exactly what it outputs.**

---

## Why this opportunity

Hanna spends 2 days per month copying numbers into slides. That is 24 days a year of mechanical work — and the 2-day lag means the data is stale before Arttu sees it. This tool cuts generation time to ~3 minutes and makes mid-month reports possible.

---

## Stack

| Tool | Role |
|------|------|
| **Claude API** | Commentary generation, anomaly detection, CEO narrative |
| **Python 3.12** | CLI agent, data orchestration |
| **Next.js 14** | Web UI with streaming progress and channel logos |
| **Vercel** | One-click deploy for the UI |
| **GitHub Actions** | Monthly cron scheduler — runs on the 1st, no servers needed |
| **Slack Webhooks** | Posts the report summary to a channel when the draft is ready |

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

## Send the report to Slack

The web UI has a **Send to Slack** button at the bottom of every generated report. It posts a formatted Block Kit message with the executive summary, key metrics, priority, and anomalies.

**How to set it up:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Add the **Incoming Webhooks** feature and activate it
3. Click **Add New Webhook to Workspace**, choose the channel, and copy the webhook URL (`https://hooks.slack.com/services/...`)
4. Paste the URL into the **Send to Slack** input in the UI and click **Send**

**To skip pasting the URL every time (Vercel):**

Add `SLACK_WEBHOOK_URL` as an environment variable in Vercel project settings → Environment Variables, then redeploy. The input field will disappear and the Send button will use the server-side webhook automatically.

**CLI / GitHub Actions:**

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
python run_report.py --output report.md
# the script pings Slack automatically when the report is saved
```

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
    │   ├── page.tsx               # Web UI with brand logos and English UI
    │   ├── api/report/route.ts    # Streaming API route (calls Claude)
    │   └── api/slack/route.ts     # Slack webhook proxy
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
