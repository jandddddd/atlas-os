import assert from "node:assert/strict";
import test from "node:test";

import type { OfferDraft } from "../../components/inbox/types.ts";
import { formatOfferDraftForCopy } from "./offer-copy-text.ts";

const baseOffer: OfferDraft = {
  customerName: "Familie Schneider",
  title: "Angebotsentwurf Wohnzimmer streichen",
  projectSummary: "Streichen von Wohnzimmer und Flur auf Basis der Kundenanfrage.",
  positions: [
    {
      id: 1,
      description: "Malerarbeiten Wohnzimmer",
      quantity: 0,
      unit: "noch zu ermitteln",
      notes: "Genaue Maße stehen noch aus.",
    },
    {
      id: 2,
      description: "Malerarbeiten Flur",
      quantity: 12,
      unit: "m²",
      notes: "",
    },
  ],
  assumptions: ["Die genannte Fläche beschreibt die Raumfläche, nicht Wand- oder Deckenflächen."],
  missingInformation: ["Bilder", "genaue Raummaße"],
  recommendedNextStep: "Besichtigung oder Bildmaterial anfordern.",
  status: "draft",
};

test("formatiert denselben Entwurf deterministisch identisch", () => {
  assert.equal(formatOfferDraftForCopy(baseOffer), formatOfferDraftForCopy(baseOffer));
});

test("enthält Titel, Kunde und Projektbeschreibung", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.match(text, /Angebotsentwurf Wohnzimmer streichen/);
  assert.match(text, /Kunde: Familie Schneider/);
  assert.match(text, /Streichen von Wohnzimmer und Flur/);
});

test("übernimmt Positionen mit vorhandener Menge und Einheit unverändert", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.match(text, /Malerarbeiten Wohnzimmer — Menge: 0 noch zu ermitteln/);
  assert.match(text, /Malerarbeiten Flur — Menge: 12 m²/);
});

test("zeigt eine vorhandene Notiz zur Position, aber keine leere Notiz", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.match(text, /Hinweis: Genaue Maße stehen noch aus\./);
  const noteLines = text.split("\n").filter((line) => line.trim().startsWith("Hinweis:"));
  assert.equal(noteLines.length, 1);
});

test("zeigt vorhandene Annahmen", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.match(text, /Annahmen:/);
  assert.match(text, /Die genannte Fläche beschreibt die Raumfläche/);
});

test("lässt den Annahmen-Abschnitt weg, wenn keine Annahmen vorhanden sind", () => {
  const text = formatOfferDraftForCopy({ ...baseOffer, assumptions: [] });

  assert.doesNotMatch(text, /Annahmen:/);
});

test("enthält keine internen Felder wie recommendedNextStep, missingInformation oder status", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.doesNotMatch(text, /Besichtigung oder Bildmaterial anfordern/);
  assert.doesNotMatch(text, /Bilder/);
  assert.doesNotMatch(text, /genaue Raummaße/);
  assert.doesNotMatch(text, /draft/);
});

test("erfindet keine Preise oder zusätzlichen Fakten", () => {
  const text = formatOfferDraftForCopy(baseOffer);

  assert.doesNotMatch(text, /€|EUR/);
});
