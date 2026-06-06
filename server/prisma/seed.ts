import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import "../src/lib/env.js";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@fenrir.local";
  const password = await bcrypt.hash("demo1234", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: "Demo User",
    },
  });

  console.log("Seeded demo user:");
  console.log("  email: demo@fenrir.local");
  console.log("  password: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
