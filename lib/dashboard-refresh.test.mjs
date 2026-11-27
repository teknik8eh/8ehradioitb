import assert from "node:assert/strict";
import { test } from "node:test";
import { createDashboardRefresh } from "./dashboard-refresh.js";

async function tick(t, milliseconds = 0) {
  t.mock.timers.tick(milliseconds);
  await Promise.resolve();
}

function mockPolling(t, load, options) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperty(globalThis, "document", { configurable: true, value: visibility });
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const refresh = createDashboardRefresh(load, options);
  t.after(() => {
    refresh.dispose();
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
  });

  return {
    refresh,
    setHidden(hidden) {
      visibility.hidden = hidden;
      visibility.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

test("polling sends ten periodic requests in ten visible minutes and pauses while hidden", async (t) => {
  let requests = 0;
  const { setHidden } = mockPolling(t, async () => { requests += 1; });
  await tick(t);
  assert.equal(requests, 1);

  for (let minute = 0; minute < 10; minute++) await tick(t, 60_000);
  assert.equal(requests, 11);

  await tick(t, 10_000);
  setHidden(true);
  await tick(t, 10_000);
  setHidden(false);
  await tick(t);
  assert.equal(requests, 11);

  setHidden(true);
  await tick(t, 120_000);
  assert.equal(requests, 11);
  setHidden(false);
  await tick(t);
  assert.equal(requests, 12);
});

test("polling serializes slow requests and coalesces explicit refreshes", async (t) => {
  const pending = [];
  const { refresh } = mockPolling(t, (signal) => new Promise((resolve) => {
    pending.push({ signal, resolve });
  }));

  await tick(t);
  await tick(t, 120_000);
  refresh.refresh();
  refresh.refresh();
  await tick(t);
  assert.equal(pending.length, 1);

  pending[0].resolve();
  await tick(t);
  await tick(t);
  assert.equal(pending.length, 2);

  refresh.dispose();
  assert.equal(pending[1].signal.aborted, true);
  pending[1].resolve();
  await tick(t, 120_000);
  assert.equal(pending.length, 2);
});

test("locked status still allows explicit refresh and can resume polling", async (t) => {
  let requests = 0;
  const { refresh } = mockPolling(t, async () => { requests += 1; }, { polling: false });
  await tick(t, 120_000);
  assert.equal(requests, 0);

  refresh.refresh();
  refresh.refresh();
  await tick(t);
  assert.equal(requests, 1);
  await tick(t, 120_000);
  assert.equal(requests, 1);

  refresh.setPollingEnabled(true);
  await tick(t);
  assert.equal(requests, 2);
  refresh.setPollingEnabled(false);
  await tick(t, 120_000);
  assert.equal(requests, 2);
});
