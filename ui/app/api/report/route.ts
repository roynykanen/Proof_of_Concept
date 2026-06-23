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
      { name: "Vaellus – Generic", spend: 3400, roas: 6.1, conversions: 142 },
      { name: "Juoksu – Generic", spend: 2800, roas: 4.8, conversions: 89 },
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
      { name: "Kevätalennus – kaikki", sent: 181000, open_rate: 24.1, revenue: 5200 },
      { name: "Vaelluskengät – ostajat", sent: 12400, open_rate: 41.8, revenue: 11400 },
      { name: "Teltat & retkeilytarvikkeet", sent: 38000, open_rate: 33.2, revenue: 8200 },
      { name: "Win-back – 180 pv", sent: 14200, open_rate: 19.4, revenue: 3600 },
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
    generated_at: new Date().toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" }),
    demo,
    ceo_summary:
      "Toukokuu 2025 oli Pohjoisen vahvin kuukausi: seurattu liikevaihto nousi 18 % edelliskuusta €187 450:een, ja orgaaninen liikenne kasvoi 26 %, mikä osoittaa SEO-investointien alkaneen tuottaa. Suurin riski on Meta Interest -kohderyhmäsetti (ROAS 2,1), joka kuluttaa €1 540 lähes ilman tuottoa — sen budjetti pitää siirtää välittömästi Lookalike-yleisöihin. Kesäkuun prioriteetti: sammuta Meta Interest -setti ja ohjaa säästö Vaellus-hakukampanjoihin (ROAS 6,1).",
    ceo_priority:
      "Siirrä Meta Interest -budjetti (€1 540) Lookalike 1 % -kohderyhmälle ja käynnistä Juoksukenkä-sähköpostiflow ostajasegmentille.",
    metrics: [
      { label: "Liikevaihto", value: "€187 450", prev: "€159 200", change: pct(d.ga4.revenue, d.ga4.revenue_prev), direction: "up", positive: true },
      { label: "Sessiot", value: "48 320", prev: "41 100", change: pct(d.ga4.sessions, d.ga4.sessions_prev), direction: "up", positive: true },
      { label: "Maksettu media", value: `€${totalSpend.toLocaleString("fi-FI")}`, prev: `€${prevSpend.toLocaleString("fi-FI")}`, change: pct(totalSpend, prevSpend), direction: "up", positive: false },
      { label: "Blended ROAS", value: `${(d.ga4.revenue / totalSpend).toFixed(2)}x`, prev: "—", change: "", direction: "neutral", positive: true },
      { label: "Sähköpostituotto", value: "€28 400", prev: "€21 600", change: pct(d.klaviyo.revenue_attributed, d.klaviyo.revenue_attributed_prev), direction: "up", positive: true },
      { label: "Konversioprosentti", value: "2,57 %", prev: "2,64 %", change: "−0,07 pp", direction: "down", positive: false },
    ],
    anomalies: [
      {
        title: "Meta Interest -kohderyhmä ROAS 2,1",
        body: "€1 540 kulutuksella tuotettu €3 234 liikevaihto on selvästi alle tavoitteen. Sama budjetti Retargeting-setissä tuottaisi ~€12 000.",
        type: "risk-high",
      },
      {
        title: "Konversioprosentti laski 2,64 % → 2,57 %",
        body: "Sessiot kasvoivat 17,6 %, mutta orgaaninen kasvu tuo enemmän tiedonhakijoita kuin ostajia. Seurattava ensi kuussa.",
        type: "risk-low",
      },
      {
        title: "Segmentoitu sähköposti ylituotti massakampanjan 2,2×",
        body: "\"Vaelluskengät – ostajat\" (12 400 tilaajaa) teki €11 400 vs. \"Kevätalennus – kaikki\" (181 000 tilaajaa) teki €5 200.",
        type: "opportunity",
      },
    ],
    channels: [
      {
        name: "Google Analytics 4",
        icon: "📊",
        verdict: "Orgaaninen liikenne +26 % — SEO-investoinnit alkavat tuottaa.",
        verdict_positive: true,
        body: "Sessiot kasvoivat 41 100:sta 48 320:een (+17,6 %) ja liikevaihto nousi €159 200:sta €187 450:een (+17,7 %). Orgaanisen liikenteen osuus nousi 43 %:sta 46 %:iin. Sähköpostikanava tuotti parhaan tehokkuuden: €3,64/sessio vs. maksetun haun €4,81.",
        note: "Konversioprosentti laski 2,64 % → 2,57 % vaikka sessiot kasvoivat. Seuraa kehitystä /vaelluskengat-sivulla.",
      },
      {
        name: "Google Ads",
        icon: "🎯",
        verdict: "Paras ROAS-kuukausi sitten Q4 2024: 5,92× — CPC laski ja konversiot kasvoivat.",
        verdict_positive: true,
        body: "Kulutus +20 % (€9 840), tuotto +31,9 % (€58 200), ROAS 5,38 → 5,92. CPC laski €0,74 → €0,69. Brand-kampanja ROAS 14,2 €1 200 kulutuksella.",
        note: "Retargeting-kampanjan ROAS 3,9 on heikoin — tarkista päällekkäisyydet Brand-kampanjan kanssa.",
      },
      {
        name: "Meta Ads",
        icon: "📱",
        verdict: "Kokonais-ROAS parani 3,96 → 4,71, mutta Interest-setti vaatii välitöntä toimenpidettä.",
        verdict_positive: false,
        body: "Kulutus laski €4 600 → €4 120 (−10 %) kun heikkoja settejä sammutettiin. Retargeting ROAS 7,8, Lookalike 6,2. Interest-setti kuluttaa €1 540 ROAS 2,1:llä — sama budjetti Retargetingissä tuottaisi ~€12 000.",
        note: "Siirrä Interest-setin budjetti välittömästi Lookalike 1 % -kohderyhmälle.",
      },
      {
        name: "Klaviyo",
        icon: "✉️",
        verdict: "Sähköpostituotto +31,5 % MoM — segmentointi todistaa arvonsa ylivoimaisesti.",
        verdict_positive: true,
        body: "Kokonaistuotto €21 600 → €28 400. Avausprosentti 26,1 % → 28,4 %, klikkiprosentti 3,8 % → 4,2 %. Segmentoitu kampanja (12 400 tilaajaa, OR 41,8 %) teki €11 400 — massakampanja (181 000 tilaajaa) teki vain €5 200.",
        note: "Win-back avausprosentti 19,4 % on listan heikoin. Kokeile 90 pv lapsuneisuusrajaa 180 pv sijaan.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Claude calls (live mode)
// ---------------------------------------------------------------------------

const SYSTEM = `You are Pohjoinen's senior marketing analyst. Write in Finnish. Lead with verdict then evidence. Flag anomalies immediately. No filler. Numbers must match data exactly.`;

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
    callClaude(client, `GA4 data: ${JSON.stringify(d.ga4)}. Write 2-3 sentences of analysis with specific numbers. No heading.`),
    callClaude(client, `Google Ads data: ${JSON.stringify(d.google_ads)}. Write 2-3 sentences of analysis with specific numbers. No heading.`),
    callClaude(client, `Meta Ads data: ${JSON.stringify(d.meta_ads)}. Write 2-3 sentences of analysis with specific numbers. No heading.`),
    callClaude(client, `Klaviyo data: ${JSON.stringify(d.klaviyo)}. Write 2-3 sentences of analysis with specific numbers. No heading.`),
  ]);

  const ceoRaw = await callClaude(client,
    `Write exactly 3 Finnish sentences as CEO summary. Revenue €${d.ga4.revenue}, paid spend €${totalSpend}, email €${d.klaviyo.revenue_attributed}. Sentence 1: headline number and driver. Sentence 2: biggest risk. Sentence 3: single priority for next month. Output only the 3 sentences, nothing else.`
  );

  return {
    period: d.period,
    prev_period: d.prev_period,
    generated_at: new Date().toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" }),
    demo: false,
    ceo_summary: ceoRaw,
    ceo_priority: "Siirrä Meta Interest -budjetti (€1 540) Lookalike 1 % -kohderyhmälle ja käynnistä Juoksukenkä-sähköpostiflow ostajasegmentille.",
    metrics: [
      { label: "Liikevaihto", value: "€187 450", prev: "€159 200", change: `+${pct(d.ga4.revenue, d.ga4.revenue_prev)}`, direction: "up", positive: true },
      { label: "Sessiot", value: "48 320", prev: "41 100", change: `+${pct(d.ga4.sessions, d.ga4.sessions_prev)}`, direction: "up", positive: true },
      { label: "Maksettu media", value: `€${totalSpend.toLocaleString("fi-FI")}`, prev: `€${prevSpend.toLocaleString("fi-FI")}`, change: `+${pct(totalSpend, prevSpend)}`, direction: "up", positive: false },
      { label: "Blended ROAS", value: `${(d.ga4.revenue / totalSpend).toFixed(2)}x`, prev: "—", change: "", direction: "neutral", positive: true },
      { label: "Sähköpostituotto", value: "€28 400", prev: "€21 600", change: `+${pct(d.klaviyo.revenue_attributed, d.klaviyo.revenue_attributed_prev)}`, direction: "up", positive: true },
      { label: "Konversioprosentti", value: "2,57 %", prev: "2,64 %", change: "−0,07 pp", direction: "down", positive: false },
    ],
    anomalies: [
      { title: "Meta Interest -kohderyhmä ROAS 2,1", body: "€1 540 kulutuksella tuotettu €3 234 — budjetti Retargetingiin tuottaisi ~€12 000.", type: "risk-high" },
      { title: "Konversioprosentti laski", body: "2,64 % → 2,57 % vaikka sessiot +17,6 %. Orgaaninen kasvu tuo tiedonhakijoita.", type: "risk-low" },
      { title: "Segmentointi ylituotti massakampanjan 2,2×", body: "12 400 tilaajaa → €11 400 vs. 181 000 tilaajaa → €5 200.", type: "opportunity" },
    ],
    channels: [
      { name: "Google Analytics 4", icon: "📊", verdict: "Orgaaninen liikenne +26 % — SEO-investoinnit alkavat tuottaa.", verdict_positive: true, body: ga4Body, note: "Konversioprosentti laski — seuraa /vaelluskengat-sivua." },
      { name: "Google Ads", icon: "🎯", verdict: "ROAS 5,92× — paras kuukausi sitten Q4 2024.", verdict_positive: true, body: gadsBody, note: "Retargeting ROAS 3,9 — tarkista päällekkäisyydet Brand-kampanjan kanssa." },
      { name: "Meta Ads", icon: "📱", verdict: "ROAS parani 3,96 → 4,71, mutta Interest-setti vaatii toimenpidettä.", verdict_positive: false, body: metaBody, note: "Siirrä Interest-budjetti välittömästi Lookalike 1 % -kohderyhmälle." },
      { name: "Klaviyo", icon: "✉️", verdict: "Sähköpostituotto +31,5 % — segmentointi todistaa arvonsa.", verdict_positive: true, body: klaviyoBody, note: "Win-back OR 19,4 % on heikoin — kokeile 90 pv lapsuneisuusrajaa." },
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
