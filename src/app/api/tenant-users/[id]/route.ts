import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const tenantUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: { unit: { include: { property: true } } },
  });
  if (!tenantUser || tenantUser.role !== "tenant" || !tenantUser.unit) {
    return NextResponse.json({ error: "Tenant account not found." }, { status: 404 });
  }
  if (session.role === "landlord" && tenantUser.unit.property.landlordId !== session.landlordId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (session.role === "tenant") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await prisma.user.delete({ where: { id: tenantUser.id } });
  return NextResponse.json({ ok: true });
}
