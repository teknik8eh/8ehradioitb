import { NextResponse } from "next/server";
import { authenticateDevice } from "@/lib/studio-devices";
import { getAzuraCastDashboardConfigWithStationDetails } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request) {
  const token = request.headers.get("x-device-token");
  const device = await authenticateDevice(token);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  if (device.scope !== "broadcast") {
    return NextResponse.json({ error: "Broadcast access required" }, { status: 403, headers: noStore });
  }

  try {
    const { liveSource, missing: missingApiVariables } = await getAzuraCastDashboardConfigWithStationDetails();
    if (!liveSource?.isConfigured || !liveSource.mount) {
      const missingSourceFields = [...(liveSource?.missing || [])];
      if (!liveSource?.mount) missingSourceFields.push("AZURACAST_STREAM_MOUNT");
      return NextResponse.json({
        error: "Broadcast source is not configured",
        missingApiVariables,
        missingSourceFields,
      }, { status: 503, headers: noStore });
    }
    const { host, port, mount, username, password } = liveSource;
    const configuredBitrate = Number(process.env.AZURACAST_STREAM_BITRATE || 192);
    const bitrateKbps = Number.isInteger(configuredBitrate) && configuredBitrate >= 32 && configuredBitrate <= 320
      ? configuredBitrate : 192;
    return NextResponse.json({
      host,
      port: Number(port),
      mount,
      username,
      password,
      bitrateKbps,
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve broadcast source" }, { status: 503, headers: noStore });
  }
}
