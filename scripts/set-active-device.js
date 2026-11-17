// Set device metadata aktif untuk testing.
//   bun scripts/set-active-device.js [deviceId | "clear"]

import { prisma } from "../lib/prisma.js";

const arg = process.argv[2];
const activeDeviceId = arg && arg !== "clear" ? arg : null;

await prisma.nowPlayingState.upsert({
  where: { key: "main" },
  update: { activeDeviceId },
  create: { key: "main", activeDeviceId },
});

console.log(activeDeviceId ? `aktif: ${activeDeviceId}` : "pilihan dikosongkan");
await prisma.$disconnect();
