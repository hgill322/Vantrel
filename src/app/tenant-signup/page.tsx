"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function emptyDraft() {
  return { inviteCode: "", name: "", email: "", phone: "", password: "" };
}

export default function TenantSignupPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/tenant-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-6 w-full max-w-sm shadow-sm">
        <Link href="/" className="text-lg font-semibold text-slate-900 mb-1 inline-block">VANTREL</Link>
        <p className="text-sm text-stone-500 mb-5">Sign up with the invite code your landlord gave you.</p>

        <label className="block text-xs font-medium text-stone-500 mb-1">Invite code</label>
        <input required value={draft.inviteCode} onChange={set("inviteCode")} placeholder="e.g. 7K4XQ9PM" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3 uppercase" />

        <label className="block text-xs font-medium text-stone-500 mb-1">Name</label>
        <input required value={draft.name} onChange={set("name")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
        <input required type="email" value={draft.email} onChange={set("email")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="block text-xs font-medium text-stone-500 mb-1">Phone</label>
        <input required value={draft.phone} onChange={set("phone")} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3" />

        <label className="block text-xs font-medium text-stone-500 mb-1">Password</label>
        <input required type="password" value={draft.password} onChange={set("password")} placeholder="At least 8 characters" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3" />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {submitting ? "Creating account…" : "Create account"}
        </button>
        <p className="text-xs text-stone-400 mt-3 text-center">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
