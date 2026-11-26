import assert from "node:assert/strict";
import { test } from "node:test";
import { watchNowPlaying } from "./now-playing-client.js";
import { watchStreamConfig } from "./stream-config-client.js";

function emitter() {
  const listeners = new Map();
  return {
    bind(event, callback) {
      listeners.set(event, callback);
    },
    unbind(event) {
      listeners.delete(event);
    },
    send(event, payload) {
      listeners.get(event)?.(payload);
    },
  };
}

function browser(t) {
  const cleanups = [];
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "document", { configurable: true, value: visibility });
  Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: new Date("2026-11-26T00:00:00Z") });
  t.after(() => {
    for (const cleanup of cleanups) cleanup();
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  });
  return {
    cleanup: (callback) => cleanups.push(callback),
    setHidden(hidden) {
      visibility.hidden = hidden;
      visibility.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("now-playing reconciles at five minutes, pauses while hidden, and resyncs after reconnect", async (t) => {
  const { cleanup, setHidden } = browser(t);
  const channel = { ...emitter(), subscribed: false };
  const connection = emitter();
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ title: "8EH" }));
  const stop = watchNowPlaying({ channel, pusher: { connection } }, () => {});
  cleanup(stop);
  channel.send("pusher:subscription_succeeded");
  await flush();
  assert.equal(fetch.mock.callCount(), 1);

  t.mock.timers.tick(60_000);
  assert.equal(fetch.mock.callCount(), 1);
  t.mock.timers.tick(240_000);
  await flush();
  assert.equal(fetch.mock.callCount(), 2);

  setHidden(true);
  connection.send("state_change", { current: "unavailable" });
  t.mock.timers.tick(300_000);
  assert.equal(fetch.mock.callCount(), 2);
  setHidden(false);
  await flush();
  assert.equal(fetch.mock.callCount(), 3);

  t.mock.timers.tick(60_000);
  await flush();
  assert.equal(fetch.mock.callCount(), 4);
  channel.send("pusher:subscription_succeeded");
  await flush();
  assert.equal(fetch.mock.callCount(), 5);
});

test("an in-flight now-playing response cannot overwrite a newer Pusher update", async (t) => {
  const { cleanup } = browser(t);
  const channel = { ...emitter(), subscribed: true };
  const connection = emitter();
  const updates = [];
  let sendResponse;
  t.mock.method(globalThis, "fetch", () => new Promise((resolve) => { sendResponse = resolve; }));
  cleanup(watchNowPlaying({ channel, pusher: { connection } }, (data) => updates.push(data.title)));

  channel.send("updated", { title: "New track" });
  sendResponse(Response.json({ title: "Previous track" }));
  await flush();
  assert.deepEqual(updates, ["New track"]);
});

test("now-playing rechecks studio expiry after a heartbeat and falls back after heartbeat stops", async (t) => {
  const { cleanup } = browser(t);
  const channel = { ...emitter(), subscribed: true };
  const connection = emitter();
  const updates = [];
  const studio = { isActive: true, source: "studio-agent", title: "Studio", updatedAt: new Date().toISOString() };
  const refreshedStudio = { ...studio, updatedAt: new Date(Date.now() + 120_000).toISOString() };
  const responses = [studio, refreshedStudio, { source: "fallback", title: "8EH" }];
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json(responses.shift()));
  cleanup(watchNowPlaying({ channel, pusher: { connection } }, (data) => updates.push(data.title)));
  await flush();

  t.mock.timers.tick(180_000);
  assert.equal(fetch.mock.callCount(), 1);
  t.mock.timers.tick(1_000);
  await flush();
  assert.deepEqual(updates, ["Studio", "Studio"]);

  t.mock.timers.tick(120_000);
  await flush();
  assert.deepEqual(updates, ["Studio", "Studio", "8EH"]);
});

test("stream config serializes refreshes, coalesces live events, and pauses hidden tabs", async (t) => {
  const { cleanup, setHidden } = browser(t);
  const channel = emitter();
  const requests = [];
  const revalidate = () => new Promise((resolve) => requests.push(resolve));
  cleanup(watchStreamConfig(revalidate, channel));
  assert.equal(requests.length, 1);

  channel.send("live-started");
  channel.send("live-ended");
  assert.equal(requests.length, 1);
  requests[0]();
  await flush();
  assert.equal(requests.length, 2);
  requests[1]();
  await flush();

  setHidden(true);
  t.mock.timers.tick(120_000);
  channel.send("live-started");
  assert.equal(requests.length, 2);
  setHidden(false);
  assert.equal(requests.length, 3);
  requests[2]();
  await flush();

  t.mock.timers.tick(119_999);
  assert.equal(requests.length, 3);
  t.mock.timers.tick(1);
  assert.equal(requests.length, 4);
  requests[3]();
  await flush();
});

test("an idle foreground tab sends nine combined requests in ten minutes with healthy Pusher", async (t) => {
  const { cleanup } = browser(t);
  const channel = { ...emitter(), subscribed: true };
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ title: "8EH" }));
  let configRequests = 0;

  cleanup(watchStreamConfig(async () => { configRequests += 1; }, channel));
  cleanup(watchNowPlaying({ channel, pusher: { connection: emitter() } }, () => {}));
  await flush();

  for (let minute = 0; minute < 10; minute += 1) {
    t.mock.timers.tick(60_000);
    await flush();
  }

  assert.equal(configRequests, 6);
  assert.equal(fetch.mock.callCount(), 3);
});
