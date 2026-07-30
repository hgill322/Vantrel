import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const REQUEST_TYPES = ["add_property", "remove_property", "change_autonomy"];
const AUTONOMY_LEVELS = ["full_service", "record_only"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const requests = await prisma.propertyRequest.findMany({
    where: session.role === "landlord" ? { landlordId: session.landlordId ?? "__none__" } : {},
    include: { landlord: true, property: { include: { landlord: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "landlord" || !session.landlordId) {
    return NextResponse.json({ error: "Only landlords can submit property requests." }, { status: 403 });
  }

  const body = await req.json();
  const type = String(body.type || "");
  if (!REQUEST_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    landlordId: session.landlordId,
    type,
    note: String(body.note || "").trim(),
  };

  if (type === "add_property") {
    if (!body.address || !String(body.address).trim()) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }
    data.address = String(body.address).trim();
    data.unit = String(body.unit || "").trim();
  } else {
    const property = await prisma.property.findUnique({ where: { id: String(body.propertyId || "") } });
    if (!property || property.landlordId !== session.landlordId) {
      return NextResponse.json({ error: "Unknown property." }, { status: 400 });
    }
    data.propertyId = property.id;

    if (type === "change_autonomy") {
      if (!AUTONOMY_LEVELS.includes(body.requestedAutonomyLevel)) {
        return NextResponse.json({ error: "Invalid autonomyLevel." }, { status: 400 });
      }
      data.requestedAutonomyLevel = body.requestedAutonomyLevel;
    }
  }

  const request = await prisma.propertyRequest.create({
    data: data as Parameters<typeof prisma.propertyRequest.create>[0]["data"],
    include: { landlord: true, property: { include: { landlord: true } } },
  });

  return NextResponse.json(request, { status: 201 });
}
