import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PortalClient from "./PortalClient";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await getSession();
  if (!session || session.role !== "tenant" || !session.unitId) redirect("/login");

  const unit = await prisma.unit.findUnique({
    where: { id: session.unitId },
    include: { property: true },
  });
  if (!unit) redirect("/login");

  const issues = await prisma.issue.findMany({
    where: { unitId: unit.id },
    orderBy: { loggedAt: "desc" },
  });

  return <PortalClient unit={unit} initialIssues={issues} />;
}
