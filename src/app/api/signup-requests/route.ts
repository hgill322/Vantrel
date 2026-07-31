import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SAFE_SELECT } from "./shared";

const PLAN_KEYS = ["full_service", "record_only"];

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

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "staff") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const requests = await prisma.signupRequest.findMany({ select: SAFE_SELECT, orderBy: { createdAt: "desc" } });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const planKey = String(body.planKey || "");
  const properties: PropertyDraft[] = Array.isArray(body.properties) ? body.properties : [];

  if (!name || !email || !phone || !address || !password) {
    return NextResponse.json({ error: "Name, email, phone, address, and password are all required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!PLAN_KEYS.includes(planKey)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }
  const cleanProperties = properties
    .map((p) => ({
      address: String(p.address || "").trim(),
      unit: String(p.unit || "").trim(),
      units: Array.isArray(p.units)
        ? p.units.map((u) => ({
            label: String(u.label || "").trim(),
            tenantName: String(u.tenantName || "").trim(),
            tenantPhone: String(u.tenantPhone || "").trim(),
            tenantEmail: String(u.tenantEmail || "").trim(),
          }))
        : [],
    }))
    .filter((p) => p.address);
  if (cleanProperties.length === 0) {
    return NextResponse.json({ error: "Add at least one property." }, { status: 400 });
  }
  for (const p of cleanProperties) {
    for (const u of p.units) {
      if (!u.label || !u.tenantName || !u.tenantPhone || !u.tenantEmail) {
        return NextResponse.json({ error: "Every unit needs a label, tenant name, phone, and email, or remove it." }, { status: 400 });
      }
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
  }
  const existingRequest = await prisma.signupRequest.findFirst({ where: { email, status: "pending" } });
  if (existingRequest) {
    return NextResponse.json({ error: "A signup request with that email is already pending review." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const request = await prisma.signupRequest.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
      address,
      planKey,
      properties: cleanProperties as any,
    },
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}
