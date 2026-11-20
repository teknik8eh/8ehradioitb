// Seed StudioDevice untuk testing/dev tanpa alur Google.
//   bun scripts/seed-studio-device.js <deviceName> <scope>
// Return deviceId + token — dipakai untuk uji endpoint /api/studio/now-playing.

import { prisma } from "../lib/prisma.js";
import { randomBytes } from "crypto";

const [deviceName = "Dev Test Device", scope = "broadcast"] = process.argv.slice(2);

const deviceId = randomBytes(24).toString("hex");
const token = randomBytes(24).toString("hex");

const device = await prisma.studioDevice.upsert({
  where: { deviceId },
  update: { token, scope, active: true, metadataEnabled: true },
  create: { deviceId, token, deviceName, scope, active: true, metadataEnabled: true },
});

console.log(JSON.stringify({ deviceId: device.deviceId, token, scope: device.scope }, null, 2));
await prisma.$disconnect();
