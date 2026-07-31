import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import StaffHeader from "@/components/StaffHeader";
import OpsBoardClient from "./OpsBoardClient";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");

  const [issues, properties, pendingRequestCount] = await Promise.all([
    prisma.issue.findMany({
      include: { property: { include: { landlord: true, units: { include: { tenantUsers: { select: { id: true, email: true, createdAt: true } } } } } } },
      orderBy: { loggedAt: "desc" },
    }),
    prisma.property.findMany({
      where: { archived: false },
      include: { landlord: true, units: { include: { tenantUsers: { select: { id: true, email: true, createdAt: true } } } } },
      orderBy: { address: "asc" },
    }),
    prisma.propertyRequest.count({ where: { status: "pending" } }),
  ]);

  return (
    <>
      <StaffHeader issues={issues} role={session.role} pendingRequestCount={pendingRequestCount} />
      <OpsBoardClient initialIssues={issues} properties={properties} />
    </>
  );
}
