import test from "node:test";
import assert from "node:assert/strict";
import { databaseUrlForName } from "./broadcast-db-url.js";

test("broadcast state selects only the named database on the same MongoDB cluster", () => {
  const source = "mongodb+srv://user:password@example.mongodb.net/dev2?retryWrites=true";
  const result = new URL(databaseUrlForName(source, "Cluster0"));
  assert.equal(result.host, "example.mongodb.net");
  assert.equal(result.pathname, "/Cluster0");
  assert.equal(result.searchParams.get("retryWrites"), "true");
  assert.equal(result.username, "user");
});

test("broadcast state rejects an invalid database name", () => {
  assert.throws(() => databaseUrlForName("mongodb://localhost/dev2", "../other"));
});
