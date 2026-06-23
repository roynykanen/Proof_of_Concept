"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Status = "idle" | "running" | "done" | "error";

const CHANNELS = ["GA4", "Google Ads", "Meta Ads", "Klaviyo", "CEO narrative"];

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(true);

  async function generate() {
    setStatus("running");
    setSteps([]);
    setReport("");
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
        if (event === "done") { setReport(data); setStatus("done"); }
        if (event === "error") { setError(data); setStatus("error"); }
      }
    }
  }

  function download() {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pohjoinen-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pohjoinen</h1>
            <p className="text-sm text-gray-500 mt-0.5">Performance Report Agent</p>
          </div>
          <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
            Powered by Claude
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Control panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="font-medium text-gray-900 mb-1">Kuukausiraportti</h2>
              <p className="text-sm text-gray-500">
                Pulls from GA4, Google Ads, Meta Ads, and Klaviyo — then Claude writes
                the analysis.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <div
                    onClick={() => setDemo((d) => !d)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      demo ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        demo ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                  <span className="text-gray-700">
                    Demo mode{" "}
                    <span className="text-gray-400">(no API key needed)</span>
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={generate}
              disabled={status === "running"}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {status === "running" ? "Generating…" : "Generate report"}
            </button>
          </div>

          {/* Progress steps */}
          {steps.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
              {CHANNELS.map((ch, i) => {
                const done = steps.length > i;
                const active = steps.length === i && status === "running";
                return (
                  <div key={ch} className="flex items-center gap-2.5 text-sm">
                    {done ? (
                      <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : active ? (
                      <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-200" />
                    )}
                    <span className={done ? "text-gray-700" : active ? "text-blue-600 font-medium" : "text-gray-400"}>
                      {ch}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Report output */}
        {report && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Raportti</span>
              <button
                onClick={download}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download .md
              </button>
            </div>
            <div className="px-8 py-6 prose prose-gray prose-sm max-w-none
              prose-h1:text-xl prose-h1:font-semibold prose-h1:text-gray-900
              prose-h2:text-base prose-h2:font-semibold prose-h2:text-gray-800 prose-h2:mt-8 prose-h2:mb-3
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-strong:text-gray-900
              prose-table:text-sm prose-td:py-2 prose-th:py-2
              prose-li:text-gray-700 prose-li:my-1
              prose-em:text-gray-500 prose-em:not-italic">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
