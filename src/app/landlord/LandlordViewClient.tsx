"use client";

import { useMemo, useState } from "react";
import {
  STATUS_ORDER,
  STATUS_META,
  URGENCY_META,
  SERVICE_META,
  AUTONOMY_META,
  REQUEST_TYPE_META,
  REQUEST_STATUS_META,
  CONTACT_META,
  money,
  fmtDateTime,
  type AutonomyLevelKey,
} from "@/lib/constants";
import type { IssueWithProperty, PropertyWithLandlord, PropertyRequestWithRelations, ServiceRequestWithProperty, Unit } from "@/lib/types";
import type { Role } from "@/lib/auth";

function emptyServiceDraft(properties: PropertyWithLandlord[]) {
  return { propertyId: properties[0]?.id ?? "", type: "lawn", notes: "" };
}

function emptyAddPropertyDraft() {
  return { address: "", unit: "", note: "" };
}

function emptyUnitDraft() {
  return { label: "", tenantName: "", tenantPhone: "", tenantEmail: "" };
}

const REPORT_TONES: Record<string, string> = {
  blue: "bg-blue-50 border-blue-100 text-blue-900",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-900",
  amber: "bg-amber-50 border-amber-100 text-amber-900",
  stone: "bg-stone-100 border-stone-200 text-stone-900",
};

export default function LandlordViewClient({
  initialIssues,
  initialRequests,
  initialProperties,
  initialPropertyRequests,
  role,
}: {
  initialIssues: IssueWithProperty[];
  initialRequests: ServiceRequestWithProperty[];
  initialProperties: PropertyWithLandlord[];
  initialPropertyRequests: PropertyRequestWithRelations[];
  role: Role;
}) {
  const [issues] = useState<IssueWithProperty[]>(initialIssues);
  const [requests, setRequests] = useState<ServiceRequestWithProperty[]>(initialRequests);
  const [properties, setProperties] = useState<PropertyWithLandlord[]>(initialProperties);
  const [propertyRequests, setPropertyRequests] = useState<PropertyRequestWithRelations[]>(initialPropertyRequests);

  const [selectedLandlord, setSelectedLandlord] = useState("all");
  const [selected, setSelected] = useState("all");
  const [showRequest, setShowRequest] = useState(false);
  const [draft, setDraft] = useState(emptyServiceDraft(initialProperties));
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addPropertyDraft, setAddPropertyDraft] = useState(emptyAddPropertyDraft());
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const landlords = useMemo(() => {
    const map = new Map(properties.map((p) => [p.landlordId, p.landlord]));
    return Array.from(map.values());
  }, [properties]);

  const propertiesInScope = useMemo(
    () => (selectedLandlord === "all" ? properties : properties.filter((p) => p.landlordId === selectedLandlord)),
    [properties, selectedLandlord]
  );

  const scoped = useMemo(() => (selected === "all" ? issues.filter((i) => propertiesInScope.some((p) => p.id === i.propertyId)) : issues.filter((i) => i.propertyId === selected)), [issues, selected, propertiesInScope]);
  const scopedRequests = useMemo(() => (selected === "all" ? requests.filter((r) => propertiesInScope.some((p) => p.id === r.propertyId)) : requests.filter((r) => r.propertyId === selected)), [requests, selected, propertiesInScope]);
  const activeIssue = issues.find((i) => i.id === activeIssueId) || null;

  const summary = useMemo(() => {
    const open = scoped.filter((i) => i.status !== "closed").length;
    const closed = scoped.filter((i) => i.status === "closed");
    const spent = closed.reduce((sum, i) => sum + (i.finalCost || 0), 0);
    return { open, closedCount: closed.length, spent, total: scoped.length };
  }, [scoped]);

  function pendingRequestFor(propertyId: string, type: string) {
    return propertyRequests.find((r) => r.propertyId === propertyId && r.type === type && r.status === "pending") || null;
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.propertyId) return;
    setError("");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      setError("Couldn't submit that request.");
      return;
    }
    const req = await res.json();
    setRequests([req, ...requests]);
    setDraft(emptyServiceDraft(properties));
    setShowRequest(false);
  }

  async function staffSetAutonomy(propertyId: string, autonomyLevel: AutonomyLevelKey) {
    setProperties(properties.map((p) => (p.id === propertyId ? { ...p, autonomyLevel } : p)));
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autonomyLevel }),
    });
    if (!res.ok) setError("Couldn't save that setting.");
  }

  async function staffArchive(propertyId: string) {
    if (!confirm("Archive this property? It will drop off active lists but its issue history stays intact.")) return;
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      setError("Couldn't archive that property.");
      return;
    }
    setProperties(properties.filter((p) => p.id !== propertyId));
  }

  async function submitPropertyRequest(body: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/property-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't submit that request.");
      return false;
    }
    const created = await res.json();
    setPropertyRequests([created, ...propertyRequests]);
    return true;
  }

  async function requestAutonomyChange(propertyId: string, requestedAutonomyLevel: AutonomyLevelKey) {
    await submitPropertyRequest({ type: "change_autonomy", propertyId, requestedAutonomyLevel });
  }

  async function requestRemoval(propertyId: string) {
    if (!confirm("Request removal of this property? Staff will review before it's archived.")) return;
    await submitPropertyRequest({ type: "remove_property", propertyId });
  }

  async function submitAddPropertyRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!addPropertyDraft.address.trim()) return;
    const ok = await submitPropertyRequest({ type: "add_property", ...addPropertyDraft });
    if (ok) {
      setAddPropertyDraft(emptyAddPropertyDraft());
      setShowAddProperty(false);
    }
  }

  async function addUnit(propertyId: string, unitDraft: ReturnType<typeof emptyUnitDraft>) {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...unitDraft }),
    });
    if (!res.ok) {
      setError("Couldn't add that unit.");
      return;
    }
    const unit = await res.json();
    setProperties(properties.map((p) => (p.id === propertyId ? { ...p, units: [...p.units, unit] } : p)));
  }

  async function removeUnit(propertyId: string, unitId: string) {
    const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't remove that unit.");
      return;
    }
    setProperties(properties.map((p) => (p.id === propertyId ? { ...p, units: p.units.filter((u) => u.id !== unitId) } : p)));
  }

  const myPendingAddRequests = propertyRequests.filter((r) => r.type === "add_property" && r.status === "pending");

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          {role === "staff" && landlords.length > 1 && (
            <select
              value={selectedLandlord}
              onChange={(e) => {
                setSelectedLandlord(e.target.value);
                setSelected("all");
              }}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All landlords</option>
              {landlords.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All properties</option>
            {propertiesInScope.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {role === "landlord" && (
            <button onClick={() => setShowAddProperty(true)} className="px-4 py-2 rounded-lg border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
              + Request new property
            </button>
          )}
          <button onClick={() => setShowRequest(true)} className="px-4 py-2 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">
            + Request a service
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <ReportStat label="Open issues" value={summary.open} tone="blue" />
        <ReportStat label="Closed this period" value={summary.closedCount} tone="emerald" />
        <ReportStat label="Total spent" value={money(summary.spent)} tone="amber" />
        <ReportStat label="Total on file" value={summary.total} tone="stone" />
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-stone-700 mb-1">Properties</h2>
        <p className="text-xs text-stone-400 mb-3">
          {role === "staff"
            ? "Full service lets Vantrel pick a contractor and book the call directly. Record only means Vantrel documents everything but the landlord handles booking."
            : "Full service lets Vantrel pick a contractor and book the call directly. Record only means Vantrel documents everything but you handle booking. Changing this or adding/removing a property requires staff approval."}
        </p>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {propertiesInScope.map((p) => (
            <PropertyRow
              key={p.id}
              property={p}
              role={role}
              pendingAutonomyRequest={pendingRequestFor(p.id, "change_autonomy")}
              pendingRemoveRequest={pendingRequestFor(p.id, "remove_property")}
              onStaffSetAutonomy={staffSetAutonomy}
              onStaffArchive={staffArchive}
              onRequestAutonomyChange={requestAutonomyChange}
              onRequestRemoval={requestRemoval}
              onAddUnit={addUnit}
              onRemoveUnit={removeUnit}
            />
          ))}
        </div>
      </div>

      {role === "landlord" && (myPendingAddRequests.length > 0 || propertyRequests.length > 0) && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-stone-700 mb-3">My requests</h2>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
            {propertyRequests.length === 0 ? (
              <div className="text-sm text-stone-400 text-center py-10">No requests yet.</div>
            ) : (
              propertyRequests.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900">{REQUEST_TYPE_META[r.type as keyof typeof REQUEST_TYPE_META]?.label ?? r.type}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {r.type === "add_property" ? r.address : r.property?.address}
                      {r.type === "change_autonomy" ? ` → ${AUTONOMY_META[r.requestedAutonomyLevel as AutonomyLevelKey]?.label ?? r.requestedAutonomyLevel}` : ""}
                    </div>
                    {r.reviewNote && <div className="text-xs text-stone-400 mt-0.5">Staff note: {r.reviewNote}</div>}
                  </div>
                  <span className={"shrink-0 text-[10px] px-1.5 py-0.5 rounded border " + REQUEST_STATUS_META[r.status as keyof typeof REQUEST_STATUS_META].chip}>
                    {REQUEST_STATUS_META[r.status as keyof typeof REQUEST_STATUS_META].label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-stone-700 mb-3">Issue history</h2>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {scoped.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-10">No issues on file.</div>
          ) : (
            scoped.map((i) => (
              <button key={i.id} onClick={() => setActiveIssueId(i.id)} className="w-full text-left px-4 py-3 flex items-start justify-between gap-4 hover:bg-stone-50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">{i.property.address}{i.unit ? ` · Unit ${i.unit}` : ""}</div>
                  <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">{i.description}</div>
                  <div className="text-[11px] text-stone-400 mt-1 font-mono">
                    {fmtDateTime(i.loggedAt)} · {STATUS_META[i.status as keyof typeof STATUS_META].short}{i.contractor ? ` · ${i.contractor}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={"text-[10px] px-1.5 py-0.5 rounded border " + URGENCY_META[i.urgency as keyof typeof URGENCY_META].chip}>{URGENCY_META[i.urgency as keyof typeof URGENCY_META].label}</span>
                  {i.status === "closed" && <div className="text-xs text-stone-600 mt-1 font-mono">{money(i.finalCost)}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-stone-700 mb-3">Service requests</h2>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 shadow-sm">
          {scopedRequests.length === 0 ? (
            <div className="text-sm text-stone-400 text-center py-10">No requests yet.</div>
          ) : (
            scopedRequests.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-900">{SERVICE_META[r.type as keyof typeof SERVICE_META]}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-stone-50 text-stone-500 border-stone-200">Submitted</span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{r.property.address}{r.notes ? ` — ${r.notes}` : ""}</div>
                <div className="text-[11px] text-stone-400 mt-1 font-mono">{fmtDateTime(r.requestedAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {showRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowRequest(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitRequest} className="bg-white rounded-xl border border-stone-200 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-900">Request a service</h2>
              <button type="button" onClick={() => setShowRequest(false)} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-500 mb-1">Property</label>
              <select required value={draft.propertyId} onChange={(e) => setDraft({ ...draft, propertyId: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
                {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-500 mb-1">Service</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white">
                {Object.entries(SERVICE_META).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} placeholder="Optional" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Submit request</button>
          </form>
        </div>
      )}

      {showAddProperty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowAddProperty(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitAddPropertyRequest} className="bg-white rounded-xl border border-stone-200 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-900">Request a new property</h2>
              <button type="button" onClick={() => setShowAddProperty(false)} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
            </div>
            <p className="text-xs text-stone-400 mb-3">Staff will review this before the property is added to your account.</p>
            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
              <input required value={addPropertyDraft.address} onChange={(e) => setAddPropertyDraft({ ...addPropertyDraft, address: e.target.value })} placeholder="123 Elm St" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-stone-500 mb-1">Unit (if you own a single unit within a building)</label>
              <input value={addPropertyDraft.unit} onChange={(e) => setAddPropertyDraft({ ...addPropertyDraft, unit: e.target.value })} placeholder="Optional" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 mb-1">Note to staff</label>
              <textarea value={addPropertyDraft.note} onChange={(e) => setAddPropertyDraft({ ...addPropertyDraft, note: e.target.value })} rows={2} placeholder="Optional" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Submit request</button>
          </form>
        </div>
      )}

      {activeIssue && <IssueDetailModal issue={activeIssue} onClose={() => setActiveIssueId(null)} />}
    </main>
  );
}

function ReportStat({ label, value, tone = "stone" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={"border rounded-xl p-4 shadow-sm " + REPORT_TONES[tone]}>
      <div className="text-xl font-semibold font-mono">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function PropertyRow({
  property,
  role,
  pendingAutonomyRequest,
  pendingRemoveRequest,
  onStaffSetAutonomy,
  onStaffArchive,
  onRequestAutonomyChange,
  onRequestRemoval,
  onAddUnit,
  onRemoveUnit,
}: {
  property: PropertyWithLandlord;
  role: Role;
  pendingAutonomyRequest: PropertyRequestWithRelations | null;
  pendingRemoveRequest: PropertyRequestWithRelations | null;
  onStaffSetAutonomy: (propertyId: string, level: AutonomyLevelKey) => void;
  onStaffArchive: (propertyId: string) => void;
  onRequestAutonomyChange: (propertyId: string, level: AutonomyLevelKey) => void;
  onRequestRemoval: (propertyId: string) => void;
  onAddUnit: (propertyId: string, draft: ReturnType<typeof emptyUnitDraft>) => void;
  onRemoveUnit: (propertyId: string, unitId: string) => void;
}) {
  const [showUnits, setShowUnits] = useState(false);
  const otherLevel: AutonomyLevelKey = property.autonomyLevel === "full_service" ? "record_only" : "full_service";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-stone-900 truncate">{property.address}{property.unit ? ` · Unit ${property.unit}` : ""}</div>
          {role === "staff" && <div className="text-xs text-stone-400 mt-0.5">{property.landlord.name}</div>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {role === "staff" ? (
            <>
              <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
                {(Object.keys(AUTONOMY_META) as AutonomyLevelKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => onStaffSetAutonomy(property.id, k)}
                    className={"px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (property.autonomyLevel === k ? "bg-slate-900 text-white" : "text-stone-500 hover:bg-stone-200")}
                  >
                    {AUTONOMY_META[k].label}
                  </button>
                ))}
              </div>
              <button onClick={() => onStaffArchive(property.id)} className="text-xs text-red-600 hover:text-red-800">Archive</button>
            </>
          ) : pendingAutonomyRequest ? (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              Pending: requested {AUTONOMY_META[pendingAutonomyRequest.requestedAutonomyLevel as AutonomyLevelKey]?.label}
            </span>
          ) : (
            <>
              <span className={"text-[10px] px-1.5 py-0.5 rounded border " + AUTONOMY_META[property.autonomyLevel as AutonomyLevelKey].chip}>
                {AUTONOMY_META[property.autonomyLevel as AutonomyLevelKey].label}
              </span>
              <button onClick={() => onRequestAutonomyChange(property.id, otherLevel)} className="text-xs text-stone-500 hover:text-stone-800 underline">
                Request {AUTONOMY_META[otherLevel].label}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => setShowUnits(!showUnits)} className="text-xs text-stone-500 hover:text-stone-800">
          {showUnits ? "Hide units" : `Units (${property.units.length})`}
        </button>
        {role === "landlord" &&
          (pendingRemoveRequest ? (
            <span className="text-xs text-amber-700">Removal pending approval</span>
          ) : (
            <button onClick={() => onRequestRemoval(property.id)} className="text-xs text-red-600 hover:text-red-800">
              Request removal
            </button>
          ))}
      </div>

      {showUnits && <UnitsPanel property={property} onAdd={onAddUnit} onRemove={onRemoveUnit} />}
    </div>
  );
}

function UnitsPanel({
  property,
  onAdd,
  onRemove,
}: {
  property: PropertyWithLandlord;
  onAdd: (propertyId: string, draft: ReturnType<typeof emptyUnitDraft>) => void;
  onRemove: (propertyId: string, unitId: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(emptyUnitDraft());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim()) return;
    onAdd(property.id, draft);
    setDraft(emptyUnitDraft());
    setShowAdd(false);
  }

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      {property.units.length === 0 && !showAdd && <div className="text-xs text-stone-400 mb-2">No units on file.</div>}
      {property.units.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {property.units.map((u: Unit) => (
            <div key={u.id} className="flex items-center justify-between text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
              <div>
                <span className="font-medium text-stone-700">Unit {u.label}</span>
                {u.tenantName && <span className="text-stone-500"> · {u.tenantName}</span>}
                {u.tenantPhone && <span className="text-stone-400"> · {u.tenantPhone}</span>}
                {u.tenantEmail && <span className="text-stone-400"> · {u.tenantEmail}</span>}
              </div>
              <button onClick={() => onRemove(property.id, u.id)} className="text-stone-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <form onSubmit={submit} className="grid grid-cols-2 gap-2 bg-stone-50 rounded-lg p-3">
          <input required value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Unit label (2B)" className="border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
          <input value={draft.tenantName} onChange={(e) => setDraft({ ...draft, tenantName: e.target.value })} placeholder="Tenant name" className="border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
          <input value={draft.tenantPhone} onChange={(e) => setDraft({ ...draft, tenantPhone: e.target.value })} placeholder="Phone" className="border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
          <input value={draft.tenantEmail} onChange={(e) => setDraft({ ...draft, tenantEmail: e.target.value })} placeholder="Email" className="border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-xs">Add unit</button>
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-600">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowAdd(true)} className="text-xs text-stone-500 hover:text-stone-800 underline">+ Add unit</button>
      )}
    </div>
  );
}

function IssueDetailModal({ issue, onClose }: { issue: IssueWithProperty; onClose: () => void }) {
  const idx = STATUS_ORDER.indexOf(issue.status as (typeof STATUS_ORDER)[number]);
  const am = AUTONOMY_META[issue.property.autonomyLevel as AutonomyLevelKey];
  const matchedUnit = issue.unit ? issue.property.units.find((u) => u.label.toLowerCase() === issue.unit.toLowerCase()) : undefined;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white h-full w-full max-w-md overflow-y-auto p-5 border-l border-stone-200">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-xs text-stone-400 font-mono">{issue.id.slice(0, 8)}</div>
            <h2 className="text-lg font-semibold text-stone-900">{issue.property.address}{issue.unit ? ` · Unit ${issue.unit}` : ""}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-sm">Close</button>
        </div>
        <div className="mb-2">
          <span className={"text-[10px] px-1.5 py-0.5 rounded border " + am.chip}>{am.label}</span>
        </div>
        {issue.tenant && <div className="text-sm text-stone-500 mb-1">{issue.tenant} · {CONTACT_META[issue.contactMethod as keyof typeof CONTACT_META]}</div>}
        {matchedUnit && (matchedUnit.tenantPhone || matchedUnit.tenantEmail) && (
          <div className="text-xs text-stone-400 mb-4">On file for this unit: {[matchedUnit.tenantPhone, matchedUnit.tenantEmail].filter(Boolean).join(" · ")}</div>
        )}

        <div className="flex items-center gap-1 mb-5 mt-4">
          {STATUS_ORDER.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={"h-1.5 rounded-full " + (i <= idx ? "bg-slate-900" : "bg-stone-200")} />
              <div className={"text-[10px] mt-1 " + (i <= idx ? "text-stone-700" : "text-stone-400")}>{STATUS_META[s].short}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-xs font-medium text-stone-500 mb-1">Urgency</div>
          <span className={"text-xs px-2 py-1 rounded border " + URGENCY_META[issue.urgency as keyof typeof URGENCY_META].chip}>{URGENCY_META[issue.urgency as keyof typeof URGENCY_META].label}</span>
        </div>

        <div className="mb-4">
          <div className="text-xs font-medium text-stone-500 mb-1">Description</div>
          <p className="text-sm text-stone-700">{issue.description}</p>
        </div>

        {(issue.contractor || issue.quoteCost || issue.coordinationNotes) && (
          <div className="border-t border-stone-200 pt-4 mb-4">
            <div className="text-xs font-medium text-stone-500 mb-2">Coordination</div>
            {issue.contractor && <div className="text-sm text-stone-700 mb-1">Contractor: {issue.contractor}</div>}
            {issue.quoteCost != null && <div className="text-sm text-stone-700 mb-1">Quoted: {money(issue.quoteCost)}</div>}
            {issue.coordinationNotes && <p className="text-sm text-stone-600">{issue.coordinationNotes}</p>}
          </div>
        )}

        {issue.status === "closed" && (
          <div className="border-t border-stone-200 pt-4 mb-4">
            <div className="text-xs font-medium text-stone-500 mb-2">Resolution</div>
            {issue.resolutionSummary && <p className="text-sm text-stone-600 mb-1">{issue.resolutionSummary}</p>}
            <div className="text-sm text-stone-700 font-mono">{money(issue.finalCost)}</div>
          </div>
        )}

        <div className="border-t border-stone-200 pt-4 text-xs text-stone-400 space-y-1 font-mono">
          <div>Logged: {fmtDateTime(issue.loggedAt)}</div>
          {issue.closedAt && <div>Closed: {fmtDateTime(issue.closedAt)}</div>}
        </div>
      </div>
    </div>
  );
}
