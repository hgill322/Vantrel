import Link from "next/link";
import { PLAN_META, type AutonomyLevelKey } from "@/lib/constants";

export default function Home() {
  return (
    <main className="min-h-screen">
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

        <div className="relative max-w-5xl mx-auto px-6">
          <nav className="flex items-center justify-between py-6">
            <div className="text-lg font-semibold tracking-tight">VANTREL</div>
            <div className="flex items-center gap-4">
              <Link href="/report" className="text-sm text-white/70 hover:text-white transition-colors">Report an issue</Link>
              <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">Log in</Link>
              <Link href="/signup" className="px-4 py-2 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Sign up</Link>
            </div>
          </nav>

          <div className="py-20 max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight mb-4">Own property, not problems.</h1>
            <p className="text-lg text-white/70 mb-8">
              Vantrel is the middleman between you and your tenants. Tenants report issues with photos,
              a description, and urgency — you decide how hands-on you want to be, from full-service
              coordination to a simple, organized record you handle yourself.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/signup" className="px-5 py-3 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">Get started</Link>
              <Link href="/login" className="px-5 py-3 rounded-lg border border-white/30 hover:border-white/60 text-white text-sm font-medium transition-colors">Log in</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-6 text-center">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HowItWorksCard
            step="1"
            title="Tenant reports an issue"
            body="Photos, a description, and how urgent it is — logged and timestamped the moment it's submitted."
          />
          <HowItWorksCard
            step="2"
            title="It lands on your dashboard"
            body="An organized, always-up-to-date record of every issue across every property you own."
          />
          <HowItWorksCard
            step="3"
            title="It gets handled and confirmed"
            body="Coordinate it yourself or let Vantrel handle the whole repair — either way, the tenant confirms before it's marked closed."
          />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-6 text-center">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(PLAN_META) as AutonomyLevelKey[]).map((key) => (
            <PlanCard key={key} planKey={key} />
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-3 text-sm text-stone-400">
          <div>VANTREL</div>
          <Link href="/report" className="hover:text-stone-600 transition-colors">Already a tenant? Report an issue</Link>
        </div>
      </footer>
    </main>
  );
}

function HowItWorksCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-medium flex items-center justify-center mb-3">{step}</div>
      <div className="text-sm font-semibold text-stone-900 mb-1.5">{title}</div>
      <p className="text-sm text-stone-500">{body}</p>
    </div>
  );
}

function PlanCard({ planKey }: { planKey: AutonomyLevelKey }) {
  const plan = PLAN_META[planKey];
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col">
      <div className="text-base font-semibold text-stone-900 mb-1">{plan.name}</div>
      <p className="text-sm text-stone-500 mb-4">{plan.tagline}</p>
      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="text-sm text-stone-600 flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">&check;</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="text-sm text-stone-400 mb-4">{plan.priceLabel}</div>
      <Link href={`/signup?plan=${planKey}`} className="text-center px-4 py-2.5 rounded-lg bg-orange-800 hover:bg-orange-900 text-white text-sm font-medium transition-colors">
        Get started with {plan.name}
      </Link>
    </div>
  );
}
