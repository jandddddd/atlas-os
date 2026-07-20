import assert from "node:assert/strict";
import test from "node:test";

import {
  createInboxTodayDecision,
  inboxTodayDecisionId,
} from "./inbox-today-decision.ts";

test("creates an approval decision from a persisted inbox analysis", () => {
  const decision = createInboxTodayDecision({
    customer: { name: "Familie Schneider" },
    project: {
      trade: "Malerarbeiten",
      service: "Wohnzimmer streichen",
      estimatedArea: 75,
    },
    workflow: {
      priority: "high",
      confidence: 0.82,
      nextAction: "Angebotsentwurf prüfen",
    },
    nextSteps: ["Bilder anfordern"],
    missingInformation: ["Bilder", "genaue Maße"],
    recommendedTask: {
      type: "offer",
      title: "Angebotsentwurf Familie Schneider vorbereiten",
    },
  });

  assert.equal(decision.id, inboxTodayDecisionId);
  assert.equal(decision.urgency, "high");
  assert.equal(decision.economicImpact, "high");
  assert.equal(decision.title, "Angebotsentwurf Familie Schneider vorbereiten");
  assert.deepEqual(decision.uncertainty, {
    title: "Angaben noch offen",
    description: "Bilder, genaue Maße",
    nextStep: "Bitte prüfe, ob diese Angaben vor der Freigabe benötigt werden.",
  });
});
