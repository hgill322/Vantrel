import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const properties = await prisma.property.findMany({
    where: { archived: false },
    include: { landlord: true },
    orderBy: { address: "asc" },
  });
  return NextResponse.json(properties);
}
