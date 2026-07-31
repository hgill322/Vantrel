"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Issue } from "@prisma/client";
import { STATUS_ORDER, STATUS_META, URGENCY_META, fmtDateTime, type StatusKey } from "@/lib/constants";
import type { UnitWithProperty } from "@/lib/types";

function emptyDraft() {
  return { description: "", urgency: "standard7" };
}

export default function PortalClient({ unit, initialIssues }: { unit: UnitWithProperty; initialIssues: Issue[] }) {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeIssue = issues.find((i) => i.id === activeId) || null;

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Couldn't submit your report. Try again in a moment.");
      return;
    }
    const issue = await res.json();
    setIssues([issue, ...issues]);
    setDraft(emptyDraft());
    setShowForm(false);
  }

  return (
    <main className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight">VANTREL</div>
            <div className="text-sm text-white/60 mt-0.5">{unit.property.address}{unit.label ? ` · Unit ${unit.label}` : ""}</div>
          </div>
          <button onClick={signOut} className="text-xs text-white/60 hover:text-white transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-base font-semibold text-stone-900">My issues</h1>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">
            + Report an issue
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {issues.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-10">No issues on file yet.</div>
          ) : (
            issues.map((i) => (
              <button key={i.id} onClick={() => setActiveId(i.id)} className="w-full text-left px-4 py-3 flex items-start justify-between gap-4 hover:bg-stone-50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm text-stone-900 line-clamp-1">{i.description}</div>
                  <div className="text-[11px] text-stone-400 mt-1 font-mono">{fmtDateTime(i.loggedAt)} · {STATUS_META[i.status as StatusKey].short}</div>
                </div>
                <span className={"shrink-0 text-[10px] px-1.5 py-0.5 rounded border " + URGENCY_META[i.urgency as keyof typeof URGENCY_META].chip}>
                  {URGENCY_META[i.urgency as keyof typeof URGENCY_META].label}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-xl border border-stone-200 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-900">Report an issue</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 mb-1">What's going on?</label>
              <textarea required value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} placeholder="Describe the issue" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 mb-1">How urgent is this?</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(URGENCY_META).map(([k, v]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setDraft({ ...draft, urgency: k })}
                    className={"text-left border rounded-lg px-3 py-2 text-xs transition-colors " + (draft.urgency === k ? "border-slate-900 bg-stone-50" : "border-stone-200")}
                  >
                    <div className="font-medium text-stone-800">{v.label}</div>
                    <div className="text-stone-400 mt-0.5">{v.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </form>
        </div>
      )}

      {activeIssue && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={() => setActiveId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white h-full w-full max-w-md overflow-y-auto p-5 border-l border-stone-200">
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs text-stone-400 font-mono">{activeIssue.id.slice(0, 8)}</div>
              <button onClick={() => setActiveId(null)} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
            </div>

            <div className="flex items-center gap-1 mb-5">
              {STATUS_ORDER.map((s, i) => {
                const idx = STATUS_ORDER.indexOf(activeIssue.status as StatusKey);
                return (
                  <div key={s} className="flex-1">
                    <div className={"h-1.5 rounded-full " + (i <= idx ? "bg-slate-900" : "bg-stone-200")} />
                    <div className={"text-[10px] mt-1 " + (i <= idx ? "text-stone-700" : "text-stone-400")}>{STATUS_META[s].short}</div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium text-stone-500 mb-1">Description</div>
              <p className="text-sm text-stone-700">{activeIssue.description}</p>
            </div>

            {activeIssue.status === "closed" && activeIssue.resolutionSummary && (
              <div className="border-t border-stone-200 pt-4 mb-4">
                <div className="text-xs font-medium text-stone-500 mb-1">Resolution</div>
                <p className="text-sm text-stone-600">{activeIssue.resolutionSummary}</p>
              </div>
            )}

            <div className="border-t border-stone-200 pt-4 text-xs text-stone-400 space-y-1 font-mono">
              <div>Logged: {fmtDateTime(activeIssue.loggedAt)}</div>
              {activeIssue.closedAt && <div>Closed: {fmtDateTime(activeIssue.closedAt)}</div>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
