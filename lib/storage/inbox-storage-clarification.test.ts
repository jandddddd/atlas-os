import assert from "node:assert/strict";
import test from "node:test";

import { isClarificationDraft } from "./inbox-storage.ts";

const validDraft = {
  customerName: "Familie Berger",
  subject: "Rückfrage zu Ihrer Anfrage: Wohnzimmer streichen",
  message: "Guten Tag Familie Berger,\n\n...",
  missingInformation: ["Bilder", "genaue Raummaße"],
  status: "draft",
};

test("akzeptiert einen vollständigen Rückfrageentwurf", () => {
  assert.equal(isClarificationDraft(validDraft), true);
});

test("lehnt einen Entwurf mit fehlendem Betreff ab", () => {
  const withoutSubject: Record<string, unknown> = {
    customerName: validDraft.customerName,
    message: validDraft.message,
    missingInformation: validDraft.missingInformation,
    status: validDraft.status,
  };
  assert.equal(isClarificationDraft(withoutSubject), false);
});

test("lehnt einen Entwurf mit falschem Status ab", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, status: "sent" }),
    false,
  );
});

test("lehnt einen Entwurf mit nicht-textuellen fehlenden Informationen ab", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, missingInformation: ["Bilder", 5] }),
    false,
  );
});

test("lehnt Nicht-Objekte ab", () => {
  assert.equal(isClarificationDraft(null), false);
  assert.equal(isClarificationDraft("draft"), false);
  assert.equal(isClarificationDraft(undefined), false);
});
