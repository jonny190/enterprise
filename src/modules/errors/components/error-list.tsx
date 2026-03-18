"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createErrorLog, updateErrorStatus, deleteErrorLog, addErrorNote, addErrorPR } from "../actions";
import { type ErrorStatus } from "@prisma/client";
import { toast } from "sonner";
import { Plus, Bug, CheckCircle2, Search, X, Sparkles, GitPullRequest, Code, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";

type ErrorNote = {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  user: { name: string };
};

type ErrorPRItem = {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  addedBy: { name: string };
};

type ErrorItem = {
  id: string;
  title: string;
  stackTrace: string;
  context: string;
  source: string;
  status: ErrorStatus;
  aiAnalysis: string;
  suggestedFix: string;
  prUrl: string;
  createdAt: string;
  createdBy: { name: string };
  notes: ErrorNote[];
  prs: ErrorPRItem[];
};

const STATUS_STYLES: Record<ErrorStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-red-500/20 text-red-400" },
  investigating: { label: "Investigating", className: "bg-amber-500/20 text-amber-400" },
  resolved: { label: "Resolved", className: "bg-green-500/20 text-green-400" },
  dismissed: { label: "Dismissed", className: "bg-gray-700 text-gray-400" },
};

export function ErrorList({
  projectId,
  errors,
  apiKey,
  hasGithubToken,
  hasGitRepo,
}: {
  projectId: string;
  errors: ErrorItem[];
  apiKey: string;
  hasGithubToken: boolean;
  hasGitRepo: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [creatingPr, setCreatingPr] = useState<string | null>(null);
  const [showSnippet, setShowSnippet] = useState(false);
  const [filter, setFilter] = useState<ErrorStatus | "all">("all");

  const [title, setTitle] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = filter === "all" ? errors : errors.filter((e) => e.status === filter);

  const counts = {
    all: errors.length,
    open: errors.filter((e) => e.status === "open").length,
    investigating: errors.filter((e) => e.status === "investigating").length,
    resolved: errors.filter((e) => e.status === "resolved").length,
  };

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createErrorLog(projectId, { title, stackTrace, context, source });
      setTitle("");
      setStackTrace("");
      setContext("");
      setSource("");
      setAdding(false);
      toast.success("Error logged");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze(errorId: string) {
    setAnalyzing(errorId);
    try {
      const res = await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      toast.success("Analysis complete");
      router.refresh();
    } catch {
      toast.error("Failed to analyze error");
    } finally {
      setAnalyzing(null);
    }
  }

  async function handleCreatePR(errorId: string) {
    setCreatingPr(errorId);
    try {
      const res = await fetch("/api/errors/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("PR created");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create PR");
    } finally {
      setCreatingPr(null);
    }
  }

  async function handleStatusChange(id: string, status: ErrorStatus) {
    await updateErrorStatus(id, status);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this error log?")) return;
    await deleteErrorLog(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Errors</h1>
          <span className="text-sm text-gray-500">
            {counts.open} open, {counts.investigating} investigating
          </span>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Error
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1">
        {(["all", "open", "investigating", "resolved", "dismissed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {f === "all" ? `All (${counts.all})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Create form */}
      {adding && (
        <div className="rounded-lg border border-gray-800 p-4 space-y-3">
          <Input
            placeholder="Error title (e.g. 401 Unauthorized on POST /api/accounts)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Stack trace (paste the full error output)"
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
          <Textarea
            placeholder="Context (what were you doing when this happened?)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
          />
          <Input
            placeholder="Source (e.g. browser console, server logs, API response)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!title.trim() || saving}>
              {saving ? "Saving..." : "Log Error"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Error list */}
      {filtered.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {errors.length === 0
            ? "No errors logged yet. Click \"Log Error\" to record an issue."
            : "No errors match this filter."}
        </div>
      )}

      {filtered.map((error) => {
        const expanded = expandedId === error.id;
        const style = STATUS_STYLES[error.status];

        return (
          <div key={error.id} className="rounded-lg border border-gray-800">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30"
              onClick={() => setExpandedId(expanded ? null : error.id)}
            >
              <Bug className={`h-5 w-5 shrink-0 ${
                error.status === "resolved" ? "text-green-500" :
                error.status === "investigating" ? "text-amber-500" : "text-red-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{error.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
                    {style.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  by {error.createdBy.name} &middot; {new Date(error.createdAt).toLocaleString()}
                  {error.source && <> &middot; {error.source}</>}
                </div>
              </div>
              {error.aiAnalysis && (
                <span title="AI analyzed"><Sparkles className="h-4 w-4 text-blue-400 shrink-0" /></span>
              )}
            </div>

            {expanded && (
              <div className="border-t border-gray-800 p-4 space-y-4">
                {error.stackTrace && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Stack Trace</h4>
                    <pre className="rounded bg-gray-950 p-3 text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
                      {error.stackTrace}
                    </pre>
                  </div>
                )}
                {error.context && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Context</h4>
                    <p className="text-sm text-gray-300">{error.context}</p>
                  </div>
                )}

                {error.aiAnalysis ? (
                  <div>
                    <h4 className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Analysis
                    </h4>
                    <div className="rounded border border-blue-900/30 bg-blue-950/10 p-4 text-sm prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                      <ReactMarkdown>{error.aiAnalysis}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {error.prUrl ? (
                        <a
                          href={error.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-green-900/50 bg-green-950/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-950/40"
                        >
                          <GitPullRequest className="h-3.5 w-3.5" />
                          View PR
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : hasGithubToken && hasGitRepo ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreatePR(error.id)}
                          disabled={creatingPr === error.id}
                        >
                          <GitPullRequest className="mr-2 h-4 w-4" />
                          {creatingPr === error.id ? "Creating PR..." : "Create Fix PR"}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyze(error.id)}
                        disabled={analyzing === error.id}
                      >
                        {analyzing === error.id ? "Re-analyzing..." : "Re-analyze"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze(error.id)}
                    disabled={analyzing === error.id}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {analyzing === error.id ? "Analyzing..." : "Analyze with AI"}
                  </Button>
                )}

                {/* Linked PRs */}
                {(error.prs.length > 0 || error.prUrl) && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Linked Pull Requests</h4>
                    <div className="space-y-1">
                      {error.prUrl && (
                        <a href={error.prUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300">
                          <GitPullRequest className="h-3 w-3" /> AI-generated fix PR <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {error.prs.map((pr) => (
                        <a key={pr.id} href={pr.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                          <GitPullRequest className="h-3 w-3" /> {pr.title || pr.url} <ExternalLink className="h-3 w-3" />
                          <span className="text-gray-600">by {pr.addedBy.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add PR form */}
                <AddPRForm errorId={error.id} />

                {/* Notes thread */}
                <NotesThread errorId={error.id} notes={error.notes} />

                {/* Resolve with note */}
                {error.status !== "resolved" && (
                  <ResolveForm errorId={error.id} />
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-500">Status:</span>
                  {(["open", "investigating", "resolved", "dismissed"] as ErrorStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(error.id, s)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        error.status === s
                          ? STATUS_STYLES[s].className + " ring-1 ring-white/20"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {s === "resolved" && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                      {STATUS_STYLES[s].label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-400"
                    onClick={() => handleDelete(error.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Integration snippet */}
      <div className="mt-8 border-t border-gray-800 pt-6">
        <button
          onClick={() => setShowSnippet(!showSnippet)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
        >
          <Code className="h-4 w-4" />
          {showSnippet ? "Hide" : "Show"} integration snippet
        </button>
        {showSnippet && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-400">
              Send errors from your application using a simple POST request. Use the API key below to authenticate.
            </p>
            <div className="rounded bg-gray-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">API Key</span>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("API key copied"); }}
                >
                  Copy
                </button>
              </div>
              <code className="text-xs text-gray-300 font-mono break-all">{apiKey}</code>
            </div>
            <div className="rounded bg-gray-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">JavaScript / Node.js</span>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => { navigator.clipboard.writeText(jsSnippet(apiKey)); toast.success("Snippet copied"); }}
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{jsSnippet(apiKey)}</pre>
            </div>
            <div className="rounded bg-gray-950 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">cURL</span>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300"
                  onClick={() => { navigator.clipboard.writeText(curlSnippet(apiKey)); toast.success("Snippet copied"); }}
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{curlSnippet(apiKey)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPRForm({ errorId }: { errorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!url.trim()) return;
    setSaving(true);
    await addErrorPR(errorId, url.trim(), title.trim());
    setUrl("");
    setTitle("");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> Link a PR
      </button>
    );
  }

  return (
    <div className="rounded-md border border-gray-800 p-3 space-y-2">
      <Input placeholder="PR URL (e.g. https://github.com/org/repo/pull/123)" value={url} onChange={(e) => setUrl(e.target.value)} className="text-xs" />
      <Input placeholder="Description (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="text-xs" />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={!url.trim() || saving}>{saving ? "Adding..." : "Link PR"}</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function NotesThread({ errorId, notes }: { errorId: string; notes: ErrorNote[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim()) return;
    setSaving(true);
    await addErrorNote(errorId, content.trim(), "comment");
    setContent("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="border-t border-gray-800 pt-3">
      <h4 className="text-xs font-medium text-gray-400 mb-2">Notes ({notes.length})</h4>
      {notes.length > 0 && (
        <div className="space-y-2 mb-3">
          {notes.map((note) => (
            <div key={note.id} className={`rounded-md p-2.5 text-sm ${
              note.type === "resolution"
                ? "border border-green-900/30 bg-green-950/10"
                : "border border-gray-800 bg-gray-900/50"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-300">{note.user.name}</span>
                <span className="text-[10px] text-gray-600">{new Date(note.createdAt).toLocaleString()}</span>
                {note.type === "resolution" && (
                  <span className="rounded-full bg-green-500/20 text-green-400 px-1.5 py-0.5 text-[10px] font-medium">Resolution</span>
                )}
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="text-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={!content.trim() || saving} className="shrink-0 self-end">
          {saving ? "..." : "Add"}
        </Button>
      </div>
    </div>
  );
}

function ResolveForm({ errorId }: { errorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleResolve() {
    setSaving(true);
    await addErrorNote(errorId, note.trim() || "Marked as resolved", "resolution");
    setNote("");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
        Resolve with Note
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-green-900/30 bg-green-950/10 p-3 space-y-2">
      <Textarea
        placeholder="What fixed this? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleResolve} disabled={saving}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {saving ? "Resolving..." : "Resolve"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function jsSnippet(apiKey: string): string {
  return `fetch("https://enterprise.coria.app/api/errors/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}"
  },
  body: JSON.stringify({
    title: error.message,
    stackTrace: error.stack,
    context: "What the user was doing",
    source: "browser"
  })
});`;
}

function curlSnippet(apiKey: string): string {
  return `curl -X POST https://enterprise.coria.app/api/errors/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{"title":"Error message","stackTrace":"...","source":"api"}'`;
}
