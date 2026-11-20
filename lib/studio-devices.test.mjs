import test from "node:test";
import assert from "node:assert/strict";
import { scopeForRoles, metadataEnabledByDefault } from "./studio-devices.js";

test("TECHNIC and DEVELOPER devices start with metadata disabled", () => {
  for (const role of ["TECHNIC", "DEVELOPER", "TECHNIC-MUSIC"]) {
    assert.equal(metadataEnabledByDefault(scopeForRoles(role)), false);
  }
});

test("MUSIC devices start with metadata enabled", () => {
  assert.equal(metadataEnabledByDefault(scopeForRoles("MUSIC")), true);
});
