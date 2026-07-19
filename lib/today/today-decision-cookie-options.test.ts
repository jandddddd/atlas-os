import assert from "node:assert/strict";
import test from "node:test";

import { shouldUseSecureTodayCookie } from "./today-decision-cookie-options.ts";

test("uses secure cookies only for HTTPS requests", () => {
  assert.equal(shouldUseSecureTodayCookie("https"), true);
  assert.equal(shouldUseSecureTodayCookie("https, http"), true);
  assert.equal(shouldUseSecureTodayCookie("http"), false);
  assert.equal(shouldUseSecureTodayCookie(null), false);
});
