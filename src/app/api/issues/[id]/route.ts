import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "staff") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  const allowed = [
    "status",
    "urgency",
    "description",
    "contractor",
    "quoteCost",
    "coordinationNotes",
    "resolutionSummary",
    "finalCost",
    "closedAt",
  ];
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if ("quoteCost" in data && data.quoteCost !== null) data.quoteCost = parseFloat(String(data.quoteCost)) || null;
  if ("finalCost" in data && data.finalCost !== null) data.finalCost = parseFloat(String(data.finalCost)) || null;
  if ("closedAt" in data && data.closedAt) data.closedAt = new Date(String(data.closedAt));

  const issue = await prisma.issue.update({
    where: { id: params.id },
    data,
    include: { property: { include: { landlord: true } } },
  });

  return NextResponse.json(issue);
}
