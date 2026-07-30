import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import StaffHeader from "@/components/StaffHeader";
import RequestsClient from "./RequestsClient";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");

  const [requests, issues] = await Promise.all([
    prisma.propertyRequest.findMany({
      include: { landlord: true, property: { include: { landlord: true, units: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.issue.findMany({
      include: { property: { include: { landlord: true, units: true } } },
      orderBy: { loggedAt: "desc" },
    }),
  ]);

  const pendingRequestCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <StaffHeader issues={issues} role={session.role} pendingRequestCount={pendingRequestCount} />
      <RequestsClient initialRequests={requests} />
    </>
  );
}
