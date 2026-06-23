#!/usr/bin/env python3
"""
Pohjoinen Monthly Performance Report Agent
==========================================
Pulls data from GA4, Google Ads, Meta Ads, and Klaviyo (mock or live),
then uses Claude to write channel commentary and a CEO-level narrative.

Usage:
    python run_report.py                         # mock data, print to stdout
    python run_report.py --output report.md      # save markdown file
    python run_report.py --live                  # use real API connectors (see connectors/)
    python run_report.py --lang en               # English output (default: Finnish)

Environment variables:
    ANTHROPIC_API_KEY   Required
    SLACK_WEBHOOK_URL   Optional — posts summary to Slack when set
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Missing dependency. Run: pip install -r requirements.txt")
    sys.exit(1)

from pohjoinen_report.mock_data import get_all_data
from pohjoinen_report.prompts import (
    SYSTEM_PROMPT,
    channel_prompt,
    ceo_narrative_prompt,
    anomaly_prompt,
)


def claude_call(client: anthropic.Anthropic, prompt: str, system: str = SYSTEM_PROMPT) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def build_report(client: anthropic.Anthropic, data: dict, lang: str) -> str:
    system = SYSTEM_PROMPT
    if lang == "en":
        system = system.replace("Write in Finnish unless told otherwise", "Write in English")

    print("  [1/5] Analysing GA4...", file=sys.stderr)
    ga4_section = claude_call(
        client,
        channel_prompt(
            "Google Analytics 4 / Verkkosivusto",
            data["ga4"],
            f"Previous period revenue €{data['ga4']['revenue_prev']:,}, sessions {data['ga4']['sessions_prev']:,}",
        ),
        system,
    )

    print("  [2/5] Analysing Google Ads...", file=sys.stderr)
    gads_section = claude_call(
        client,
        channel_prompt(
            "Google Ads",
            data["google_ads"],
            f"Previous spend €{data['google_ads']['spend_prev']:,}, ROAS {data['google_ads']['roas_prev']}",
        ),
        system,
    )

    print("  [3/5] Analysing Meta Ads...", file=sys.stderr)
    meta_section = claude_call(
        client,
        channel_prompt(
            "Meta Ads",
            data["meta_ads"],
            f"Previous spend €{data['meta_ads']['spend_prev']:,}, ROAS {data['meta_ads']['roas_prev']}",
        ),
        system,
    )

    print("  [4/5] Analysing Klaviyo...", file=sys.stderr)
    klaviyo_section = claude_call(
        client,
        channel_prompt(
            "Klaviyo / Sähköpostimarkkinointi",
            data["klaviyo"],
            f"Previous revenue €{data['klaviyo']['revenue_attributed_prev']:,}, open rate {data['klaviyo']['avg_open_rate_prev']}%",
        ),
        system,
    )

    print("  [5/5] Writing CEO narrative & anomaly scan...", file=sys.stderr)
    channel_summaries = [ga4_section, gads_section, meta_section, klaviyo_section]
    ceo_section = claude_call(client, ceo_narrative_prompt(data, channel_summaries), system)
    anomalies = claude_call(client, anomaly_prompt(data), system)

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    period = data["period"]
    total_revenue = data["ga4"]["revenue"]
    total_spend = data["google_ads"]["spend"] + data["meta_ads"]["spend"]
    blended_roas = total_revenue / total_spend

    report = f"""# Pohjoinen — Kuukausiraportti {period}
_Generoitu {generated_at} | Pohjoinen Performance Report Agent_

---

{ceo_section}

---

## Avainluvut

| Mittari | {period} | {data["prev_period"]} | Muutos |
|---------|-----------|-------------|--------|
| Liikevaihto (tracked) | €{total_revenue:,} | €{data["ga4"]["revenue_prev"]:,} | {((total_revenue/data["ga4"]["revenue_prev"])-1)*100:+.1f}% |
| Sessiot | {data["ga4"]["sessions"]:,} | {data["ga4"]["sessions_prev"]:,} | {((data["ga4"]["sessions"]/data["ga4"]["sessions_prev"])-1)*100:+.1f}% |
| Maksettu media (yht.) | €{total_spend:,} | €{data["google_ads"]["spend_prev"]+data["meta_ads"]["spend_prev"]:,} | {((total_spend/(data["google_ads"]["spend_prev"]+data["meta_ads"]["spend_prev"]))-1)*100:+.1f}% |
| Blended ROAS | {blended_roas:.2f}x | — | — |
| Sähköpostituotto | €{data["klaviyo"]["revenue_attributed"]:,} | €{data["klaviyo"]["revenue_attributed_prev"]:,} | {((data["klaviyo"]["revenue_attributed"]/data["klaviyo"]["revenue_attributed_prev"])-1)*100:+.1f}% |
| Konversioprosentti | {data["ga4"]["conversion_rate"]}% | {data["ga4"]["conversion_rate_prev"]}% | {data["ga4"]["conversion_rate"]-data["ga4"]["conversion_rate_prev"]:+.2f}pp |

---

{anomalies}

---

{ga4_section}

---

{gads_section}

---

{meta_section}

---

{klaviyo_section}

---

_Raportti generoitu automaattisesti. Tarkista luvut ennen jakamista._
"""
    return report


def post_slack(webhook_url: str, period: str, revenue: int, roas: float) -> None:
    try:
        import urllib.request
        payload = json.dumps({
            "text": (
                f":bar_chart: *Pohjoinen kuukausiraportti {period} valmis*\n"
                f"Liikevaihto: €{revenue:,} | Blended ROAS: {roas:.2f}x\n"
                "Avaa raportti Google Sheetsistä."
            )
        }).encode()
        req = urllib.request.Request(webhook_url, data=payload, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
        print("Slack notification sent.", file=sys.stderr)
    except Exception as e:
        print(f"Slack notification failed (non-fatal): {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Pohjoinen Monthly Report Agent")
    parser.add_argument("--output", help="Save report to this .md file (default: stdout)")
    parser.add_argument("--lang", choices=["fi", "en"], default="fi", help="Report language (default: fi)")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Use real API connectors instead of mock data (requires connector setup)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        print("Export it: export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    if args.live:
        print("Live mode not yet wired — falling back to mock data.", file=sys.stderr)
        print("See connectors/README.md to add real API integrations.", file=sys.stderr)

    data = get_all_data()

    print(f"Generating report for {data['period']}...", file=sys.stderr)
    client = anthropic.Anthropic(api_key=api_key)
    report = build_report(client, data, args.lang)

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"\nReport saved to: {args.output}", file=sys.stderr)
    else:
        print(report)

    slack_url = os.environ.get("SLACK_WEBHOOK_URL")
    if slack_url:
        total_spend = data["google_ads"]["spend"] + data["meta_ads"]["spend"]
        post_slack(
            slack_url,
            data["period"],
            data["ga4"]["revenue"],
            data["ga4"]["revenue"] / total_spend,
        )


if __name__ == "__main__":
    main()
