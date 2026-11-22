import test from "node:test";
import assert from "node:assert/strict";
import { mergeSharedStreamUrls } from "./shared-stream-config.js";

test("dev stream uses production URLs while session controls stay local", () => {
  const result = mergeSharedStreamUrls(
    { defaultUrl: "https://dev.example/stream", onAir: false, liveChatEnabled: true },
    { baseUrls: ["https://prod.example/stream"], defaultUrl: "https://prod.example/stream", onAir: true },
  );
  assert.equal(result.defaultUrl, "https://prod.example/stream");
  assert.equal(result.onAir, false);
  assert.equal(result.liveChatEnabled, true);
  assert.equal(result.sharedBroadcastUrls, true);
});
