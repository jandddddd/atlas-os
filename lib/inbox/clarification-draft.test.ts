import assert from "node:assert/strict";
import test from "node:test";

import { createClarificationDraft } from "./clarification-draft.ts";

test("erzeugt einen deterministischen Rückfrageentwurf aus fehlenden Informationen", () => {
  const draft = createClarificationDraft({
    customerName: "Familie Berger",
    service: "Wohnzimmer streichen",
    missingInformation: ["Bilder", "genaue Raummaße"],
  });

  assert.equal(draft.customerName, "Familie Berger");
  assert.equal(draft.subject, "Rückfrage zu Ihrer Anfrage: Wohnzimmer streichen");
  assert.deepEqual(draft.missingInformation, ["Bilder", "genaue Raummaße"]);
  assert.equal(draft.status, "draft");
  assert.equal(
    draft.message,
    [
      "Guten Tag,",
      "",
      "vielen Dank für Ihre Anfrage. Damit wir Ihnen ein passendes Angebot erstellen können, benötigen wir noch folgende Angaben von Ihnen:",
      "",
      "- Bilder",
      "- genaue Raummaße",
      "",
      "Über eine kurze Rückmeldung würden wir uns sehr freuen.",
      "",
      "Mit freundlichen Grüßen",
    ].join("\n"),
  );
});

test("übernimmt ausschließlich die übergebenen fehlenden Informationen, ohne weitere Angaben zu erfinden", () => {
  const missingInformation = ["Zugang zur Wohnung", "gewünschter Termin"];
  const draft = createClarificationDraft({
    customerName: "Herr Weber",
    service: "Fassade streichen",
    missingInformation,
  });

  for (const information of missingInformation) {
    assert.ok(draft.message.includes(`- ${information}`));
  }

  const questionLines = draft.message
    .split("\n")
    .filter((line) => line.startsWith("- "));
  assert.equal(questionLines.length, missingInformation.length);
});

test("verwendet immer die neutrale Anrede, wenn der Kundenname unbekannt ist", () => {
  const draft = createClarificationDraft({
    customerName: "Unbekannt",
    service: "Treppenhaus streichen",
    missingInformation: ["Anzahl der Stockwerke"],
  });

  assert.ok(draft.message.startsWith("Guten Tag,"));
});

test("fällt bei leerem Kundennamen ebenfalls auf die neutrale Anrede zurück", () => {
  const draft = createClarificationDraft({
    customerName: "   ",
    service: "Treppenhaus streichen",
    missingInformation: ["Anzahl der Stockwerke"],
  });

  assert.equal(draft.customerName, "Unbekannt");
  assert.ok(draft.message.startsWith("Guten Tag,"));
});

test("interpoliert einen Firmen- oder Freitextnamen nicht in die Anrede", () => {
  const draft = createClarificationDraft({
    customerName: "Malerbetrieb Weber",
    service: "Fassade streichen",
    missingInformation: ["Anzahl der Stockwerke"],
  });

  assert.equal(draft.customerName, "Malerbetrieb Weber");
  assert.ok(draft.message.startsWith("Guten Tag,"));
  assert.ok(!draft.message.includes("Guten Tag Malerbetrieb Weber"));
});

test("verwendet einen allgemeinen Betreff, wenn keine Leistung bekannt ist", () => {
  const draft = createClarificationDraft({
    customerName: "Familie Berger",
    service: "   ",
    missingInformation: ["Bilder"],
  });

  assert.equal(draft.subject, "Rückfrage zu Ihrer Anfrage");
});
