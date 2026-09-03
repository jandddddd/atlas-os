import assert from "node:assert/strict";
import test from "node:test";

import {
  composeInquiryWithCustomerReply,
  validateCustomerReply,
} from "./customer-reply.ts";

test("übernimmt den bisherigen Kontext vollständig und unverändert", () => {
  const previousContext = [
    "Kunde/Kontakt: Familie Berger",
    "Kundenanfrage:",
    "Bitte das Wohnzimmer streichen.",
  ].join("\n");

  const composed = composeInquiryWithCustomerReply(
    previousContext,
    "Die Wandfläche beträgt etwa 40 m².",
  );

  assert.ok(composed.startsWith(previousContext));
});

test("ergänzt die neue Kundenantwort klar getrennt mit eigenem Abschnittsmarker", () => {
  const composed = composeInquiryWithCustomerReply(
    "Ursprüngliche Anfrage.",
    "Die Wandfläche beträgt etwa 40 m².",
  );

  assert.ok(composed.includes("Neu eingegangene Kundenantwort:"));
  assert.ok(composed.includes("Die Wandfläche beträgt etwa 40 m²."));
  assert.ok(composed.includes("---"));
});

test("erfindet und verändert keinen der beiden Textbestandteile", () => {
  const previousContext = "Ursprüngliche Anfrage mit Detail X.";
  const customerReply = "Kundenantwort mit Detail Y.";

  const composed = composeInquiryWithCustomerReply(previousContext, customerReply);

  assert.ok(composed.includes(previousContext));
  assert.ok(composed.includes(customerReply));
});

test("unterstützt mehrere aufeinanderfolgende Antworten kumulativ", () => {
  const original = [
    "Kunde/Kontakt: Familie Berger",
    "Kundenanfrage:",
    "Bitte das Wohnzimmer streichen.",
  ].join("\n");

  const afterFirstReply = composeInquiryWithCustomerReply(
    original,
    "Die Wandfläche beträgt etwa 40 m².",
  );
  const afterSecondReply = composeInquiryWithCustomerReply(
    afterFirstReply,
    "Der Wunschtermin ist Ende des Monats.",
  );

  assert.ok(afterSecondReply.includes("Bitte das Wohnzimmer streichen."));
  assert.ok(afterSecondReply.includes("Die Wandfläche beträgt etwa 40 m²."));
  assert.ok(afterSecondReply.includes("Der Wunschtermin ist Ende des Monats."));

  const firstReplyIndex = afterSecondReply.indexOf("Die Wandfläche beträgt etwa 40 m².");
  const secondReplyIndex = afterSecondReply.indexOf("Der Wunschtermin ist Ende des Monats.");
  assert.ok(firstReplyIndex < secondReplyIndex);
});

test("lehnt eine leere Kundenantwort ab", () => {
  assert.equal(
    validateCustomerReply(""),
    "Bitte die Antwort des Kunden eingeben.",
  );
});

test("lehnt eine reine Whitespace-Kundenantwort ab", () => {
  assert.equal(
    validateCustomerReply("   \n\t  "),
    "Bitte die Antwort des Kunden eingeben.",
  );
});

test("akzeptiert eine gültige Kundenantwort", () => {
  assert.equal(validateCustomerReply("Die Fläche beträgt 40 m²."), undefined);
});
