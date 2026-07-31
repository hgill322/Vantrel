"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLAN_META, type AutonomyLevelKey } from "@/lib/constants";
import type { PropertyDraft, UnitDraft } from "@/lib/types";

const STEPS = ["Account", "Properties", "Plan", "Review"] as const;

function emptyUnit(): UnitDraft {
  return { label: "", tenantName: "", tenantPhone: "", tenantEmail: "" };
}

function emptyProperty(): PropertyDraft {
  return { address: "", unit: "", units: [] };
}

export default function SignupClient({ initialPlan }: { initialPlan: AutonomyLevelKey | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [account, setAccount] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [properties, setProperties] = useState<PropertyDraft[]>([emptyProperty()]);
  const [planKey, setPlanKey] = useState<AutonomyLevelKey>(initialPlan ?? "record_only");

  function updateProperty(idx: number, patch: Partial<PropertyDraft>) {
    setProperties(properties.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addProperty() {
    setProperties([...properties, emptyProperty()]);
  }

  function removeProperty(idx: number) {
    setProperties(properties.filter((_, i) => i !== idx));
  }

  function addUnit(propIdx: number) {
    updateProperty(propIdx, { units: [...properties[propIdx].units, emptyUnit()] });
  }

  function updateUnit(propIdx: number, unitIdx: number, patch: Partial<UnitDraft>) {
    const units = properties[propIdx].units.map((u, i) => (i === unitIdx ? { ...u, ...patch } : u));
    updateProperty(propIdx, { units });
  }

  function removeUnit(propIdx: number, unitIdx: number) {
    updateProperty(propIdx, { units: properties[propIdx].units.filter((_, i) => i !== unitIdx) });
  }

  function validateStep(s: number): string {
    if (s === 0) {
      if (!account.name.trim() || !account.email.trim() || !account.phone.trim() || !account.address.trim() || !account.password) {
        return "Name, email, phone, address, and password are all required.";
      }
      if (account.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (s === 1) {
      const withAddress = properties.filter((p) => p.address.trim());
      if (withAddress.length === 0) return "Add at least one property.";
      for (const p of withAddress) {
        for (const u of p.units) {
          if (!u.label.trim() || !u.tenantName.trim() || !u.tenantPhone.trim() || !u.tenantEmail.trim()) {
            return "Every unit you add needs a label, tenant name, phone, and email — or remove it if you don't have that yet.";
          }
        }
      }
    }
    return "";
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep(step + 1);
  }

  function back() {
    setError("");
    setStep(step - 1);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/signup-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...account,
        planKey,
        properties: properties.filter((p) => p.address.trim()),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto mb-4 text-xl">&check;</div>
        <h2 className="text-lg font-semibold text-stone-900 mb-2">Your application is in</h2>
        <p className="text-sm text-stone-500 mb-6">
          Staff will review your account and property details and get back to you. You'll be able to log in
          once it's approved.
        </p>
        <Link href="/" className="px-4 py-2 rounded-lg border border-stone-300 text-sm text-stone-600">Back to home</Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/" className="text-lg font-semibold text-slate-900 mb-1 inline-block">VANTREL</Link>
      <h1 className="text-base font-semibold text-stone-900 mb-1 mt-4">Sign up as a landlord</h1>
      <p className="text-sm text-stone-500 mb-6">Tell us about you, your properties, and how hands-on you want us to be.</p>

      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={"h-1.5 rounded-full " + (i <= step ? "bg-slate-900" : "bg-stone-200")} />
            <div className={"text-[11px] mt-1 " + (i <= step ? "text-stone-700" : "text-stone-400")}>{s}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5">
        {step === 0 && <AccountStep account={account} setAccount={setAccount} />}
        {step === 1 && (
          <PropertiesStep
            properties={properties}
            onUpdateProperty={updateProperty}
            onAddProperty={addProperty}
            onRemoveProperty={removeProperty}
            onAddUnit={addUnit}
            onUpdateUnit={updateUnit}
            onRemoveUnit={removeUnit}
          />
        )}
        {step === 2 && <PlanStep planKey={planKey} setPlanKey={setPlanKey} />}
        {step === 3 && <ReviewStep account={account} properties={properties} planKey={planKey} />}

        {error && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-2 mt-6">
          {step > 0 && (
            <button onClick={back} className="flex-1 py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600">Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium">Continue</button>
          ) : (
            <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-stone-500 mb-1">{children}</label>;
}

function AccountStep({ account, setAccount }: { account: any; setAccount: (a: any) => void }) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setAccount({ ...account, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Name</FieldLabel>
        <input required value={account.name} onChange={set("name")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <FieldLabel>Email</FieldLabel>
        <input required type="email" value={account.email} onChange={set("email")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <FieldLabel>Password</FieldLabel>
        <input required type="password" value={account.password} onChange={set("password")} placeholder="At least 8 characters" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <FieldLabel>Phone</FieldLabel>
        <input required value={account.phone} onChange={set("phone")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <FieldLabel>Your mailing address</FieldLabel>
        <input required value={account.address} onChange={set("address")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
    </div>
  );
}

function PropertiesStep({
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
  onAddUnit,
  onUpdateUnit,
  onRemoveUnit,
}: {
  properties: PropertyDraft[];
  onUpdateProperty: (idx: number, patch: Partial<PropertyDraft>) => void;
  onAddProperty: () => void;
  onRemoveProperty: (idx: number) => void;
  onAddUnit: (propIdx: number) => void;
  onUpdateUnit: (propIdx: number, unitIdx: number, patch: Partial<UnitDraft>) => void;
  onRemoveUnit: (propIdx: number, unitIdx: number) => void;
}) {
  return (
    <div className="space-y-4">
      {properties.map((p, propIdx) => (
        <div key={propIdx} className="border border-stone-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-stone-500">Property {propIdx + 1}</div>
            {properties.length > 1 && (
              <button onClick={() => onRemoveProperty(propIdx)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              value={p.address}
              onChange={(e) => onUpdateProperty(propIdx, { address: e.target.value })}
              placeholder="Address"
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={p.unit}
              onChange={(e) => onUpdateProperty(propIdx, { unit: e.target.value })}
              placeholder="Unit (if you own one unit in a building)"
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="text-[11px] font-medium text-stone-400 mb-1.5">Units &amp; tenants (skip entirely if you don't have this yet — but if you add one, every field is required)</div>
          <div className="space-y-1.5 mb-2">
            {p.units.map((u, unitIdx) => (
              <div key={unitIdx} className="grid grid-cols-5 gap-1.5 items-center">
                <input required value={u.label} onChange={(e) => onUpdateUnit(propIdx, unitIdx, { label: e.target.value })} placeholder="Unit" className="col-span-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                <input required value={u.tenantName} onChange={(e) => onUpdateUnit(propIdx, unitIdx, { tenantName: e.target.value })} placeholder="Tenant name" className="col-span-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                <input required value={u.tenantPhone} onChange={(e) => onUpdateUnit(propIdx, unitIdx, { tenantPhone: e.target.value })} placeholder="Phone" className="col-span-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                <input required value={u.tenantEmail} onChange={(e) => onUpdateUnit(propIdx, unitIdx, { tenantEmail: e.target.value })} placeholder="Email" className="col-span-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                <button onClick={() => onRemoveUnit(propIdx, unitIdx)} className="col-span-1 text-xs text-stone-400 hover:text-red-600">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => onAddUnit(propIdx)} className="text-xs text-stone-500 hover:text-stone-800 underline">+ Add unit</button>
        </div>
      ))}
      <button onClick={onAddProperty} className="text-sm text-stone-600 hover:text-stone-900 underline">+ Add another property</button>
    </div>
  );
}

function PlanStep({ planKey, setPlanKey }: { planKey: AutonomyLevelKey; setPlanKey: (k: AutonomyLevelKey) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {(Object.keys(PLAN_META) as AutonomyLevelKey[]).map((key) => {
        const plan = PLAN_META[key];
        const active = planKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setPlanKey(key)}
            className={"text-left border rounded-lg p-4 transition-colors " + (active ? "border-slate-900 bg-stone-50" : "border-stone-200")}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold text-stone-900">{plan.name}</div>
              <div className={"w-4 h-4 rounded-full border-2 " + (active ? "border-slate-900 bg-slate-900" : "border-stone-300")} />
            </div>
            <p className="text-xs text-stone-500 mb-2">{plan.tagline}</p>
            <ul className="space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-stone-600">&middot; {f}</li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

function ReviewStep({ account, properties, planKey }: { account: any; properties: PropertyDraft[]; planKey: AutonomyLevelKey }) {
  const validProperties = properties.filter((p) => p.address.trim());
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs font-medium text-stone-500 mb-1">Account</div>
        <div className="text-stone-700">{account.name} &middot; {account.email}{account.phone ? ` · ${account.phone}` : ""}</div>
      </div>
      <div>
        <div className="text-xs font-medium text-stone-500 mb-1">Properties</div>
        <div className="space-y-1">
          {validProperties.map((p, i) => (
            <div key={i} className="text-stone-700">
              {p.address}{p.unit ? ` · Unit ${p.unit}` : ""}
              {p.units.length > 0 && <span className="text-stone-400"> ({p.units.length} unit{p.units.length === 1 ? "" : "s"} on file)</span>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-stone-500 mb-1">Plan</div>
        <div className="text-stone-700">{PLAN_META[planKey].name}</div>
      </div>
      <p className="text-xs text-stone-400">Submitting sends this to Vantrel staff for approval — you'll be able to log in once it's reviewed.</p>
    </div>
  );
}
