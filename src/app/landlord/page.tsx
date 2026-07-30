import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import StaffHeader from "@/components/StaffHeader";
import LandlordViewClient from "./LandlordViewClient";

export const dynamic = "force-dynamic";

export default async function LandlordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Staff see every property; landlords only see their own.
  const isLandlord = session.role === "landlord";
  const propertyScope = isLandlord ? { landlordId: session.landlordId ?? "__none__" } : {};
  const requestScope = isLandlord ? { landlordId: session.landlordId ?? "__none__" } : {};

  const [issues, requests, properties, propertyRequests] = await Promise.all([
    prisma.issue.findMany({
      where: { property: { ...propertyScope, archived: false } },
      include: { property: { include: { landlord: true, units: true } } },
      orderBy: { loggedAt: "desc" },
    }),
    prisma.serviceRequest.findMany({
      where: { property: { ...propertyScope, archived: false } },
      include: { property: { include: { landlord: true, units: true } } },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.property.findMany({
      where: { ...propertyScope, archived: false },
      include: { landlord: true, units: true },
      orderBy: { address: "asc" },
    }),
    prisma.propertyRequest.findMany({
      where: requestScope,
      include: { landlord: true, property: { include: { landlord: true, units: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingRequestCount = session.role === "staff" ? propertyRequests.filter((r) => r.status === "pending").length : 0;

  return (
    <>
      <StaffHeader issues={issues} role={session.role} pendingRequestCount={pendingRequestCount} />
      <LandlordViewClient
        initialIssues={issues}
        initialRequests={requests}
        initialProperties={properties}
        initialPropertyRequests={propertyRequests}
        role={session.role}
      />
    </>
  );
}
