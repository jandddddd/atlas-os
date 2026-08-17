import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAnalysisResponse,
  parseOfferResponse,
} from "./inquiry-response.ts";

test("lehnt eine syntaktisch gültige, aber schemawidrige Analyseantwort ab", () => {
  const malformedAnalysis = JSON.stringify({
    customer: { name: "Familie Beispiel" },
    project: {
      trade: "Malerarbeiten",
      service: "Wohnzimmer streichen",
      estimatedArea: 40,
    },
    // "urgent" ist kein gültiger Prioritätswert, und recommendedTask fehlt.
    workflow: {
      priority: "urgent",
      confidence: 0.9,
      nextAction: "Angebot vorbereiten",
    },
    nextSteps: ["Termin vereinbaren"],
    missingInformation: [],
  });

  assert.throws(
    () => parseAnalysisResponse(malformedAnalysis),
    /Claude hat keine gültige Analyse geliefert\./,
  );
});

test("lehnt eine syntaktisch gültige, aber schemawidrige Angebotsantwort ab", () => {
  const malformedOffer = JSON.stringify({
    customerName: "Familie Beispiel",
    title: "Angebotsentwurf",
    projectSummary: "Wohnzimmer streichen",
    // Position fehlt "notes", das die bestehende Validierung verlangt.
    positions: [
      { id: 1, description: "Wände streichen", quantity: 40, unit: "m²" },
    ],
    assumptions: [],
    missingInformation: [],
    recommendedNextStep: "Besichtigung vereinbaren.",
    status: "draft",
  });

  assert.throws(
    () => parseOfferResponse(malformedOffer),
    /Claude hat keinen gültigen Angebotsentwurf geliefert\./,
  );
});
