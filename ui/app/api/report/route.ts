import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportData {
  period: string;
  prev_period: string;
  generated_at: string;
  demo: boolean;
  ceo_summary: string;
  ceo_priority: string;
  metrics: Metric[];
  anomalies: Anomaly[];
  channels: Channel[];
}

export interface Metric {
  label: string;
  value: string;
  prev: string;
  change: string;
  direction: "up" | "down" | "neutral";
  positive: boolean;
}

export interface Anomaly {
  title: string;
  body: string;
  type: "risk-high" | "risk-low" | "opportunity";
}

export interface Channel {
  name: string;
  icon: string;
  verdict: string;
  verdict_positive: boolean;
  body: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK = {
  period: "May 2025",
  prev_period: "April 2025",
  ga4: {
    sessions: 48320, sessions_prev: 41100,
    organic_sessions: 22400, organic_sessions_prev: 17800,
    revenue: 187450, revenue_prev: 159200,
    conversion_rate: 2.57, conversion_rate_prev: 2.64,
    channel_breakdown: {
      "Organic Search": { sessions: 22400, revenue: 89600 },
      "Paid Search": { sessions: 12100, revenue: 58200 },
      "Email": { sessions: 7800, revenue: 28400 },
      "Social": { sessions: 4200, revenue: 8900 },
    },
  },
  google_ads: {
    spend: 9840, spend_prev: 8200,
    revenue: 58200, revenue_prev: 44100,
    roas: 5.92, roas_prev: 5.38,
    avg_cpc: 0.69, avg_cpc_prev: 0.74,
    conversions: 387, conversions_prev: 301,
    top_campaigns: [
      { name: "Brand – Exact", spend: 1200, roas: 14.2, conversions: 98 },
      { name: "Hiking – Generic", spend: 3400, roas: 6.1, conversions: 142 },
      { name: "Running – Generic", spend: 2800, roas: 4.8, conversions: 89 },
      { name: "Retargeting", spend: 2440, roas: 3.9, conversions: 58 },
    ],
  },
  meta_ads: {
    spend: 4120, spend_prev: 4600,
    revenue: 19400, revenue_prev: 18200,
    roas: 4.71, roas_prev: 3.96,
    top_adsets: [
      { name: "Lookalike 1% – Buyers", spend: 1600, roas: 6.2 },
      { name: "Retargeting – 30d", spend: 980, roas: 7.8 },
      { name: "Interest – Outdoor", spend: 1540, roas: 2.1 },
    ],
  },
  klaviyo: {
    total_subscribers: 181400,
    revenue_attributed: 28400, revenue_attributed_prev: 21600,
    avg_open_rate: 28.4, avg_open_rate_prev: 26.1,
    avg_click_rate: 4.2, avg_click_rate_prev: 3.8,
    campaigns: [
      { name: "Spring Sale – All", sent: 181000, open_rate: 24.1, revenue: 5200 },
      { name: "Hiking Boots – Buyers", sent: 12400, open_rate: 41.8, revenue: 11400 },
      { name: "Tents & Camping Gear", sent: 38000, open_rate: 33.2, revenue: 8200 },
      { name: "Win-back – 180d", sent: 14200, open_rate: 19.4, revenue: 3600 },
    ],
    flows_revenue: 9800,
  },
};

// ---------------------------------------------------------------------------
// Pre-built structured demo report
// ---------------------------------------------------------------------------

function buildDemoReport(demo: boolean): ReportData {
  const d = MOCK;
  const totalSpend = d.google_ads.spend + d.meta_ads.spend;
  const prevSpend = d.google_ads.spend_prev + d.meta_ads.spend_prev;

  const pct = (a: number, b: number) => {
    const v = ((a - b) / b) * 100;
    return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
  };

  return {
    period: d.period,
    prev_period: d.prev_period,
    generated_at: new Date().toLocaleString("en-GB", { timeZone: "Europe/Helsinki" }),
    demo,
    ceo_summary:
      "May 2025 was Pohjoinen's strongest month on record: tracked revenue rose 18% MoM to €187,450 and organic traffic grew 26%, signalling that SEO investments are paying off. The single biggest risk is the Meta Interest audience (ROAS 2.1) burning €1,540 for only €3,234 in revenue — the same budget in Retargeting would yield ~€12,000. June priority: pause the Interest ad set and redirect its budget to the Hiking Search campaigns (ROAS 6.1).",
    ceo_priority:
      "Reallocate Meta Interest budget (€1,540) to the Lookalike 1% audience and launch a Running Shoes post-purchase email flow for buyers.",
    metrics: [
      { label: "Revenue", value: "€187,450", prev: "€159,200", change: pct(d.ga4.revenue, d.ga4.revenue_prev), direction: "up", positive: true },
      { label: "Sessions", value: "48,320", prev: "41,100", change: pct(d.ga4.sessions, d.ga4.sessions_prev), direction: "up", positive: true },
      { label: "Paid media spend", value: `€${totalSpend.toLocaleString("en-GB")}`, prev: `€${prevSpend.toLocaleString("en-GB")}`, change: pct(totalSpend, prevSpend), direction: "up", positive: false },
      { label: "Blended ROAS", value: `${(d.ga4.revenue / totalSpend).toFixed(2)}x`, prev: "—", change: "", direction: "neutral", positive: true },
      { label: "Email revenue", value: "€28,400", prev: "€21,600", change: pct(d.klaviyo.revenue_attributed, d.klaviyo.revenue_attributed_prev), direction: "up", positive: true },
      { label: "Conversion rate", value: "2.57%", prev: "2.64%", change: "−0.07 pp", direction: "down", positive: false },
    ],
    anomalies: [
      {
        title: "Meta Interest audience ROAS 2.1",
        body: "€1,540 spend produced €3,234 revenue — well below target. The same budget in the Retargeting ad set would yield ~€12,000.",
        type: "risk-high",
      },
      {
        title: "Conversion rate dropped 2.64% → 2.57%",
        body: "Sessions grew +17.6% but organic growth brings more browsers than buyers. Monitor next month before acting.",
        type: "risk-low",
      },
      {
        title: "Segmented email outperformed broadcast 2.2×",
        body: '"Hiking Boots – Buyers" (12,400 subscribers) generated €11,400 vs. "Spring Sale – All" (181,000 subscribers) at €5,200.',
        type: "opportunity",
      },
    ],
    channels: [
      {
        name: "Google Analytics 4",
        icon: "📊",
        verdict: "Organic traffic +26% — SEO investments are starting to pay off.",
        verdict_positive: true,
        body: "Sessions grew from 41,100 to 48,320 (+17.6%) and revenue rose from €159,200 to €187,450 (+17.7%). Organic share increased from 43% to 46%. Email was the most efficient channel at €3.64/session vs. paid search at €4.81.",
        note: "Conversion rate slipped from 2.64% to 2.57% despite session growth. Monitor the /hiking-boots landing page closely.",
      },
      {
        name: "Google Ads",
        icon: "🎯",
        verdict: "Best ROAS month since Q4 2024: 5.92× — CPC fell and conversions grew.",
        verdict_positive: true,
        body: "Spend +20% (€9,840), revenue +31.9% (€58,200), ROAS improved from 5.38 to 5.92. CPC dropped from €0.74 to €0.69. Brand campaign delivered ROAS 14.2 on €1,200 spend.",
        note: "Retargeting campaign ROAS 3.9 is the weakest — check for audience overlap with the Brand campaign.",
      },
      {
        name: "Meta Ads",
        icon: "📱",
        verdict: "Overall ROAS improved 3.96 → 4.71, but the Interest ad set needs immediate action.",
        verdict_positive: false,
        body: "Spend dropped from €4,600 to €4,120 (−10%) as underperforming ad sets were paused. Retargeting ROAS 7.8, Lookalike 6.2. Interest set burns €1,540 at ROAS 2.1 — the same budget in Retargeting would produce ~€12,000.",
        note: "Pause the Interest ad set immediately and move the budget to the Lookalike 1% audience.",
      },
      {
        name: "Klaviyo",
        icon: "✉️",
        verdict: "Email revenue +31.5% MoM — segmentation proves its value decisively.",
        verdict_positive: true,
        body: "Total revenue €21,600 → €28,400. Open rate 26.1% → 28.4%, click rate 3.8% → 4.2%. Segmented campaign (12,400 subscribers, OR 41.8%) generated €11,400 — the broadcast to 181,000 subscribers produced only €5,200.",
        note: "Win-back open rate 19.4% is the list's weakest. Test a 90-day inactivity threshold instead of 180 days.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Claude calls (live mode)
// ---------------------------------------------------------------------------

const SYSTEM = `You are Pohjoinen's senior marketing analyst. Write in English. Lead with verdict then evidence. Flag anomalies immediately. No filler. Numbers must match data exactly.`;

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as { text: string }).text.trim();
}

async function buildLiveReport(): Promise<ReportData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey });
  const d = MOCK;
  const totalSpend = d.google_ads.spend + d.meta_ads.spend;
  const prevSpend = d.google_ads.spend_prev + d.meta_ads.spend_prev;
  const pct = (a: number, b: number) => `${(((a - b) / b) * 100).toFixed(1)}%`;

  const [ga4Body, gadsBody, metaBody, klaviyoBody] = await Promise.all([
    callClaude(client, `GA4 data: ${JSON.stringify(d.ga4)}. Write 2-3 sentences of analysis in English with specific numbers. No heading.`),
    callClaude(client, `Google Ads data: ${JSON.stringify(d.google_ads)}. Write 2-3 sentences of analysis in English with specific numbers. No heading.`),
    callClaude(client, `Meta Ads data: ${JSON.stringify(d.meta_ads)}. Write 2-3 sentences of analysis in English with specific numbers. No heading.`),
    callClaude(client, `Klaviyo data: ${JSON.stringify(d.klaviyo)}. Write 2-3 sentences of analysis in English with specific numbers. No heading.`),
  ]);

  const ceoRaw = await callClaude(client,
    `Write exactly 3 English sentences as CEO summary. Revenue €${d.ga4.revenue}, paid spend €${totalSpend}, email €${d.klaviyo.revenue_attributed}. Sentence 1: headline number and driver. Sentence 2: biggest risk. Sentence 3: single priority for next month. Output only the 3 sentences, nothing else.`
  );

  return {
    period: d.period,
    prev_period: d.prev_period,
    generated_at: new Date().toLocaleString("en-GB", { timeZone: "Europe/Helsinki" }),
    demo: false,
    ceo_summary: ceoRaw,
    ceo_priority: "Reallocate Meta Interest budget (€1,540) to the Lookalike 1% audience and launch a Running Shoes post-purchase email flow for buyers.",
    metrics: [
      { label: "Revenue", value: "€187,450", prev: "€159,200", change: `+${pct(d.ga4.revenue, d.ga4.revenue_prev)}`, direction: "up", positive: true },
      { label: "Sessions", value: "48,320", prev: "41,100", change: `+${pct(d.ga4.sessions, d.ga4.sessions_prev)}`, direction: "up", positive: true },
      { label: "Paid media spend", value: `€${totalSpend.toLocaleString("en-GB")}`, prev: `€${prevSpend.toLocaleString("en-GB")}`, change: `+${pct(totalSpend, prevSpend)}`, direction: "up", positive: false },
      { label: "Blended ROAS", value: `${(d.ga4.revenue / totalSpend).toFixed(2)}x`, prev: "—", change: "", direction: "neutral", positive: true },
      { label: "Email revenue", value: "€28,400", prev: "€21,600", change: `+${pct(d.klaviyo.revenue_attributed, d.klaviyo.revenue_attributed_prev)}`, direction: "up", positive: true },
      { label: "Conversion rate", value: "2.57%", prev: "2.64%", change: "−0.07 pp", direction: "down", positive: false },
    ],
    anomalies: [
      { title: "Meta Interest audience ROAS 2.1", body: "€1,540 spend yielded only €3,234 — move budget to Retargeting for ~€12,000 return.", type: "risk-high" },
      { title: "Conversion rate declined", body: "2.64% → 2.57% despite sessions +17.6%. Organic growth brings more browsers than buyers.", type: "risk-low" },
      { title: "Segmented email outperformed broadcast 2.2×", body: "12,400 subscribers → €11,400 vs. 181,000 subscribers → €5,200.", type: "opportunity" },
    ],
    channels: [
      { name: "Google Analytics 4", icon: "📊", verdict: "Organic traffic +26% — SEO investments are paying off.", verdict_positive: true, body: ga4Body, note: "Conversion rate slipped — monitor the /hiking-boots landing page." },
      { name: "Google Ads", icon: "🎯", verdict: "ROAS 5.92× — best month since Q4 2024.", verdict_positive: true, body: gadsBody, note: "Retargeting ROAS 3.9 — check for audience overlap with Brand campaign." },
      { name: "Meta Ads", icon: "📱", verdict: "ROAS improved 3.96 → 4.71, but Interest ad set needs immediate action.", verdict_positive: false, body: metaBody, note: "Pause Interest ad set immediately and move budget to Lookalike 1%." },
      { name: "Klaviyo", icon: "✉️", verdict: "Email revenue +31.5% — segmentation proves its value.", verdict_positive: true, body: klaviyoBody, note: "Win-back OR 19.4% is the list's weakest — test a 90-day inactivity window." },
    ],
  };
}

// ---------------------------------------------------------------------------
// Streaming POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { demo } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const steps = ["GA4", "Google Ads", "Meta Ads", "Klaviyo", "CEO narrative"];

        if (demo) {
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
          for (const step of steps) {
            send("step", step);
            await delay(650);
          }
          send("done", buildDemoReport(true));
        } else {
          for (const step of steps) send("step", step);
          const report = await buildLiveReport();
          send("done", report);
        }
      } catch (err) {
        send("error", err instanceof Error ? err.message : "Unknown error");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
