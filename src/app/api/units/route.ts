import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json();
  if (!body.propertyId || !body.label || !String(body.label).trim()) {
    return NextResponse.json({ error: "Property and unit label are required." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: String(body.propertyId) } });
  if (!property) return NextResponse.json({ error: "Unknown property." }, { status: 400 });
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
  });

  return NextResponse.json(unit, { status: 201 });
}
