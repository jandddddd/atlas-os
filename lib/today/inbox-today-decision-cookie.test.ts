import assert from "node:assert/strict";
import test from "node:test";

import {
  canStoreInboxTodayDecision,
  createInboxTodayDecisionCookieOptions,
  serializeInboxTodayDecisionCookie,
} from "./inbox-today-decision-cookie.ts";

function createAnalysis(service: string) {
  return {
    customer: { name: "Unbekannt" },
    project: {
      trade: "Malerarbeiten",
      service,
      estimatedArea: null,
    },
    workflow: {
      priority: "normal" as const,
      confidence: 0.8,
      nextAction: "Angebot prüfen",
    },
    nextSteps: ["Bilder anfordern"],
    missingInformation: [],
    recommendedTask: {
      type: "offer" as const,
      title: "Angebotsentwurf vorbereiten",
    },
  };
}

test("measures the encoded Set-Cookie payload instead of only the JSON value", () => {
  const analysis = createAnalysis(" ".repeat(1_300));
  const jsonByteLength = new TextEncoder().encode(
    JSON.stringify(analysis),
  ).byteLength;
  const cookieByteLength = new TextEncoder().encode(
    serializeInboxTodayDecisionCookie(analysis, false),
  ).byteLength;

  assert.ok(jsonByteLength < 3_800);
  assert.ok(cookieByteLength > 3_800);
  assert.equal(canStoreInboxTodayDecision(analysis, false), false);
});

test("accepts an analysis whose complete serialized cookie fits the safety limit", () => {
  const analysis = createAnalysis("Wohnzimmer streichen");

  assert.equal(canStoreInboxTodayDecision(analysis, false), true);
});

test("serializes secure cookies only for HTTPS requests", () => {
  const analysis = createAnalysis("Wohnzimmer streichen");

  assert.match(
    serializeInboxTodayDecisionCookie(analysis, true),
    /; Secure(?:;|$)/,
  );
  assert.doesNotMatch(
    serializeInboxTodayDecisionCookie(analysis, false),
    /; Secure(?:;|$)/,
  );
  assert.deepEqual(createInboxTodayDecisionCookieOptions(true), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
  });
  assert.deepEqual(createInboxTodayDecisionCookieOptions(false), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
});
