import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json();
  if (
    !body.propertyId ||
    !String(body.label || "").trim() ||
    !String(body.tenantName || "").trim() ||
    !String(body.tenantPhone || "").trim() ||
    !String(body.tenantEmail || "").trim()
  ) {
    return NextResponse.json({ error: "Property, unit label, tenant name, phone, and email are all required." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: String(body.propertyId) } });
  if (!property) return NextResponse.json({ error: "Unknown property." }, { status: 400 });
  if (session.role === "tenant") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (session.role === "landlord" && property.landlordId !== session.landlordId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      label: String(body.label).trim(),
      tenantName: String(body.tenantName || "").trim(),
      tenantPhone: String(body.tenantPhone || "").trim(),
      tenantEmail: String(body.tenantEmail || "").trim(),
    },
    include: { tenantUsers: { select: { id: true, email: true, createdAt: true } } },
  });

  return NextResponse.json(unit, { status: 201 });
}
