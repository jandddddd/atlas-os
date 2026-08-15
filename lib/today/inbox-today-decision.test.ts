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
  assert.equal(decision.editHref, "/inbox");
  assert.equal(decision.primaryActionLabel, "Als geprüft vormerken");
  assert.equal(decision.primaryActionPendingLabel, "Wird vorgemerkt …");
  assert.equal(
    decision.consequence,
    "Mit dieser Vormerkung wird nichts versendet oder final freigegeben.",
  );
  assert.equal(
    decision.completionMessage,
    "Der vorbereitete nächste Schritt wurde als geprüft vorgemerkt.",
  );
  assert.deepEqual(decision.completionAction, {
    label: "Angebotsentwurf weiterbearbeiten",
    href: "/inbox#offer-draft",
    requiresSavedOfferDraft: true,
  });
  assert.deepEqual(decision.reviewContext, {
    source: "Inbox · ungeprüfte KI-Analyse",
    inquiry: "Familie Schneider: Wohnzimmer streichen",
    analysis:
      "Malerarbeiten. Genannte Flächenangabe laut Analyse: 75 m². Sie ist keine automatisch abgeleitete Wand- oder Deckenfläche.",
    nextStep: "Angebotsentwurf prüfen",
  });
  assert.deepEqual(decision.details, {
    title: "Weitere Schritte aus der Analyse",
    items: ["Bilder anfordern"],
  });
  assert.deepEqual(decision.uncertainty, {
    title: "Angaben noch offen",
    description: "Bilder, genaue Maße",
    nextStep: "Bitte prüfe, ob diese Angaben vor der Freigabe benötigt werden.",
  });
});

test("keeps a replacement analysis isolated from the previously stored inquiry", () => {
  const decision = createInboxTodayDecision({
    customer: { name: "Familie Berger" },
    project: {
      trade: "Malerarbeiten",
      service: "Fassade prüfen",
      estimatedArea: null,
    },
    workflow: {
      priority: "normal",
      confidence: 0.61,
      nextAction: "Besichtigung abstimmen",
    },
    nextSteps: [],
    missingInformation: ["Fassadenmaße"],
    recommendedTask: {
      type: "visit",
      title: "Besichtigung für Familie Berger vorbereiten",
    },
  });

  assert.deepEqual(decision.reviewContext, {
    source: "Inbox · ungeprüfte KI-Analyse",
    inquiry: "Familie Berger: Fassade prüfen",
    analysis: "Malerarbeiten. Keine Flächenangabe ist bekannt; Maße bleiben offen.",
    nextStep: "Besichtigung abstimmen",
  });
  assert.equal(decision.completionAction, undefined);
  assert.doesNotMatch(JSON.stringify(decision), /Schneider|Wohnzimmer|75 m²/);
  assert.equal(decision.uncertainty?.description, "Fassadenmaße");
  assert.deepEqual(decision.details?.items, [
    "Keine weiteren Schritte aus der Analyse vorhanden.",
  ]);
});
