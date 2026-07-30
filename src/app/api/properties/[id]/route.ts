import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Staff-only, direct writes. Landlords go through /api/property-requests
// instead so changes to autonomy/property roster require staff approval.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "staff") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("autonomyLevel" in body) {
    if (body.autonomyLevel !== "full_service" && body.autonomyLevel !== "record_only") {
      return NextResponse.json({ error: "Invalid autonomyLevel." }, { status: 400 });
    }
    data.autonomyLevel = body.autonomyLevel;
  }
  if ("archived" in body) {
    data.archived = Boolean(body.archived);
  }

  const updated = await prisma.property.update({
    where: { id: params.id },
    data,
    include: { landlord: true },
  });

  return NextResponse.json(updated);
}
