"use client";

import { useEffect, useState } from "react";
import { URGENCY_META } from "@/lib/constants";
import type { PropertyWithLandlord } from "@/lib/types";

function emptyDraft() {
  return { propertyId: "", unit: "", tenant: "", description: "", urgency: "standard7" };
}

export default function ReportPage() {
  const [draft, setDraft] = useState(emptyDraft());
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data: PropertyWithLandlord[]) => {
        setProperties(data);
        if (data.length > 0) setDraft((d) => (d.propertyId ? d : { ...d, propertyId: data[0].id }));
      })
      .catch(() => setError("Couldn't load the property list. Refresh and try again."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.propertyId || !draft.description.trim()) return;
    setError("");
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, contactMethod: "form" }),
    });
    if (!res.ok) {
      setError("Couldn't submit your report. Try again in a moment.");
      return;
    }
    const issue = await res.json();
    setSubmitted(issue.id);
    setDraft(emptyDraft());
  }

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto mb-4 text-xl">&check;</div>
        <h2 className="text-lg font-semibold text-stone-900 mb-2">Your report is on file</h2>
        <p className="text-sm text-stone-500 mb-1">Reference number</p>
        <p className="text-base mb-6 font-mono">{submitted.slice(0, 8)}</p>
        <p className="text-sm text-stone-500 mb-6">Vantrel logs every report the moment it arrives. If this is an emergency &mdash; a leak, no heat, or a lockout &mdash; call the Vantrel emergency line instead of waiting on this form.</p>
        <button onClick={() => setSubmitted(null)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm text-stone-600">Report another issue</button>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <div className="text-lg font-semibold text-slate-900 mb-1">VANTREL</div>
      <h1 className="text-base font-semibold text-stone-900 mb-1 mt-4">Report an issue</h1>
      <p className="text-sm text-stone-500 mb-6">Every report gets a documented record, date, and reference number the moment you submit it.</p>
      <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Property</label>
            <select required value={draft.propertyId} onChange={(e) => setDraft({ ...draft, propertyId: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              {properties.length === 0 && <option value="">Loading…</option>}
              {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Unit</label>
            <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="2B" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-stone-500 mb-1">Your name</label>
          <input value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Optional" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="mb-3">
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
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Submit report</button>
      </form>
    </main>
  );
}
