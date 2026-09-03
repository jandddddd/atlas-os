import assert from "node:assert/strict";
import test from "node:test";

import { isStoredInquiryContext } from "./inbox-storage.ts";

const validContext = {
  version: 1,
  workflowId: "workflow-1",
  text: "Kunde/Kontakt: Familie Berger\nKundenanfrage:\nBitte das Wohnzimmer streichen.",
};

test("akzeptiert einen vollständigen, versionierten Inquiry-Kontext", () => {
  assert.equal(isStoredInquiryContext(validContext), true);
});

test("lehnt eine falsche Version ab", () => {
  assert.equal(isStoredInquiryContext({ ...validContext, version: 2 }), false);
});

test("lehnt einen fehlenden workflowId ab", () => {
  const withoutWorkflowId: Record<string, unknown> = {
    version: validContext.version,
    text: validContext.text,
  };
  assert.equal(isStoredInquiryContext(withoutWorkflowId), false);
});

test("lehnt einen nicht-textuellen Kontexttext ab", () => {
  assert.equal(
    isStoredInquiryContext({ ...validContext, text: 42 }),
    false,
  );
});

test("lehnt Nicht-Objekte ab", () => {
  assert.equal(isStoredInquiryContext(null), false);
  assert.equal(isStoredInquiryContext("kontext"), false);
  assert.equal(isStoredInquiryContext(undefined), false);
});
