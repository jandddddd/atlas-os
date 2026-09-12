import assert from "node:assert/strict";
import test from "node:test";

import type { ClarificationDraft } from "../../components/inbox/types.ts";
import {
  getClarificationCommunicationStatus,
  isClarificationDraft,
} from "./inbox-storage.ts";

const validDraft = {
  customerName: "Familie Berger",
  subject: "Rückfrage zu Ihrer Anfrage: Wohnzimmer streichen",
  message: "Guten Tag Familie Berger,\n\n...",
  missingInformation: ["Bilder", "genaue Raummaße"],
  status: "draft",
} satisfies ClarificationDraft;

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

test("akzeptiert einen Entwurf ohne communicationStatus (Legacy-Form) weiterhin als gültig", () => {
  assert.equal(isClarificationDraft(validDraft), true);
});

test("akzeptiert einen Entwurf mit communicationStatus prepared oder sent", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, communicationStatus: "prepared" }),
    true,
  );
  assert.equal(
    isClarificationDraft({ ...validDraft, communicationStatus: "sent" }),
    true,
  );
});

test("lehnt einen Entwurf mit ungültigem communicationStatus-Wert ab", () => {
  assert.equal(
    isClarificationDraft({ ...validDraft, communicationStatus: "delivered" }),
    false,
  );
});

test("ein Legacy-Entwurf ohne communicationStatus gilt als prepared, niemals als sent", () => {
  assert.equal(getClarificationCommunicationStatus(validDraft), "prepared");
});

test("ein Entwurf mit communicationStatus sent gilt als sent", () => {
  assert.equal(
    getClarificationCommunicationStatus({ ...validDraft, communicationStatus: "sent" }),
    "sent",
  );
});

test("ein Entwurf mit communicationStatus prepared gilt als prepared", () => {
  assert.equal(
    getClarificationCommunicationStatus({ ...validDraft, communicationStatus: "prepared" }),
    "prepared",
  );
});
