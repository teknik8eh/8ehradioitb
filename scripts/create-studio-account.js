// Buat/reset akun login app 8EH Studio.
//
//   bun scripts/create-studio-account.js <username> <displayName> [role]
//   (password diminta interaktif; jika tidak TTY, dari env STUDIO_PW)
//
// Contoh:
//   bun scripts/create-studio-account.js bang_john "Bang John" broadcaster
//
// Role: "broadcaster" (streaming + metadata) | "companion" (metadata saja)

import { scrypt } from "crypto";
import { prisma } from "../lib/prisma.js";

const [username, displayName, role = "broadcaster"] = process.argv.slice(2);

if (!username || !displayName) {
  console.error("Pemakaian: bun scripts/create-studio-account.js <username> <displayName> [role]");
  process.exit(1);
}

async function readPassword() {
  if (process.env.STUDIO_PW) return process.env.STUDIO_PW;
  // fallback non-interaktif sederhana
  console.error("Set env STUDIO_PW atau jalankan di terminal interaktif.");
  process.exit(1);
}

const password = await readPassword();
if (password.length < 8) {
  console.error("Password minimal 8 karakter.");
  process.exit(1);
}

const normalized = username.trim().toLowerCase();
const hash = await new Promise((resolve, reject) => {
  scrypt(password, normalized, 64, (err, derived) =>
    err ? reject(err) : resolve(derived.toString("hex")),
  );
});

const account = await prisma.studioAccount.upsert({
  where: { username: normalized },
  update: { passwordHash: hash, displayName, role, active: true },
  create: { username: normalized, passwordHash: hash, displayName, role },
});

console.log(`✓ Akun tersimpan: ${account.username} (${account.displayName}, role=${account.role})`);
await prisma.$disconnect();
