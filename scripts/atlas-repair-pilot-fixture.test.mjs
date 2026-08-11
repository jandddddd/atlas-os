import assert from "node:assert/strict";
import test from "node:test";

import { ATLAS_REPAIR_PILOT_VALUE } from "./fixtures/atlas-repair-pilot-fixture.mjs";

test("repair pilot fixture retains its known-safe value", () => {
  assert.equal(ATLAS_REPAIR_PILOT_VALUE, "pilot-ready");
});
