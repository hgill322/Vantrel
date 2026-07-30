import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const requests = await prisma.serviceRequest.findMany({
    where: session.role === "landlord" ? { property: { landlordId: session.landlordId ?? "__none__" } } : {},
    include: { property: { include: { landlord: true } } },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json();

  if (!body.propertyId || !body.type) {
    return NextResponse.json({ error: "Property and service type are required." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({ where: { id: String(body.propertyId) } });
  if (!property) {
    return NextResponse.json({ error: "Unknown property." }, { status: 400 });
  }

  if (session.role === "landlord" && property.landlordId !== session.landlordId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const request = await prisma.serviceRequest.create({
    data: {
      propertyId: property.id,
      type: body.type,
      notes: String(body.notes || "").trim(),
    },
    include: { property: { include: { landlord: true } } },
  });

  return NextResponse.json(request, { status: 201 });
}
