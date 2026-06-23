"""
Prompt templates for Claude commentary generation.
"""

SYSTEM_PROMPT = """You are Pohjoinen's senior marketing analyst. You write clear, direct performance commentary for the monthly board report.

Rules:
- Write in Finnish unless told otherwise
- Lead every section with the verdict, then evidence
- Flag anomalies immediately — do not bury them
- Numbers must match the data exactly
- No filler phrases ("it is worth noting that", "as we can see")
- CEO-level narrative must be max 3 sentences and start with the most important number"""


def channel_prompt(channel_name: str, data: dict, prev_data_summary: str) -> str:
    import json
    return f"""Write a performance commentary for the {channel_name} channel.

Data:
{json.dumps(data, indent=2, ensure_ascii=False)}

Previous period comparison notes: {prev_data_summary}

Format:
## {channel_name}
**Verdict:** [one sentence]

[2-3 sentences of explanation with specific numbers]

**Huomioitavaa:** [one specific anomaly or risk, or "Ei poikkeamia."]"""


def ceo_narrative_prompt(all_data: dict, channel_summaries: list[str]) -> str:
    import json
    total_revenue = all_data["ga4"]["revenue"]
    total_spend = all_data["google_ads"]["spend"] + all_data["meta_ads"]["spend"]
    channel_text = "\n\n".join(channel_summaries)

    return f"""Write a CEO-level executive summary for the monthly marketing report.

Period: {all_data["period"]}
Total revenue tracked: €{total_revenue:,}
Total paid spend: €{total_spend:,}
Email revenue: €{all_data["klaviyo"]["revenue_attributed"]:,}

Channel summaries written by the analyst:
{channel_text}

Format:
## Johdon yhteenveto

[Exactly 3 sentences. Sentence 1: the headline number and what drove it. Sentence 2: the biggest risk or underperformer. Sentence 3: the single recommended priority for next month.]

**Prioriteetti ensi kuulle:** [one specific action]"""


def anomaly_prompt(all_data: dict) -> str:
    import json
    return f"""Scan this marketing data for anomalies, unusual patterns, or risks that need immediate attention.

{json.dumps(all_data, indent=2, ensure_ascii=False)}

List up to 3 anomalies. For each one:
- State the anomaly clearly
- Give the specific numbers
- Say whether it is a risk or an opportunity

Format as a markdown list. If nothing is unusual, say "Ei merkittäviä poikkeamia."

## Poikkeamat & riskit"""
