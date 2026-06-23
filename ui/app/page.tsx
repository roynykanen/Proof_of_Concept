"use client";

import { useState } from "react";
import type { ReportData, Metric, Anomaly, Channel } from "./api/report/route";

type Status = "idle" | "running" | "done" | "error";
type SlackStatus = "idle" | "sending" | "sent" | "error";

const STEPS = ["GA4", "Google Ads", "Meta Ads", "Klaviyo", "CEO narrative"];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ m }: { m: Metric }) {
  const up = m.direction === "up";
  const down = m.direction === "down";
  const good = m.positive;

  const changeColor =
    m.direction === "neutral"
      ? "text-gray-400"
      : good
      ? up ? "text-emerald-600" : "text-red-500"
      : up ? "text-red-500" : "text-emerald-600";

  const arrow = up ? "↑" : down ? "↓" : "";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{m.label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{m.value}</p>
      <div className="flex items-center gap-2 mt-2">
        {m.change && (
          <span className={`text-sm font-semibold ${changeColor}`}>
            {arrow} {m.change}
          </span>
        )}
        {m.prev !== "—" && (
          <span className="text-xs text-gray-400">vs {m.prev}</span>
        )}
      </div>
    </div>
  );
}

function AnomalyCard({ a }: { a: Anomaly }) {
  const styles = {
    "risk-high": {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      label: "Riski — korkea",
    },
    "risk-low": {
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
      label: "Riski — seurattava",
    },
    opportunity: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
      label: "Mahdollisuus",
    },
  }[a.type];

  return (
    <div className={`rounded-xl border p-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
              {styles.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">{a.body}</p>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ c }: { c: Channel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{c.icon}</span>
          <h3 className="font-semibold text-gray-900">{c.name}</h3>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            c.verdict_positive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {c.verdict_positive ? "✓ Positiivinen" : "⚠ Huomio"}
        </span>
      </div>

      <div className="px-6 py-4">
        <p className="text-sm font-medium text-gray-800 mb-2">{c.verdict}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{c.body}</p>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Huomioitavaa: </span>
          {c.note}
        </p>
      </div>
    </div>
  );
}

function ProgressSteps({ steps, status }: { steps: string[]; status: Status }) {
  return (
    <div className="space-y-2 mt-5 pt-5 border-t border-gray-100">
      {STEPS.map((step, i) => {
        const done = steps.length > i;
        const active = steps.length === i && status === "running";
        return (
          <div key={step} className="flex items-center gap-3 text-sm">
            {done ? (
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : active ? (
              <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
            )}
            <span className={done ? "text-gray-700" : active ? "text-blue-600 font-medium" : "text-gray-300"}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(true);
  const [slackUrl, setSlackUrl] = useState("");
  const [slackStatus, setSlackStatus] = useState<SlackStatus>("idle");

  async function sendToSlack() {
    if (!report || !slackUrl) return;
    setSlackStatus("sending");
    const res = await fetch("/api/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report, webhookUrl: slackUrl }),
    });
    setSlackStatus(res.ok ? "sent" : "error");
    if (res.ok) setTimeout(() => setSlackStatus("idle"), 3000);
  }

  async function generate() {
    setStatus("running");
    setSteps([]);
    setReport(null);
    setError("");

    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const eventLine = part.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
        if (!eventLine || !dataLine) continue;
        const event = eventLine.replace("event: ", "").trim();
        const data = JSON.parse(dataLine.replace("data: ", ""));
        if (event === "step") setSteps((s) => [...s, data]);
        if (event === "done") { setReport(data as ReportData); setStatus("done"); }
        if (event === "error") { setError(data); setStatus("error"); }
      }
    }
  }

  function downloadMarkdown() {
    if (!report) return;
    const md = [
      `# Pohjoinen — Kuukausiraportti ${report.period}`,
      `_Generoitu ${report.generated_at}_\n`,
      `## Johdon yhteenveto\n${report.ceo_summary}\n\n**Prioriteetti ensi kuulle:** ${report.ceo_priority}`,
      report.channels.map((c) => `## ${c.name}\n**${c.verdict}**\n\n${c.body}\n\n_${c.note}_`).join("\n\n---\n\n"),
    ].join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pohjoinen-report-${report.period.replace(" ", "-")}.md`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Pohjoinen</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-sm text-gray-500">Report Agent</span>
            </div>
          </div>
          {report && (
            <div className="flex items-center gap-3" data-no-print>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                PDF
              </button>
              <span className="text-gray-200">|</span>
              <button onClick={downloadMarkdown} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Markdown
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Generate panel */}
        {!report && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Kuukausiraportti</h1>
            <p className="text-gray-500 mb-6">
              Pulls from GA4, Google Ads, Meta Ads, and Klaviyo — Claude writes the analysis.
            </p>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setDemo((d) => !d)}>
                <div className={`relative w-10 h-6 rounded-full transition-colors ${demo ? "bg-blue-600" : "bg-gray-200"}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${demo ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-sm text-gray-700">
                  Demo mode <span className="text-gray-400">(no API key needed)</span>
                </span>
              </label>

              <button
                onClick={generate}
                disabled={status === "running"}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                {status === "running" ? "Generating…" : "Generate report →"}
              </button>
            </div>

            {status === "running" && <ProgressSteps steps={steps} status={status} />}
            {status === "error" && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}
          </div>
        )}

        {/* Report */}
        {report && (
          <>
            {/* Report header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kuukausiraportti {report.period}</h1>
                <p className="text-sm text-gray-400 mt-1">Generoitu {report.generated_at}{report.demo ? " · demo" : ""}</p>
              </div>
              <button
                data-no-print
                onClick={() => { setReport(null); setStatus("idle"); setSteps([]); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
              >
                ← Uusi raportti
              </button>
            </div>

            {/* CEO summary */}
            <div className="bg-blue-600 rounded-2xl p-7 text-white shadow-lg" data-print-summary>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-3">Johdon yhteenveto</p>
              <p className="text-lg leading-relaxed font-medium">{report.ceo_summary}</p>
              <div className="mt-5 pt-5 border-t border-blue-500">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Prioriteetti ensi kuulle</p>
                <p className="text-white font-semibold">{report.ceo_priority}</p>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Avainluvut</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-metrics-grid>
                {report.metrics.map((m) => <MetricCard key={m.label} m={m} />)}
              </div>
            </div>

            {/* Anomalies */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Poikkeamat & riskit</h2>
              <div className="space-y-3">
                {report.anomalies.map((a) => <AnomalyCard key={a.title} a={a} />)}
              </div>
            </div>

            {/* Channels */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Kanavat</h2>
              <div className="grid md:grid-cols-2 gap-4" data-channels-grid>
                {report.channels.map((c) => <ChannelCard key={c.name} c={c} />)}
              </div>
            </div>

            {/* Slack */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-no-print>
              <div className="flex items-center gap-2.5 shrink-0">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Send to Slack</span>
              </div>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={(e) => { setSlackUrl(e.target.value); setSlackStatus("idle"); }}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
              <button
                onClick={sendToSlack}
                disabled={!slackUrl || slackStatus === "sending" || slackStatus === "sent"}
                className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                  slackStatus === "sent"
                    ? "bg-emerald-100 text-emerald-700"
                    : slackStatus === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white"
                }`}
              >
                {slackStatus === "sending" ? "Sending…" : slackStatus === "sent" ? "✓ Sent!" : slackStatus === "error" ? "Failed" : "Send"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
