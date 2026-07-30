import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "staff") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const issues = await prisma.issue.findMany({
    include: { property: { include: { landlord: true } } },
    orderBy: { loggedAt: "desc" },
  });
  return NextResponse.json(issues);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.propertyId || !body.description) {
    return NextResponse.json({ error: "Property and description are required." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: String(body.propertyId) } });
  if (!property) {
    return NextResponse.json({ error: "Unknown property." }, { status: 400 });
  }

  const issue = await prisma.issue.create({
    data: {
      propertyId: property.id,
      unit: String(body.unit || "").trim(),
      tenant: String(body.tenant || "").trim(),
      contactMethod: body.contactMethod || "form",
      description: String(body.description).trim(),
      urgency: body.urgency || "standard7",
      status: "received",
    },
    include: { property: { include: { landlord: true } } },
  });

  return NextResponse.json(issue, { status: 201 });
}
