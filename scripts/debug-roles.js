// Debug: dump role user + char codes untuk investigasi gate role 8EH Studio.
import { prisma } from "../lib/prisma.js";

const users = await prisma.user.findMany({
  select: { email: true, name: true, role: true },
  take: 40,
});

for (const u of users) {
  const role = u.role || "";
  const codes = [...role].map((c) => c.codePointAt(0).toString(16).padStart(4, "0"));
  console.log(`${(u.email || "").padEnd(34)} role="${role}"  hex=${codes.join(" ")}`);
}

await prisma.$disconnect();
