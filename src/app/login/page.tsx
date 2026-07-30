"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push(params.get("next") || (data.role === "landlord" ? "/landlord" : "/ops"));
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center px-6">
      <form onSubmit={submit} className="bg-white border border-stone-200 rounded-xl p-6 w-full max-w-sm shadow-sm">
        <div className="text-lg font-semibold text-slate-900 mb-1">VANTREL</div>
        <p className="text-sm text-stone-500 mb-5">Sign in</p>
        <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <label className="block text-xs font-medium text-stone-500 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
