import { NextRequest, NextResponse } from "next/server";
import type { ReportData } from "../report/route";

export async function POST(req: NextRequest) {
  const { report, webhookUrl }: { report: ReportData; webhookUrl: string } = await req.json();

  if (!webhookUrl?.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ error: "Invalid Slack webhook URL" }, { status: 400 });
  }

  const anomalyEmoji: Record<string, string> = {
    "risk-high": "🔴",
    "risk-low": "🟡",
    opportunity: "🟢",
  };

  const metricLines = report.metrics
    .map((m) => {
      const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
      const change = m.change ? ` ${arrow} ${m.change}` : "";
      return `• *${m.label}:* ${m.value}${change}`;
    })
    .join("\n");

  const anomalyLines = report.anomalies
    .map((a) => `${anomalyEmoji[a.type]} *${a.title}* — ${a.body}`)
    .join("\n");

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📊 Pohjoinen — Monthly Report ${report.period}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated ${report.generated_at}${report.demo ? " · demo" : ""}`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Executive Summary*\n${report.ceo_summary}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎯 *Priority for next month*\n${report.ceo_priority}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key Metrics*\n${metricLines}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Anomalies & Risks*\n${anomalyLines}`,
      },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Pohjoinen Performance Report Agent · <https://github.com/roynykanen/Proof_of_Concept|GitHub>",
        },
      ],
    },
  ];

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Slack error: ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
