"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Lightbulb, AlertCircle, Sparkles } from "lucide-react";

type StructuralCheck = {
  section: string;
  status: "complete" | "partial" | "missing";
  detail: string;
};

type AIInsight = {
  category: "gap" | "vague" | "conflict" | "suggestion";
  severity: "high" | "medium" | "low";
  section: string;
  message: string;
};

type ScoringResult = {
  overallScore: number;
  structuralChecks: StructuralCheck[];
  aiInsights: AIInsight[];
};

export function ScoringPanel({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to run analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Run the completeness analysis to check your project requirements for coverage gaps,
          vague criteria, and improvement opportunities.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={runAnalysis} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>
    );
  }

  const complete = result.structuralChecks.filter((c) => c.status === "complete").length;
  const partial = result.structuralChecks.filter((c) => c.status === "partial").length;
  const missing = result.structuralChecks.filter((c) => c.status === "missing").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ScoreRing score={result.overallScore} />
          <div>
            <p className="text-lg font-semibold">{result.overallScore}% Complete</p>
            <p className="text-xs text-gray-400">
              {complete} complete, {partial} partial, {missing} missing
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
          {loading ? "Re-analyzing..." : "Re-run"}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Structural Checks</h3>
        <div className="space-y-2">
          {result.structuralChecks.map((check) => (
            <div
              key={check.section}
              className="flex items-center gap-3 rounded-md border border-gray-800 bg-gray-900 p-3"
            >
              <StatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{check.section}</p>
                <p className="text-xs text-gray-400">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {result.aiInsights.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            AI Recommendations ({result.aiInsights.length})
          </h3>
          <div className="space-y-2">
            {result.aiInsights
              .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
              .map((insight, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-3 ${severityBorder(insight.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    <InsightIcon category={insight.category} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium ${severityText(insight.severity)}`}>
                          {insight.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{insight.section}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${categoryBadge(insight.category)}`}>
                          {insight.category}
                        </span>
                      </div>
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "stroke-green-500" : score >= 40 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <svg width="60" height="60" className="-rotate-90">
      <circle cx="30" cy="30" r={radius} fill="none" stroke="#1f2937" strokeWidth="4" />
      <circle
        cx="30"
        cy="30"
        r={radius}
        fill="none"
        className={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />;
    case "partial":
      return <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />;
    default:
      return <XCircle className="h-5 w-5 shrink-0 text-red-500" />;
  }
}

function InsightIcon({ category }: { category: string }) {
  switch (category) {
    case "gap":
      return <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />;
    case "vague":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />;
    case "conflict":
      return <XCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />;
    default:
      return <Lightbulb className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />;
  }
}

function severityOrder(s: string) {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}

function severityBorder(s: string) {
  return s === "high" ? "border-red-500/30 bg-red-950/10" : s === "medium" ? "border-amber-500/30 bg-amber-950/10" : "border-gray-800";
}

function severityText(s: string) {
  return s === "high" ? "text-red-400" : s === "medium" ? "text-amber-400" : "text-gray-400";
}

function categoryBadge(c: string) {
  switch (c) {
    case "gap": return "bg-red-500/20 text-red-400";
    case "vague": return "bg-amber-500/20 text-amber-400";
    case "conflict": return "bg-red-500/20 text-red-400";
    default: return "bg-blue-500/20 text-blue-400";
  }
}
