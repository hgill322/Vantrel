import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SAFE_SELECT } from "../route";

interface UnitDraft {
  label: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
}

interface PropertyDraft {
  address: string;
  unit: string;
  units: UnitDraft[];
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "staff") {
    return NextResponse.json({ error: "Only staff can review signup requests." }, { status: 403 });
  }

  const body = await req.json();
  const status = String(body.status || "");
  if (status !== "approved" && status !== "denied") {
    return NextResponse.json({ error: "status must be 'approved' or 'denied'." }, { status: 400 });
  }

  const request = await prisma.signupRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 400 });
  }

  if (status === "approved") {
    const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with that email already exists — deny this request instead." }, { status: 400 });
    }

    const properties = request.properties as unknown as PropertyDraft[];

    await prisma.$transaction(async (tx) => {
      const landlord = await tx.landlord.create({
        data: { name: request.name, email: request.email, phone: request.phone, address: request.address },
      });

      await tx.user.create({
        data: { email: request.email, passwordHash: request.passwordHash, role: "landlord", landlordId: landlord.id },
      });

      for (const p of properties) {
        await tx.property.create({
          data: {
            landlordId: landlord.id,
            address: p.address,
            unit: p.unit || "",
            autonomyLevel: request.planKey,
            units: {
              create: p.units.map((u) => ({
                label: u.label,
                tenantName: u.tenantName,
                tenantPhone: u.tenantPhone,
                tenantEmail: u.tenantEmail,
              })),
            },
          },
        });
      }
    });
  }

  const updated = await prisma.signupRequest.update({
    where: { id: params.id },
    data: {
      status,
      reviewNote: String(body.reviewNote || "").trim(),
      reviewedAt: new Date(),
    },
    select: SAFE_SELECT,
  });

  return NextResponse.json(updated);
}
