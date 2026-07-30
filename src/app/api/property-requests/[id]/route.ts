import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "staff") {
    return NextResponse.json({ error: "Only staff can review property requests." }, { status: 403 });
  }

  const body = await req.json();
  const status = String(body.status || "");
  if (status !== "approved" && status !== "denied") {
    return NextResponse.json({ error: "status must be 'approved' or 'denied'." }, { status: 400 });
  }

  const request = await prisma.propertyRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 400 });
  }

  if (status === "approved") {
    if (request.type === "add_property") {
      await prisma.property.create({
        data: {
          landlordId: request.landlordId,
          address: request.address,
          unit: request.unit,
          autonomyLevel: "record_only",
        },
      });
    } else if (request.type === "remove_property" && request.propertyId) {
      await prisma.property.update({ where: { id: request.propertyId }, data: { archived: true } });
    } else if (request.type === "change_autonomy" && request.propertyId) {
      await prisma.property.update({
        where: { id: request.propertyId },
        data: { autonomyLevel: request.requestedAutonomyLevel },
      });
    }
  }

  const updated = await prisma.propertyRequest.update({
    where: { id: params.id },
    data: {
      status,
      reviewNote: String(body.reviewNote || "").trim(),
      reviewedAt: new Date(),
    },
    include: { landlord: true, property: { include: { landlord: true } } },
  });

  return NextResponse.json(updated);
}
