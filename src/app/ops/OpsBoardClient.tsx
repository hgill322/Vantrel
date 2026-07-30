"use client";

import { useMemo, useState } from "react";
import {
  STATUS_ORDER,
  STATUS_META,
  URGENCY_META,
  CONTACT_META,
  AUTONOMY_META,
  ageLabel,
  fmtDateTime,
  type StatusKey,
} from "@/lib/constants";
import type { IssueWithProperty, PropertyWithLandlord } from "@/lib/types";

function emptyDraft(properties: PropertyWithLandlord[]) {
  return { propertyId: properties[0]?.id ?? "", unit: "", tenant: "", contactMethod: "phone", description: "", urgency: "standard7" };
}

export default function OpsBoardClient({ initialIssues, properties }: { initialIssues: IssueWithProperty[]; properties: PropertyWithLandlord[] }) {
  const [issues, setIssues] = useState<IssueWithProperty[]>(initialIssues);
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft(properties));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const activeIssue = issues.find((i) => i.id === activeId) || null;

  const filtered = useMemo(() => {
    const list = statusFilter === "all" ? issues : issues.filter((i) => i.status === statusFilter);
    return [...list].sort((a, b) => {
      const ur = URGENCY_META[a.urgency as keyof typeof URGENCY_META].rank - URGENCY_META[b.urgency as keyof typeof URGENCY_META].rank;
      if (ur !== 0) return ur;
      return new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
    });
  }, [issues, statusFilter]);

  function columnsFor(list: IssueWithProperty[]) {
    const cols: Record<string, IssueWithProperty[]> = {};
    STATUS_ORDER.forEach((s) => (cols[s] = []));
    list.forEach((i) => cols[i.status].push(i));
    return cols;
  }
  const cols = columnsFor(filtered);

  async function submitIntake(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.propertyId || !draft.description.trim()) return;
    setError("");
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      setError("Couldn't log the issue. Try again.");
      return;
    }
    const issue = await res.json();
    setIssues([issue, ...issues]);
    setDraft(emptyDraft(properties));
    setShowForm(false);
    setActiveId(issue.id);
  }

  async function updateIssue(id: string, patch: Record<string, unknown>) {
    setIssues(issues.map((i) => (i.id === id ? { ...i, ...patch } as IssueWithProperty : i)));
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) setError("Couldn't save that change.");
  }

  function advanceStatus(issue: IssueWithProperty) {
    const idx = STATUS_ORDER.indexOf(issue.status as StatusKey);
    if (idx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[idx + 1];
    const patch: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "closed") patch.closedAt = new Date().toISOString();
    updateIssue(issue.id, patch);
  }

  function regressStatus(issue: IssueWithProperty) {
    const idx = STATUS_ORDER.indexOf(issue.status as StatusKey);
    if (idx <= 0) return;
    const prevStatus = STATUS_ORDER[idx - 1];
    const patch: Record<string, unknown> = { status: prevStatus };
    if (issue.status === "closed") patch.closedAt = null;
    updateIssue(issue.id, patch);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
          <FilterTab active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</FilterTab>
          {STATUS_ORDER.map((s) => (
            <FilterTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_META[s].short}</FilterTab>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">
          + Log issue
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {statusFilter === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STATUS_ORDER.map((s) => <Column key={s} statusKey={s} issues={cols[s]} onSelect={setActiveId} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full text-stone-400 text-sm py-16 text-center">Nothing here.</div>
          ) : filtered.map((i) => <IssueCard key={i.id} issue={i} onSelect={setActiveId} />)}
        </div>
      )}

      {showForm && <IntakeModal draft={draft} setDraft={setDraft} properties={properties} onSubmit={submitIntake} onClose={() => setShowForm(false)} />}
      {activeIssue && (
        <DetailDrawer
          issue={activeIssue}
          onClose={() => setActiveId(null)}
          onUpdate={(patch) => updateIssue(activeIssue.id, patch)}
          onAdvance={() => advanceStatus(activeIssue)}
          onRegress={() => regressStatus(activeIssue)}
        />
      )}
    </main>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"px-3 py-1.5 rounded-md text-sm transition-colors " + (active ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-100")}>
      {children}
    </button>
  );
}

function Column({ statusKey, issues, onSelect }: { statusKey: StatusKey; issues: IssueWithProperty[]; onSelect: (id: string) => void }) {
  const meta = STATUS_META[statusKey];
  return (
    <div className={"border rounded-xl p-3 min-h-[200px] " + meta.panel}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={"w-2 h-2 rounded-full " + meta.dot} />
          <div className="text-sm font-medium text-stone-700">{meta.short}</div>
        </div>
        <div className="text-xs text-stone-400 tabular-nums font-mono">{issues.length}</div>
      </div>
      <div className="space-y-2">
        {issues.length === 0 ? (
          <div className="text-xs text-stone-400 px-1 py-4 text-center">Empty</div>
        ) : issues.map((i) => <IssueCard key={i.id} issue={i} onSelect={onSelect} compact />)}
      </div>
    </div>
  );
}

function IssueCard({ issue, onSelect, compact }: { issue: IssueWithProperty; onSelect: (id: string) => void; compact?: boolean }) {
  const um = URGENCY_META[issue.urgency as keyof typeof URGENCY_META];
  const am = AUTONOMY_META[issue.property.autonomyLevel as keyof typeof AUTONOMY_META];
  return (
    <button onClick={() => onSelect(issue.id)} className="w-full text-left bg-white border border-stone-200 rounded-lg p-3 shadow-sm hover:border-stone-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="font-medium text-sm text-stone-900 truncate">{issue.property.address}{issue.unit ? ` \u00b7 Unit ${issue.unit}` : ""}</div>
        <span className={"shrink-0 text-[10px] px-1.5 py-0.5 rounded border " + um.chip}>{um.label}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={"text-[10px] px-1.5 py-0.5 rounded border " + am.chip}>{am.label}</span>
      </div>
      {issue.tenant && <div className="text-xs text-stone-500 mb-1">{issue.tenant}</div>}
      {!compact && <div className="text-xs text-stone-600 mb-2 line-clamp-2">{issue.description}</div>}
      <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
        <span>{issue.id.slice(0, 8)}</span>
        <span>{ageLabel(issue.loggedAt)}</span>
      </div>
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-stone-500 mb-1">{children}</label>;
}

function IntakeModal({ draft, setDraft, properties, onSubmit, onClose }: { draft: any; setDraft: (d: any) => void; properties: PropertyWithLandlord[]; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft({ ...draft, [k]: e.target.value });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="bg-white rounded-xl border border-stone-200 w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-900">Log a new issue</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <FieldLabel>Property</FieldLabel>
            <select required value={draft.propertyId} onChange={set("propertyId")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input value={draft.unit} onChange={set("unit")} placeholder="2B" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mb-3">
          <FieldLabel>Tenant name</FieldLabel>
          <input value={draft.tenant} onChange={set("tenant")} placeholder="Optional" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <FieldLabel>Contact method</FieldLabel>
            <select value={draft.contactMethod} onChange={set("contactMethod")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              {Object.entries(CONTACT_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Urgency</FieldLabel>
            <select value={draft.urgency} onChange={set("urgency")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
              {Object.entries(URGENCY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <FieldLabel>Description</FieldLabel>
          <textarea required value={draft.description} onChange={set("description")} rows={3} placeholder="What did the tenant report?" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Log issue</button>
      </form>
    </div>
  );
}

function DetailDrawer({ issue, onClose, onUpdate, onAdvance, onRegress }: {
  issue: IssueWithProperty;
  onClose: () => void;
  onUpdate: (patch: Record<string, unknown>) => void;
  onAdvance: () => void;
  onRegress: () => void;
}) {
  const idx = STATUS_ORDER.indexOf(issue.status as StatusKey);
  const am = AUTONOMY_META[issue.property.autonomyLevel as keyof typeof AUTONOMY_META];
  const matchedUnit = issue.unit ? issue.property.units.find((u) => u.label.toLowerCase() === issue.unit.toLowerCase()) : undefined;
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white h-full w-full max-w-md overflow-y-auto p-5 border-l border-stone-200">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-xs text-stone-400 font-mono">{issue.id.slice(0, 8)}</div>
            <h2 className="text-lg font-semibold text-stone-900">{issue.property.address}{issue.unit ? ` \u00b7 Unit ${issue.unit}` : ""}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
        </div>
        <div className="mb-2">
          <span className={"text-[10px] px-1.5 py-0.5 rounded border " + am.chip}>{am.label}</span>
          <span className="text-xs text-stone-400 ml-2">{am.blurb}</span>
        </div>
        {issue.tenant && <div className="text-sm text-stone-500 mb-1">{issue.tenant} &middot; {CONTACT_META[issue.contactMethod as keyof typeof CONTACT_META]}</div>}
        {matchedUnit && (matchedUnit.tenantPhone || matchedUnit.tenantEmail) && (
          <div className="text-xs text-stone-400 mb-4">On file for this unit: {[matchedUnit.tenantPhone, matchedUnit.tenantEmail].filter(Boolean).join(" \u00b7 ")}</div>
        )}

        <div className="flex items-center gap-1 mb-5">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={"h-1.5 rounded-full " + (i <= idx ? "bg-slate-900" : "bg-stone-200")} />
              <div className={"text-[10px] mt-1 " + (i <= idx ? "text-stone-700" : "text-stone-400")}>{STATUS_META[s].short}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={onRegress} disabled={idx === 0} className="flex-1 py-1.5 rounded-lg border border-stone-300 text-sm text-stone-600 disabled:opacity-30">&larr; Back</button>
          <button onClick={onAdvance} disabled={idx === STATUS_ORDER.length - 1} className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-30">Advance &rarr;</button>
        </div>

        <div className="mb-4">
          <FieldLabel>Urgency</FieldLabel>
          <select value={issue.urgency} onChange={(e) => onUpdate({ urgency: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
            {Object.entries(URGENCY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <FieldLabel>Description</FieldLabel>
          <textarea value={issue.description} onChange={(e) => onUpdate({ description: e.target.value })} rows={2} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="border-t border-stone-200 pt-4 mb-4">
          <div className="text-xs font-medium text-stone-500 mb-2">Coordinate & dispatch</div>
          <div className="mb-3">
            <FieldLabel>Contractor</FieldLabel>
            <input value={issue.contractor} onChange={(e) => onUpdate({ contractor: e.target.value })} placeholder="Not yet assigned" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="mb-3">
            <FieldLabel>Quoted cost ($)</FieldLabel>
            <input value={issue.quoteCost ?? ""} onChange={(e) => onUpdate({ quoteCost: e.target.value })} placeholder="0.00" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <FieldLabel>Coordination notes</FieldLabel>
            <textarea value={issue.coordinationNotes} onChange={(e) => onUpdate({ coordinationNotes: e.target.value })} rows={2} placeholder="Contractor scheduled, tenant informed, etc." className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="border-t border-stone-200 pt-4 mb-4">
          <div className="text-xs font-medium text-stone-500 mb-2">Close & report</div>
          <div className="mb-3">
            <FieldLabel>Resolution summary</FieldLabel>
            <textarea value={issue.resolutionSummary} onChange={(e) => onUpdate({ resolutionSummary: e.target.value })} rows={2} placeholder="What was done" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <FieldLabel>Final cost ($)</FieldLabel>
            <input value={issue.finalCost ?? ""} onChange={(e) => onUpdate({ finalCost: e.target.value })} placeholder="0.00" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
        </div>

        <div className="border-t border-stone-200 pt-4 text-xs text-stone-400 space-y-1 font-mono">
          <div>Logged: {fmtDateTime(issue.loggedAt)}</div>
          {issue.closedAt && <div>Closed: {fmtDateTime(issue.closedAt)}</div>}
        </div>
      </div>
    </div>
  );
}
