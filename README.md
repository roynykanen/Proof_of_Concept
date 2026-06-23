# Pohjoinen Performance Report Agent
### Mission 02 — Proof of Concept

**Opportunity built:** Opportunity 3 — Automated monthly performance reporting (replacing Hanna's 2-day manual process)

---

## What it does

A Python script that pulls data from GA4, Google Ads, Meta Ads Manager, and Klaviyo, then uses Claude to write:

- A channel-by-channel performance analysis with verdict + anomaly flag
- An automated anomaly scan across all channels
- A 3-sentence CEO-level executive summary with one clear priority

Output is a Markdown report that drops straight into Google Sheets or a Slack message. The script runs on a GitHub Actions cron on the 1st of each month and pings Slack when the draft is ready.

**See [`sample_report.md`](sample_report.md) for exactly what it produces.**

---

## Why this opportunity

Hanna spends 2 days per month copying numbers into slides. That's 24 days a year of mechanical work that produces a document Arttu needs for decisions — but the 2-day lag means the data is already stale when it arrives. This tool cuts generation time to ~3 minutes and makes mid-month reports possible.

The AI component is not just "write code" — Claude is reading the numbers and forming an opinion: which channel underperformed, which anomaly needs attention, what the single priority for next month should be. That's the core value.

---

## Stack

| Tool | Role |
|------|------|
| **Claude API (claude-sonnet-4-6)** | Commentary generation, anomaly detection, CEO narrative |
| **Python 3.12** | Orchestration, API calls, output formatting |
| **GitHub Actions** | Monthly cron scheduler, zero-infrastructure deploy |
| **Slack Webhooks** | Notification when report is ready |

Real API connectors (GA4 Data API, Google Ads API, Meta Marketing API, Klaviyo API) slot in as drop-in replacements for the mock data functions in `pohjoinen_report/mock_data.py`.

---

## How to run

```bash
# 1. Clone and install
git clone https://github.com/roynykanen/proof_of_concept
cd proof_of_concept
pip install -r requirements.txt

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Run with mock data (works immediately, no other credentials needed)
python run_report.py

# Save to file
python run_report.py --output report.md

# English output
python run_report.py --lang en

# With Slack notification
export SLACK_WEBHOOK_URL=https://hooks.slack.com/...
python run_report.py --output report.md
```

---

## Project structure

```
.
├── run_report.py                  # Entry point
├── requirements.txt
├── sample_report.md               # Pre-generated example output
├── pohjoinen_report/
│   ├── mock_data.py               # Realistic mock data (replace with real APIs)
│   └── prompts.py                 # Claude prompt templates
└── .github/
    └── workflows/
        └── monthly_report.yml     # GitHub Actions cron (runs 1st of each month)
```

---

## Wiring up real APIs

Each function in `pohjoinen_report/mock_data.py` is a standalone data source. Replace the mock return value with a real API call:

| Function | Real API |
|----------|----------|
| `get_ga4_data()` | [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) via `google-analytics-data` |
| `get_google_ads_data()` | [Google Ads API](https://developers.google.com/google-ads/api) via `google-ads` |
| `get_meta_ads_data()` | [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis) via `facebook-business` |
| `get_klaviyo_data()` | [Klaviyo API v2024-02-15](https://developers.klaviyo.com) via `klaviyo-api` |

Each returns the same dict shape the prompts expect — no other changes needed.

---

## What I'd build next

1. **Google Sheets write-back** — push the summary table into Arttu's existing template via `gspread`, so the format Arttu already knows stays unchanged
2. **Real API connectors** for GA4 and Klaviyo (these are the two most straightforward; ~1 day of work)
3. **Trend detection** — feed Claude 3 months of data at once so it can call out directional shifts, not just MoM comparisons
4. **Hanna's approval step** — a simple email with "Approve & send to Arttu" link using a minimal FastAPI endpoint, so the human stays in the loop before anything goes out
