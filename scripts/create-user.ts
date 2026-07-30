// Usage:
//   npm run create-user -- --email you@example.com --password secret123 --role staff
//   npm run create-user -- --email jane@landlord.com --password secret123 --role landlord --landlord-id <Landlord.id>
//
// Re-running with the same --email updates that user's password/role instead
// of erroring, so this also works to reset a forgotten password.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name: string) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");
  const role = arg("role");
  const landlordId = arg("landlord-id");

  if (!email || !password || !role) {
    console.error("Usage: npm run create-user -- --email you@example.com --password secret --role staff|landlord [--landlord-id <id>]");
    process.exit(1);
  }
  if (role !== "staff" && role !== "landlord") {
    console.error('--role must be "staff" or "landlord"');
    process.exit(1);
  }
  if (role === "landlord" && !landlordId) {
    console.error("--landlord-id is required for --role landlord. List landlords with: npx prisma studio");
    process.exit(1);
  }
  if (landlordId) {
    const landlord = await prisma.landlord.findUnique({ where: { id: landlordId } });
    if (!landlord) {
      console.error(`No Landlord found with id ${landlordId}`);
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role, landlordId: landlordId ?? null },
    update: { passwordHash, role, landlordId: landlordId ?? null },
  });

  console.log(`User ready: ${user.email} (${user.role}${user.landlordId ? `, landlord ${user.landlordId}` : ""})`);
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
