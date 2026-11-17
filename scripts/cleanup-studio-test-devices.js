// Bersihkan device & link test QA dari database.
//   bun scripts/cleanup-studio-test-devices.js [keepDeviceId]

import { prisma } from "../lib/prisma.js";

// device hasil alur Google link asli dipakai user — JANGAN dihapus
// device test QA punya nama khusus; revoke (bukan delete) biar ada jejak,
// dan hapus link request test.
const TEST_NAMES = ["Dev Test Device", "Laptop Music Simulasi", "Dev Laptop Test"];

const keep = process.argv[2] || null;

const devices = await prisma.studioDevice.findMany();
for (const d of devices) {
  if (keep && d.deviceId === keep) continue;
  if (TEST_NAMES.includes(d.deviceName)) {
    await prisma.studioDevice.delete({ where: { id: d.id } });
    console.log(`deleted: ${d.deviceName} (${d.deviceId.slice(0, 12)}...)`);
  }
}

const links = await prisma.studioDeviceLink.findMany();
for (const l of links) {
  if (keep && l.deviceId === keep) continue;
  if (TEST_NAMES.includes(l.deviceName)) {
    await prisma.studioDeviceLink.delete({ where: { id: l.id } });
    console.log(`deleted link: ${l.deviceName}`);
  }
}

console.log("selesai");
await prisma.$disconnect();
