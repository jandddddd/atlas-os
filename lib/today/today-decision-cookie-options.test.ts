import assert from "node:assert/strict";
import test from "node:test";

import { shouldUseSecureTodayCookie } from "./today-decision-cookie-options.ts";

test("uses x-forwarded-proto when a reverse proxy provides it", () => {
  assert.equal(shouldUseSecureTodayCookie("https", "http://atlas.example"), true);
  assert.equal(shouldUseSecureTodayCookie("https, http", "http://atlas.example"), true);
  assert.equal(shouldUseSecureTodayCookie("http", "https://atlas.example"), false);
});

test("uses the direct request origin when no proxy protocol is available", () => {
  assert.equal(shouldUseSecureTodayCookie(null, "https://atlas.example"), true);
  assert.equal(shouldUseSecureTodayCookie(null, "http://localhost:3000"), false);
  assert.equal(shouldUseSecureTodayCookie(null, "not-a-url"), false);
  assert.equal(shouldUseSecureTodayCookie(null, null), false);
});
