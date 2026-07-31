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

// Reporting an issue requires being logged in: staff logging a call/email on
// a tenant's behalf, or a tenant reporting through their own portal. There's
// no anonymous path anymore.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "staff" && session.role !== "tenant")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  if (!body.description || !String(body.description).trim()) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  if (session.role === "tenant") {
    if (!session.unitId) return NextResponse.json({ error: "Your account isn't linked to a unit." }, { status: 400 });
    const unit = await prisma.unit.findUnique({ where: { id: session.unitId } });
    if (!unit) return NextResponse.json({ error: "Your unit could not be found." }, { status: 400 });

    const issue = await prisma.issue.create({
      data: {
        propertyId: unit.propertyId,
        unitId: unit.id,
        unit: unit.label,
        tenant: unit.tenantName || "Tenant",
        contactMethod: "form",
        description: String(body.description).trim(),
        urgency: body.urgency || "standard7",
        status: "received",
      },
      include: { property: { include: { landlord: true } } },
    });
    return NextResponse.json(issue, { status: 201 });
  }

  // Staff logging an issue reported by phone/email — no portal account involved.
  if (!body.propertyId || !body.tenant || !String(body.tenant).trim()) {
    return NextResponse.json({ error: "Property, tenant name, and description are required." }, { status: 400 });
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
