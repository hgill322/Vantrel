import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const session = await getSession();
  if (session?.role === "tenant") redirect("/portal");

  return (
    <main className="max-w-lg mx-auto px-6 py-16 text-center min-h-screen flex flex-col items-center justify-center">
      <Link href="/" className="text-lg font-semibold text-slate-900 mb-1">VANTREL</Link>
      <h1 className="text-base font-semibold text-stone-900 mb-2 mt-4">Report an issue</h1>
      <p className="text-sm text-stone-500 mb-6">
        Reporting an issue requires a tenant account, so your landlord can see who reported what and follow
        up with you directly.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/tenant-signup" className="px-4 py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">
          Sign up with invite code
        </Link>
        <Link href="/login" className="px-4 py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600">
          Log in
        </Link>
      </div>
      <p className="text-xs text-stone-400 mt-6">Don't have an invite code? Ask your landlord for one.</p>
    </main>
  );
}
