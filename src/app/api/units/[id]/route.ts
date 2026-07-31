import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function authorize(session: Awaited<ReturnType<typeof getSession>>, unitId: string) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { property: true } });
  if (!unit) return { error: NextResponse.json({ error: "Unit not found." }, { status: 404 }) };
  if (!session) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (session.role === "tenant") return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  if (session.role === "landlord" && unit.property.landlordId !== session.landlordId) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { unit };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const { unit, error } = await authorize(session, params.id);
  if (error) return error;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["label", "tenantName", "tenantPhone", "tenantEmail"]) {
    if (key in body) data[key] = String(body[key] || "").trim();
  }

  const updated = await prisma.unit.update({ where: { id: unit!.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const { unit, error } = await authorize(session, params.id);
  if (error) return error;

  await prisma.unit.delete({ where: { id: unit!.id } });
  return NextResponse.json({ ok: true });
}
