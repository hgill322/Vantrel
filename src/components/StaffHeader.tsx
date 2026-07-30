"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { hoursSince } from "@/lib/constants";
import type { IssueWithProperty } from "@/lib/types";
import type { Role } from "@/lib/auth";

export default function StaffHeader({ issues, role, pendingRequestCount = 0 }: { issues: IssueWithProperty[]; role: Role; pendingRequestCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = issues.filter((i) => i.status !== "closed");
  const emergencies = open.filter((i) => i.urgency === "emergency");
  const overdue = open.filter((i) => {
    const h = hoursSince(i.loggedAt);
    if (h === null) return false;
    if (i.urgency === "emergency") return h > 1;
    if (i.urgency === "urgent48") return h > 48;
    return false;
  });

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="relative overflow-hidden bg-slate-900 text-white">
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" preserveAspectRatio="none">
        <defs>
          <pattern id="lattice" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="28" stroke="white" strokeWidth="1" />
            <line x1="14" y1="0" x2="14" y2="28" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lattice)" />
      </svg>
      <div className="relative max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="text-xl font-semibold tracking-tight">VANTREL</div>
            <div className="text-sm text-white/60 mt-0.5">Own property, not problems.</div>
          </div>
          <div className="flex gap-3">
            <StatPill label="Open" value={open.length} />
            <StatPill label="Emergencies" value={emergencies.length} danger />
            <StatPill label="Overdue SLA" value={overdue.length} danger />
            <StatPill label="Total logged" value={issues.length} />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <nav className="flex gap-1 bg-white/10 rounded-lg p-1 w-fit">
            {role === "staff" && <NavTab href="/ops" active={pathname?.startsWith("/ops")}>Ops board</NavTab>}
            <NavTab href="/landlord" active={pathname?.startsWith("/landlord")}>Landlord view</NavTab>
            {role === "staff" && (
              <NavTab href="/requests" active={pathname?.startsWith("/requests")}>
                Requests{pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ""}
              </NavTab>
            )}
          </nav>
          <button onClick={signOut} className="text-xs text-white/60 hover:text-white transition-colors">Sign out</button>
        </div>
      </div>
    </header>
  );
}

function NavTab({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={"px-3 py-1.5 rounded-md text-sm transition-colors " + (active ? "bg-white text-slate-900" : "text-white/70 hover:text-white")}
    >
      {children}
    </Link>
  );
}

function StatPill({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="text-right">
      <div className={"text-lg font-semibold tabular-nums font-mono " + (danger && value > 0 ? "text-red-300" : "text-white")}>{value}</div>
      <div className="text-[11px] text-white/50 uppercase tracking-wide">{label}</div>
    </div>
  );
}
