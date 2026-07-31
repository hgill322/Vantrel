import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Avoids visually ambiguous characters (0/O, 1/I/L) since a tenant has to
// type this in by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const unit = await prisma.unit.findUnique({ where: { id: params.id }, include: { property: true } });
  if (!unit) return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  if (session.role === "landlord" && unit.property.landlordId !== session.landlordId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (session.role === "tenant") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let code = randomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.unit.findUnique({ where: { inviteCode: code } });
    if (!clash) break;
    code = randomCode();
  }

  const updated = await prisma.unit.update({ where: { id: unit.id }, data: { inviteCode: code } });
  return NextResponse.json({ inviteCode: updated.inviteCode });
}
