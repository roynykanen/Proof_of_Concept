import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
// Demo responses (identical to what Claude produces for this dataset)
// ---------------------------------------------------------------------------

const DEMO_SECTIONS = {
  ga4: `## Google Analytics 4 / Verkkosivusto
**Verdict:** Toukokuu kasvoi merkittävästi — orgaaninen liikenne +26 % on selkein merkki SEO-investointien vaikutuksesta.

Sessiot kasvoivat 41 100:sta 48 320:een (+17,6 %) ja liikevaihto nousi €159 200:sta €187 450:een (+17,7 %). Orgaaninen liikenne nousi 17 800:sta 22 400:een — orgaanisen osuus kaikista sessioista nousi 43 %:sta 46 %:iin. Sähköpostikanava tuotti parhaan tehokkuuden: €28 400 liikevaihdolla vain 7 800 sessiolla (€3,64/sessio vs. maksetun haun €4,81).

**Huomioitavaa:** Konversioprosentti laski 2,64 % → 2,57 % vaikka sessiot kasvoivat. Orgaaninen kasvu tuo enemmän tiedonhakijoita kuin ostajia — seuraa kehitystä /vaelluskengat-laskeutumissivulla.`,

  google_ads: `## Google Ads
**Verdict:** Paras ROAS-kuukausi sitten Q4 2024: 5,92x — kasvu johtuu sekä CPC-laskusta että paremmasta konversioasteesta.

Kulutus kasvoi €8 200:sta €9 840:een (+20 %), mutta tuotto nousi €44 100:sta €58 200:een (+31,9 %), eli ROAS parani 5,38:sta 5,92:een. Klikkikohtainen hinta laski €0,74 → €0,69. Brand-kampanja dominoi: ROAS 14,2 €1 200 kulutuksella.

**Huomioitavaa:** Retargeting-kampanjan ROAS 3,9 on selvästi heikoin — tarkista yleisöjen päällekkäisyydet Brand-kampanjan kanssa, ne saattavat syödä toistensa budjettia.`,

  meta_ads: `## Meta Ads
**Verdict:** Kokonaistuotto parani (ROAS 4,71 vs. edellinen 3,96), mutta Interest-kohderyhmäsetti vaatii välitöntä toimenpidettä.

Kulutus laski €4 600:sta €4 120:een (−10 %) kun heikkoja creative-settejä sammutettiin — oikea suunta. Retargeting-setti tuottaa ROAS 7,8:lla, Lookalike 6,2:lla. Mutta Interest-kohderyhmäsetti kuluttaa €1 540 ROAS 2,1:llä — sama budjetti Retargeting-setissä tuottaisi ~€12 000.

**Huomioitavaa:** Siirrä Interest-setin budjetti välittömästi Lookalike 1 % -kohderyhmälle. Testaa uusi creative ennen uuden Interest-setin käynnistämistä.`,

  klaviyo: `## Klaviyo / Sähköpostimarkkinointi
**Verdict:** Sähköpostituotto +31,5 % MoM — segmentoidut kampanjat todistavat arvonsa ylivoimaisesti massakampanjaan verrattuna.

Kokonaistuotto nousi €21 600:sta €28 400:een. Avausprosentti parani 26,1 % → 28,4 %, klikkiprosentti 3,8 % → 4,2 %. Tärkein havainto: "Vaelluskengät – ostajat" (12 400 tilaajaa, open rate 41,8 %) teki €11 400 — massakampanja "Kevätalennus – kaikki" (181 000 tilaajaa) teki vain €5 200. Pienempi, osuvampi lähetys tuotti 2,2× enemmän.

**Huomioitavaa:** Win-back-kampanjan avausprosentti 19,4 % on listan heikoin. Kokeile 90 päivän lapsuneisuusrajaa 180 päivän sijaan ja tarjoa konkreettinen etu.`,

  ceo: `## Johdon yhteenveto

Toukokuu 2025 oli Pohjoisen vahvin kuukausi: seurattu liikevaihto nousi 18 % edelliskuusta €187 450:een, ja orgaaninen liikenne kasvoi 26 %, mikä osoittaa SEO-investointien alkaneen tuottaa. Suurin riski on Meta Interest -kohderyhmäsetti (ROAS 2,1), joka kuluttaa €1 540 lähes ilman tuottoa — sen budjetti pitää siirtää välittömästi Lookalike-yleisöihin. Kesäkuun prioriteetti: sammuta Meta Interest -setti, ohjaa säästö Vaellus-hakukampanjoihin (ROAS 6,1), ja käynnistä Juoksukenkä-kategoriaan kohdennettu sähköpostiflow ostajille.

**Prioriteetti ensi kuulle:** Siirrä Meta Interest -budjetti (€1 540) Lookalike 1 % -kohderyhmälle ja käynnistä Juoksukenkä-sähköpostiflow ostajasegmentille.`,

  anomalies: `## Poikkeamat & riskit

- **Meta Interest -kohderyhmä ROAS 2,1** — €1 540 kulutuksella tuotettu €3 234 liikevaihto on selvästi alle tavoitteen. Sama budjetti Retargeting-setissä tuottaisi ~€12 000. *(Riski — toimenpide tarvitaan välittömästi)*

- **Konversioprosentti laski** 2,64 % → 2,57 % vaikka sessiot kasvoivat 17,6 %. Orgaaninen kasvu tuo enemmän tiedonhakijoita kuin ostajia. *(Riski — seurattava)*

- **Sähköpostin segmentoitu kampanja ylituotti massakampanjan** 2,2×: 12 400 tilaajaa tuotti €11 400 vs. 181 000 tilaajaa tuotti €5 200. Tämä vahvistaa segmentointistrategian arvon. *(Mahdollisuus — skaalaa)*`,
};

// ---------------------------------------------------------------------------
// Claude calls
// ---------------------------------------------------------------------------

const SYSTEM = `You are Pohjoinen's senior marketing analyst writing the monthly board report.
Rules: write in Finnish, lead with the verdict then evidence, flag anomalies immediately, no filler phrases, numbers must match data exactly. CEO narrative: exactly 3 sentences, start with the headline number.`;

async function callClaude(client: Anthropic, prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as { text: string }).text.trim();
}

// ---------------------------------------------------------------------------
// Streaming POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { demo } = await req.json();
  const d = MOCK;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: string) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        let ga4: string, gads: string, meta: string, klaviyo: string, ceo: string, anomalies: string;

        if (demo) {
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
          send("step", "Analysing GA4...");
          await delay(700);
          ga4 = DEMO_SECTIONS.ga4;

          send("step", "Analysing Google Ads...");
          await delay(700);
          gads = DEMO_SECTIONS.google_ads;

          send("step", "Analysing Meta Ads...");
          await delay(700);
          meta = DEMO_SECTIONS.meta_ads;

          send("step", "Analysing Klaviyo...");
          await delay(700);
          klaviyo = DEMO_SECTIONS.klaviyo;

          send("step", "Writing CEO narrative & anomaly scan...");
          await delay(900);
          ceo = DEMO_SECTIONS.ceo;
          anomalies = DEMO_SECTIONS.anomalies;
        } else {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
          const client = new Anthropic({ apiKey });

          send("step", "Analysing GA4...");
          ga4 = await callClaude(client, `Write performance commentary for Google Analytics 4.\n\nData: ${JSON.stringify(d.ga4)}\nPrev: sessions ${d.ga4.sessions_prev}, revenue €${d.ga4.revenue_prev}\n\nFormat:\n## Google Analytics 4 / Verkkosivusto\n**Verdict:** [one sentence]\n[2-3 sentences with numbers]\n**Huomioitavaa:** [anomaly or risk]`);

          send("step", "Analysing Google Ads...");
          gads = await callClaude(client, `Write performance commentary for Google Ads.\n\nData: ${JSON.stringify(d.google_ads)}\nPrev: spend €${d.google_ads.spend_prev}, ROAS ${d.google_ads.roas_prev}\n\nFormat:\n## Google Ads\n**Verdict:** [one sentence]\n[2-3 sentences with numbers]\n**Huomioitavaa:** [anomaly or risk]`);

          send("step", "Analysing Meta Ads...");
          meta = await callClaude(client, `Write performance commentary for Meta Ads.\n\nData: ${JSON.stringify(d.meta_ads)}\nPrev: spend €${d.meta_ads.spend_prev}, ROAS ${d.meta_ads.roas_prev}\n\nFormat:\n## Meta Ads\n**Verdict:** [one sentence]\n[2-3 sentences with numbers]\n**Huomioitavaa:** [anomaly or risk]`);

          send("step", "Analysing Klaviyo...");
          klaviyo = await callClaude(client, `Write performance commentary for Klaviyo email marketing.\n\nData: ${JSON.stringify(d.klaviyo)}\nPrev: revenue €${d.klaviyo.revenue_attributed_prev}, open rate ${d.klaviyo.avg_open_rate_prev}%\n\nFormat:\n## Klaviyo / Sähköpostimarkkinointi\n**Verdict:** [one sentence]\n[2-3 sentences with numbers]\n**Huomioitavaa:** [anomaly or risk]`);

          send("step", "Writing CEO narrative & anomaly scan...");
          [ceo, anomalies] = await Promise.all([
            callClaude(client, `Write CEO executive summary.\nPeriod: ${d.period}\nRevenue: €${d.ga4.revenue}\nPaid spend: €${d.google_ads.spend + d.meta_ads.spend}\nEmail revenue: €${d.klaviyo.revenue_attributed}\nChannel summaries:\n${[ga4, gads, meta, klaviyo].join("\n\n")}\n\nFormat:\n## Johdon yhteenveto\n[Exactly 3 sentences]\n**Prioriteetti ensi kuulle:** [one action]`),
            callClaude(client, `Scan for anomalies in this data: ${JSON.stringify(d)}\nList up to 3, each with numbers and risk/opportunity label.\n## Poikkeamat & riskit`),
          ]);
        }

        // Build metrics table
        const totalSpend = d.google_ads.spend + d.meta_ads.spend;
        const prevSpend = d.google_ads.spend_prev + d.meta_ads.spend_prev;
        const blendedRoas = (d.ga4.revenue / totalSpend).toFixed(2);
        const pct = (a: number, b: number) => `${(((a - b) / b) * 100).toFixed(1)}%`;
        const pp = (a: number, b: number) => `${(a - b).toFixed(2)}pp`;

        const table = `## Avainluvut

| Mittari | ${d.period} | ${d.prev_period} | Muutos |
|---------|------------|-----------------|--------|
| Liikevaihto | €${d.ga4.revenue.toLocaleString("fi-FI")} | €${d.ga4.revenue_prev.toLocaleString("fi-FI")} | +${pct(d.ga4.revenue, d.ga4.revenue_prev)} |
| Sessiot | ${d.ga4.sessions.toLocaleString("fi-FI")} | ${d.ga4.sessions_prev.toLocaleString("fi-FI")} | +${pct(d.ga4.sessions, d.ga4.sessions_prev)} |
| Maksettu media | €${totalSpend.toLocaleString("fi-FI")} | €${prevSpend.toLocaleString("fi-FI")} | +${pct(totalSpend, prevSpend)} |
| Blended ROAS | ${blendedRoas}x | — | — |
| Sähköpostituotto | €${d.klaviyo.revenue_attributed.toLocaleString("fi-FI")} | €${d.klaviyo.revenue_attributed_prev.toLocaleString("fi-FI")} | +${pct(d.klaviyo.revenue_attributed, d.klaviyo.revenue_attributed_prev)} |
| Konversioprosentti | ${d.ga4.conversion_rate}% | ${d.ga4.conversion_rate_prev}% | ${pp(d.ga4.conversion_rate, d.ga4.conversion_rate_prev)} |`;

        const now = new Date().toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" });
        const report = `# Pohjoinen — Kuukausiraportti ${d.period}
_Generoitu ${now} | Pohjoinen Performance Report Agent${demo ? " (demo)" : ""}_

---

${ceo}

---

${table}

---

${anomalies}

---

${ga4}

---

${gads}

---

${meta}

---

${klaviyo}

---

_Raportti generoitu automaattisesti. Tarkista luvut ennen jakamista._`;

        send("done", report);
      } catch (err) {
        send("error", err instanceof Error ? err.message : "Unknown error");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
