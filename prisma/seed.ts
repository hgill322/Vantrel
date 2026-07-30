import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed-only password, printed to the console below. Change it (or create
// your own accounts) with `npm run create-user` before this touches real data.
const SEED_PASSWORD = "vantrel-dev";

async function main() {
  const elm = await prisma.landlord.create({
    data: {
      name: "Priya Nair",
      email: "priya@example.com",
      properties: {
        create: [{ address: "123 Elm St", autonomyLevel: "full_service" }],
      },
    },
    include: { properties: true },
  });

  const dundas = await prisma.landlord.create({
    data: {
      name: "Marcus Tran",
      email: "marcus@example.com",
      properties: {
        create: [{ address: "88 Dundas St", autonomyLevel: "record_only" }],
      },
    },
    include: { properties: true },
  });

  const elmProperty = elm.properties[0];
  const dundasProperty = dundas.properties[0];

  await prisma.issue.createMany({
    data: [
      {
        propertyId: elmProperty.id,
        unit: "2B",
        tenant: "Priya N.",
        contactMethod: "form",
        description: "Kitchen tap has been dripping steadily for two days.",
        urgency: "standard7",
        status: "received",
      },
      {
        propertyId: dundasProperty.id,
        unit: "1A",
        tenant: "Marcus T.",
        contactMethod: "phone",
        description: "No heat since last night, apartment is very cold.",
        urgency: "emergency",
        status: "coordinating",
        contractor: "London HVAC Co.",
        quoteCost: 240,
        coordinationNotes: "Tech dispatched, arriving between 10am-12pm.",
      },
      {
        propertyId: elmProperty.id,
        unit: "4C",
        tenant: "Grace L.",
        contactMethod: "email",
        description: "Lock sticking, tenant had trouble getting back in last week.",
        urgency: "urgent48",
        status: "closed",
        contractor: "Woodstock Locksmith",
        finalCost: 95,
        resolutionSummary: "Rekeyed and lubricated deadbolt.",
        closedAt: new Date(),
      },
    ],
  });

  await prisma.serviceRequest.createMany({
    data: [{ propertyId: elmProperty.id, type: "lawn", notes: "Weekly cut through October" }],
  });

  await prisma.unit.createMany({
    data: [
      { propertyId: elmProperty.id, label: "2B", tenantName: "Priya N.", tenantPhone: "519-555-0111", tenantEmail: "priya.tenant@example.com" },
      { propertyId: elmProperty.id, label: "4C", tenantName: "Grace L.", tenantPhone: "519-555-0122", tenantEmail: "" },
      { propertyId: dundasProperty.id, label: "1A", tenantName: "Marcus T.", tenantPhone: "", tenantEmail: "marcus.tenant@example.com" },
    ],
  });

  await prisma.propertyRequest.create({
    data: {
      landlordId: dundas.id,
      type: "change_autonomy",
      propertyId: dundasProperty.id,
      requestedAutonomyLevel: "full_service",
      note: "Getting harder to coordinate contractors myself, would rather Vantrel handle it going forward.",
    },
  });

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await prisma.user.createMany({
    data: [
      { email: "staff@vantrel.test", passwordHash, role: "staff" },
      { email: elm.email, passwordHash, role: "landlord", landlordId: elm.id },
      { email: dundas.email, passwordHash, role: "landlord", landlordId: dundas.id },
    ],
  });

  console.log("\nSeed accounts (password for all: " + SEED_PASSWORD + "):");
  console.log("  staff@vantrel.test   -> staff, full access");
  console.log(`  ${elm.email} -> landlord, 123 Elm St only`);
  console.log(`  ${dundas.email} -> landlord, 88 Dundas St only`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
