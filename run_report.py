#!/usr/bin/env python3
"""
Pohjoinen Monthly Performance Report Agent
==========================================
Pulls data from GA4, Google Ads, Meta Ads, and Klaviyo (mock or live),
then uses Claude to write channel commentary and a CEO-level narrative.

Usage:
    python run_report.py --demo                  # demo mode, no API key needed
    python run_report.py --output report.md      # save to file
    python run_report.py --live                  # use real API connectors
    python run_report.py --lang en               # English output (default: Finnish)

Environment variables:
    ANTHROPIC_API_KEY   Required (not needed in --demo mode)
    SLACK_WEBHOOK_URL   Optional -- posts summary to Slack when set
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from pohjoinen_report.mock_data import get_all_data
from pohjoinen_report.prompts import (
    SYSTEM_PROMPT,
    channel_prompt,
    ceo_narrative_prompt,
    anomaly_prompt,
)

# ---------------------------------------------------------------------------
# Pre-written demo responses (what Claude produces for the mock dataset)
# ---------------------------------------------------------------------------

DEMO_GA4 = """## Google Analytics 4 / Verkkosivusto
**Verdict:** Toukokuu kasvoi merkittavasti -- orgaaninen liikenne +26 % on selkein merkki SEO-investointien vaikutuksesta.

Sessiot kasvoivat 41 100:sta 48 320:een (+17,6 %) ja liikevaihto nousi EUR159 200:sta EUR187 450:een (+17,7 %). Orgaaninen liikenne nousi 17 800:sta 22 400:een -- orgaanisen osuus kaikista sessioista nousi 43 %:sta 46 %:iin. Sahkopostikanava tuotti parhaan tehokkuuden: EUR28 400 liikevaihdolla vain 7 800 sessiolla (EUR3,64/sessio vs. maksetun haun EUR4,81).

**Huomioitavaa:** Konversioprosentti laski 2,64 % -> 2,57 % vaikka sessiot kasvoivat. Orgaaninen kasvu tuo enemmän tiedonhakijoita kuin ostajia -- seuraa kehitysta /vaelluskengat-laskeutumissivulla."""

DEMO_GADS = """## Google Ads
**Verdict:** Paras ROAS-kuukausi sitten Q4 2024: 5,92x -- kasvu johtuu seka CPC-laskusta etta paremmasta konversioasteesta.

Kulutus kasvoi EUR8 200:sta EUR9 840:een (+20 %), mutta tuotto nousi EUR44 100:sta EUR58 200:een (+31,9 %), eli ROAS parani 5,38:sta 5,92:een. Klikkikohtainen hinta laski EUR0,74 -> EUR0,69. Brand-kampanja dominoi: ROAS 14,2 EUR1 200 kulutuksella.

**Huomioitavaa:** Retargeting-kampanjan ROAS 3,9 on selva heikkous -- tarkista yleisojen paallekkaisyydet Brand-kampanjan kanssa, ne saattavat syoda toistensa budjettia."""

DEMO_META = """## Meta Ads
**Verdict:** Kokonaistuotto parani (ROAS 4,71 vs. edellinen 3,96), mutta Interest-kohderyhmäsetti vaatii valitonta toimenpidetta.

Kulutus laski EUR4 600:sta EUR4 120:een (-10 %) kun heikkoja creative-setteja sammutettiin -- oikea suunta. Retargeting-setti tuottaa ROAS 7,8:lla, Lookalike 6,2:lla. Mutta Interest-kohderyhmäsetti kuluttaa EUR1 540 ROAS 2,1:lla -- sama budjetti Retargeting-setissa tuottaisi ~EUR12 000.

**Huomioitavaa:** Siirra Interest-setin budjetti valittomasti Lookalike 1 % -kohderyhmalle. Testaa uusi creative ennen uuden Interest-setin kaynnistamista."""

DEMO_KLAVIYO = """## Klaviyo / Sahkopostimarkkinointi
**Verdict:** Sahkopostituotto +31,5 % MoM -- segmentoidut kampanjat todistavat arvonsa ylivoimaisesti massakampanjaan verrattuna.

Kokonaistuotto nousi EUR21 600:sta EUR28 400:een. Avausprosentti parani 26,1 % -> 28,4 %, klikkiprosentti 3,8 % -> 4,2 %. Tavallisin havainto: "Vaelluskengat - ostajat" (12 400 tilaajaa, open rate 41,8 %) teki EUR11 400 -- massakampanja "Kevatalennus - kaikki" (181 000 tilaajaa) teki vain EUR5 200. Pienempi, osuvampi lahetys tuotti 2,2x enemmän.

**Huomioitavaa:** Win-back-kampanjan avausprosentti 19,4 % on listan heikoin. Kokeile 90 paivan lapsuneisuusrajaa 180 paivan sijaan ja tarjoa konkreettinen etu."""

DEMO_CEO = """## Johdon yhteenveto

Toukokuu 2025 oli Pohjoisen vahvin kuukausi: seurattu liikevaihto nousi 18 % edelliskuusta EUR187 450:een, ja orgaaninen liikenne kasvoi 26 %, mika osoittaa SEO-investointien alkaneen tuottaa. Suurin riski on Meta Interest -kohderyhmäsetti (ROAS 2,1), joka kuluttaa EUR1 540 lahes ilman tuottoa -- sen budjetti pitaa siirtaa valittomasti Lookalike-yleisöihin. Kesakuun prioriteetti: sammuta Meta Interest -setti, ohjaa saasto Vaellus-hakukampanjoihin (ROAS 6,1), ja kaynnista Juoksukenkä-kategoriaan kohdennettu sahkopostiflow ostajille.

**Prioriteetti ensi kuulle:** Siirra Meta Interest -budjetti (EUR1 540) Lookalike 1 % -kohderyhmalle ja kaynnista Juoksukenkä-sahkopostiflow ostajasegmentille."""

DEMO_ANOMALIES = """## Poikkeamat & riskit

- **Meta Interest -kohderyhmä ROAS 2,1** -- EUR1 540 kulutuksella tuotettu EUR3 234 liikevaihto on selvästi alle tavoitteen. Sama budjetti Retargeting-setissä tuottaisi ~EUR12 000. *(Riski -- toimenpide tarvitaan valittomasti)*

- **Konversioprosentti laski** 2,64 % -> 2,57 % vaikka sessiot kasvoivat 17,6 %. Orgaaninen kasvu tuo enemmän tiedonhakijoita kuin ostajia. *(Riski -- seurattava)*

- **Sahköpostin segmentoitu kampanja ylituotti massakampanjan** 2,2x: 12 400 tilaajaa tuotti EUR11 400 vs. 181 000 tilaajaa tuotti EUR5 200. Tama vahvistaa segmentointistrategian arvon. *(Mahdollisuus -- skaalaa)*"""

# ---------------------------------------------------------------------------


def claude_call(client, prompt: str, system: str = SYSTEM_PROMPT) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def build_report(client, data: dict, lang: str, demo: bool) -> str:
    try:
        import anthropic as _anthropic
    except ImportError:
        pass

    system = SYSTEM_PROMPT
    if lang == "en":
        system = system.replace("Write in Finnish unless told otherwise", "Write in English")

    if demo:
        steps = [
            ("  [1/5] Analysing GA4...", DEMO_GA4),
            ("  [2/5] Analysing Google Ads...", DEMO_GADS),
            ("  [3/5] Analysing Meta Ads...", DEMO_META),
            ("  [4/5] Analysing Klaviyo...", DEMO_KLAVIYO),
        ]
        sections = []
        for label, content in steps:
            print(label, file=sys.stderr)
            time.sleep(0.6)
            sections.append(content)
        ga4_section, gads_section, meta_section, klaviyo_section = sections

        print("  [5/5] Writing CEO narrative & anomaly scan...", file=sys.stderr)
        time.sleep(0.8)
        ceo_section = DEMO_CEO
        anomalies = DEMO_ANOMALIES
    else:
        print("  [1/5] Analysing GA4...", file=sys.stderr)
        ga4_section = claude_call(
            client,
            channel_prompt(
                "Google Analytics 4 / Verkkosivusto",
                data["ga4"],
                f"Previous period revenue EUR{data['ga4']['revenue_prev']:,}, sessions {data['ga4']['sessions_prev']:,}",
            ),
            system,
        )

        print("  [2/5] Analysing Google Ads...", file=sys.stderr)
        gads_section = claude_call(
            client,
            channel_prompt(
                "Google Ads",
                data["google_ads"],
                f"Previous spend EUR{data['google_ads']['spend_prev']:,}, ROAS {data['google_ads']['roas_prev']}",
            ),
            system,
        )

        print("  [3/5] Analysing Meta Ads...", file=sys.stderr)
        meta_section = claude_call(
            client,
            channel_prompt(
                "Meta Ads",
                data["meta_ads"],
                f"Previous spend EUR{data['meta_ads']['spend_prev']:,}, ROAS {data['meta_ads']['roas_prev']}",
            ),
            system,
        )

        print("  [4/5] Analysing Klaviyo...", file=sys.stderr)
        klaviyo_section = claude_call(
            client,
            channel_prompt(
                "Klaviyo / Sahkopostimarkkinointi",
                data["klaviyo"],
                f"Previous revenue EUR{data['klaviyo']['revenue_attributed_prev']:,}, open rate {data['klaviyo']['avg_open_rate_prev']}%",
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

    report = f"""# Pohjoinen -- Kuukausiraportti {period}
_Generoitu {generated_at} | Pohjoinen Performance Report Agent_

---

{ceo_section}

---

## Avainluvut

| Mittari | {period} | {data["prev_period"]} | Muutos |
|---------|-----------|-------------|--------|
| Liikevaihto (tracked) | EUR{total_revenue:,} | EUR{data["ga4"]["revenue_prev"]:,} | {((total_revenue/data["ga4"]["revenue_prev"])-1)*100:+.1f}% |
| Sessiot | {data["ga4"]["sessions"]:,} | {data["ga4"]["sessions_prev"]:,} | {((data["ga4"]["sessions"]/data["ga4"]["sessions_prev"])-1)*100:+.1f}% |
| Maksettu media (yht.) | EUR{total_spend:,} | EUR{data["google_ads"]["spend_prev"]+data["meta_ads"]["spend_prev"]:,} | {((total_spend/(data["google_ads"]["spend_prev"]+data["meta_ads"]["spend_prev"]))-1)*100:+.1f}% |
| Blended ROAS | {blended_roas:.2f}x | -- | -- |
| Sahkopostituotto | EUR{data["klaviyo"]["revenue_attributed"]:,} | EUR{data["klaviyo"]["revenue_attributed_prev"]:,} | {((data["klaviyo"]["revenue_attributed"]/data["klaviyo"]["revenue_attributed_prev"])-1)*100:+.1f}% |
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
                f"Liikevaihto: EUR{revenue:,} | Blended ROAS: {roas:.2f}x\n"
                "Avaa raportti Google Sheetsista."
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
    parser.add_argument("--demo", action="store_true", help="Demo mode: runs without ANTHROPIC_API_KEY")
    parser.add_argument("--live", action="store_true", help="Use real API connectors instead of mock data")
    args = parser.parse_args()

    client = None
    if not args.demo:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print("Error: ANTHROPIC_API_KEY environment variable not set.")
            print("Tip: run with --demo to see a full walkthrough without an API key.")
            sys.exit(1)
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
        except ImportError:
            print("Missing dependency. Run: pip install -r requirements.txt")
            sys.exit(1)

    if args.live and not args.demo:
        print("Live mode not yet wired -- falling back to mock data.", file=sys.stderr)

    data = get_all_data()
    mode = "demo" if args.demo else "live"
    print(f"Generating report for {data['period']} [{mode}]...", file=sys.stderr)

    report = build_report(client, data, args.lang, args.demo)

    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
        print(f"\nReport saved to: {args.output}", file=sys.stderr)
    else:
        print(report)

    slack_url = os.environ.get("SLACK_WEBHOOK_URL")
    if slack_url:
        total_spend = data["google_ads"]["spend"] + data["meta_ads"]["spend"]
        post_slack(slack_url, data["period"], data["ga4"]["revenue"], data["ga4"]["revenue"] / total_spend)


if __name__ == "__main__":
    main()
