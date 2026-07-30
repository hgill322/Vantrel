"use client";

import { useState } from "react";
import { REQUEST_TYPE_META, REQUEST_STATUS_META, AUTONOMY_META, fmtDateTime, type AutonomyLevelKey } from "@/lib/constants";
import type { PropertyRequestWithRelations } from "@/lib/types";

export default function RequestsClient({ initialRequests }: { initialRequests: PropertyRequestWithRelations[] }) {
  const [requests, setRequests] = useState<PropertyRequestWithRelations[]>(initialRequests);
  const [error, setError] = useState("");

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  async function review(id: string, status: "approved" | "denied") {
    setError("");
    const reviewNote = status === "denied" ? window.prompt("Optional note for the landlord:") ?? "" : "";
    const res = await fetch(`/api/property-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't update that request.");
      return;
    }
    const updated = await res.json();
    setRequests(requests.map((r) => (r.id === id ? updated : r)));
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-1">Property requests</h1>
      <p className="text-sm text-stone-500 mb-6">Landlord-submitted changes waiting on your approval.</p>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-stone-700 mb-3">Pending ({pending.length})</h2>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {pending.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-10">Nothing waiting on you.</div>
          ) : (
            pending.map((r) => <RequestRow key={r.id} request={r} onApprove={() => review(r.id, "approved")} onDeny={() => review(r.id, "denied")} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-stone-700 mb-3">History</h2>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {resolved.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-10">No reviewed requests yet.</div>
          ) : (
            resolved.map((r) => <RequestRow key={r.id} request={r} />)
          )}
        </div>
      </div>
    </main>
  );
}

function RequestRow({ request, onApprove, onDeny }: { request: PropertyRequestWithRelations; onApprove?: () => void; onDeny?: () => void }) {
  const typeMeta = REQUEST_TYPE_META[request.type as keyof typeof REQUEST_TYPE_META];
  const statusMeta = REQUEST_STATUS_META[request.status as keyof typeof REQUEST_STATUS_META];

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-stone-900">{typeMeta?.label ?? request.type}</div>
        <div className="text-xs text-stone-500 mt-0.5">
          {request.landlord.name} · {request.type === "add_property" ? `${request.address}${request.unit ? ` · Unit ${request.unit}` : ""}` : request.property?.address}
          {request.type === "change_autonomy" && ` → ${AUTONOMY_META[request.requestedAutonomyLevel as AutonomyLevelKey]?.label ?? request.requestedAutonomyLevel}`}
        </div>
        {request.note && <div className="text-xs text-stone-400 mt-1">"{request.note}"</div>}
        {request.reviewNote && <div className="text-xs text-stone-400 mt-1">Staff note: {request.reviewNote}</div>}
        <div className="text-[11px] text-stone-400 mt-1 font-mono">{fmtDateTime(request.createdAt)}</div>
      </div>
      <div className="text-right shrink-0">
        {onApprove && onDeny ? (
          <div className="flex gap-2">
            <button onClick={onDeny} className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600 hover:bg-stone-50">Deny</button>
            <button onClick={onApprove} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800">Approve</button>
          </div>
        ) : (
          <span className={"text-[10px] px-1.5 py-0.5 rounded border " + statusMeta.chip}>{statusMeta.label}</span>
        )}
      </div>
    </div>
  );
}
