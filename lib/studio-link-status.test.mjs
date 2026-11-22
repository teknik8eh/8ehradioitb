import test from "node:test";
import assert from "node:assert/strict";
import { resolveStudioLinkStatus } from "./studio-link-status.js";

function database(link) {
  const device = {
    deviceId: "device-1",
    active: true,
    token: "old-token",
    scope: "broadcast",
    metadataEnabled: true,
    ownerName: "Kru",
  };
  return {
    studioDeviceLink: {
      findUnique: async ({ where }) =>
        link && (where.sid === link.sid || where.deviceId === link.deviceId) ? link : null,
    },
    studioDevice: {
      findUnique: async ({ where }) => where.deviceId === device.deviceId ? device : null,
    },
  };
}

test("a fresh login cannot inherit an older device approval", async () => {
  const db = database({ sid: "old-attempt", deviceId: "device-1", status: "approved" });
  assert.deepEqual(await resolveStudioLinkStatus(db, { sid: "new-attempt", deviceId: "device-1" }), { status: "notfound" });
});

test("a login stays pending until that exact attempt is approved", async () => {
  const db = database({ sid: "new-attempt", deviceId: "device-1", status: "pending" });
  assert.deepEqual(await resolveStudioLinkStatus(db, { sid: "new-attempt", deviceId: "device-1" }), { status: "pending" });
});

test("approval returns token only for the matching attempt", async () => {
  const db = database({ sid: "new-attempt", deviceId: "device-1", status: "approved" });
  const result = await resolveStudioLinkStatus(db, { sid: "new-attempt", deviceId: "device-1" });
  assert.equal(result.status, "approved");
  assert.equal(result.token, "old-token");
});

test("device status polling remains available for existing sessions", async () => {
  const result = await resolveStudioLinkStatus(database(null), { sid: "", deviceId: "device-1" });
  assert.equal(result.status, "approved");
});
