// A fresh login polls its unique sid. The deviceId path remains for existing
// signed-in Studio clients to synchronize revocation and token rotation.
export async function resolveStudioLinkStatus(prisma, { sid, deviceId }) {
  const link = await prisma.studioDeviceLink.findUnique({
    where: sid ? { sid } : { deviceId },
  });
  if (!link) {
    if (sid) return { status: "notfound" };
    const existing = await prisma.studioDevice.findUnique({ where: { deviceId } });
    if (!existing) return { status: "notfound" };
    return deviceStatus(existing);
  }
  if (link.status !== "approved") return { status: link.status || "pending" };
  const device = await prisma.studioDevice.findUnique({
    where: { deviceId: link.deviceId },
  });
  return deviceStatus(device);
}

function deviceStatus(device) {
  if (!device?.active) return { status: "revoked" };
  return {
    status: "approved",
    token: device.token,
    scope: device.scope,
    metadataEnabled: device.metadataEnabled,
    user: { name: device.ownerName },
  };
}
