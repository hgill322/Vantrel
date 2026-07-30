"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SignupClient from "./SignupClient";
import type { AutonomyLevelKey } from "@/lib/constants";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const params = useSearchParams();
  const plan = params.get("plan");
  const initialPlan: AutonomyLevelKey | null = plan === "full_service" || plan === "record_only" ? plan : null;
  return <SignupClient initialPlan={initialPlan} />;
}
