import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE_SECONDS, createSessionToken, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await createSessionToken({ sub: user.id, role: user.role as Role, landlordId: user.landlordId });

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
