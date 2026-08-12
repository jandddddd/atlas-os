import assert from "node:assert/strict";
import test from "node:test";

import {
  composeInquiry,
  validateInquiryIntake,
} from "./inquiry-intake.ts";

test("validates required contact and inquiry fields", () => {
  assert.deepEqual(
    validateInquiryIntake({ customer: "  ", location: "", message: "" }),
    {
      customer: "Bitte einen Kunden oder Kontakt angeben.",
      message: "Bitte die Kundenanfrage eingeben.",
    },
  );
});

test("allows a blank optional location", () => {
  assert.deepEqual(
    validateInquiryIntake({
      customer: "Familie Berger",
      location: "  ",
      message: "Bitte das Wohnzimmer streichen.",
    }),
    {},
  );
});

test("represents contact, location and message in the existing inquiry field", () => {
  assert.equal(
    composeInquiry({
      customer: " Familie Berger ",
      location: " Heidelberg ",
      message: " Wohnzimmer streichen. ",
    }),
    [
      "Kunde/Kontakt: Familie Berger",
      "Ort: Heidelberg",
      "Kundenanfrage:",
      "Wohnzimmer streichen.",
    ].join("\n"),
  );
});

test("omits the optional location line when location is blank", () => {
  assert.equal(
    composeInquiry({
      customer: "Familie Berger",
      location: "",
      message: "Wohnzimmer streichen.",
    }),
    [
      "Kunde/Kontakt: Familie Berger",
      "Kundenanfrage:",
      "Wohnzimmer streichen.",
    ].join("\n"),
  );
});
