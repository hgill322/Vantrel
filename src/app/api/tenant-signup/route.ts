import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE_SECONDS, createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const inviteCode = String(body.inviteCode || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");

  if (!inviteCode || !name || !email || !phone || !password) {
    return NextResponse.json({ error: "Invite code, name, email, phone, and password are all required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({ where: { inviteCode } });
  if (!unit) {
    return NextResponse.json({ error: "That invite code isn't valid. Double-check it with your landlord." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash, role: "tenant", unitId: unit.id },
    });
    // Fill in the landlord's roster only where it's still blank — don't
    // clobber contact info the landlord already curated.
    await tx.unit.update({
      where: { id: unit.id },
      data: {
        tenantName: unit.tenantName || name,
        tenantPhone: unit.tenantPhone || phone,
        tenantEmail: unit.tenantEmail || email,
      },
    });
    return created;
  });

  const token = await createSessionToken({ sub: user.id, role: "tenant", landlordId: null, unitId: unit.id });

  const res = NextResponse.json({ ok: true, role: "tenant" }, { status: 201 });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
