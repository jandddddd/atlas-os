import assert from "node:assert/strict";
import test from "node:test";

import type { OfferDraft } from "../../components/inbox/types.ts";
import {
  isOfferBindingFlaggedForReview,
  isStoredOfferDraftBinding,
  requestOfferWorkspaceReview,
  type OfferWorkspaceEntry,
  type StoredOfferDraftBinding,
} from "./inbox-storage.ts";

const offer: OfferDraft = {
  customerName: "Beispielkunde",
  title: "Angebotsentwurf Innenarbeiten",
  projectSummary: "Vorbereiteter Entwurf ohne Preise.",
  positions: [],
  assumptions: [],
  missingInformation: [],
  recommendedNextStep: "Angebot prüfen.",
  status: "draft",
};

test("bestehende Offer-Bindings ohne needsReview bleiben rückwärtskompatibel gültig", () => {
  assert.equal(
    isStoredOfferDraftBinding({ version: 1, workflowId: "workflow-1" }),
    true,
  );
});

test("akzeptiert eine Bindung, die als needsReview markiert wurde", () => {
  assert.equal(
    isStoredOfferDraftBinding({
      version: 1,
      workflowId: "workflow-1",
      needsReview: true,
    }),
    true,
  );
});

test("lehnt eine Bindung mit ungültigem needsReview-Typ ab", () => {
  assert.equal(
    isStoredOfferDraftBinding({
      version: 1,
      workflowId: "workflow-1",
      needsReview: "true",
    }),
    false,
  );
});

test("setzt einen zuvor geprüften Workspace-Eintrag bei neuer Kundeninformation auf review-pending zurück", () => {
  const entries: OfferWorkspaceEntry[] = [
    {
      id: "workflow-1",
      workflowId: "workflow-1",
      offer,
      status: "reviewed",
      updatedAt: "2026-08-17T10:00:00.000Z",
    },
  ];

  const revised = requestOfferWorkspaceReview(
    entries,
    "workflow-1",
    "2026-09-03T09:00:00.000Z",
  );

  assert.equal(revised[0].status, "review-pending");
  assert.equal(revised[0].updatedAt, "2026-09-03T09:00:00.000Z");
  assert.equal(revised[0].offer, offer);
});

test("erkennt ein für Re-Review markiertes Binding derselben workflowId", () => {
  const binding: StoredOfferDraftBinding = {
    version: 1,
    workflowId: "workflow-1",
    needsReview: true,
  };

  assert.equal(isOfferBindingFlaggedForReview(binding, "workflow-1"), true);
});

test("ignoriert needsReview für eine andere workflowId", () => {
  const binding: StoredOfferDraftBinding = {
    version: 1,
    workflowId: "workflow-1",
    needsReview: true,
  };

  assert.equal(isOfferBindingFlaggedForReview(binding, "workflow-2"), false);
});

test("ein Binding ohne needsReview blockiert die Freigabe nicht", () => {
  const binding: StoredOfferDraftBinding = {
    version: 1,
    workflowId: "workflow-1",
  };

  assert.equal(isOfferBindingFlaggedForReview(binding, "workflow-1"), false);
});

test("kein Binding blockiert die Freigabe nicht", () => {
  assert.equal(isOfferBindingFlaggedForReview(null, "workflow-1"), false);
});

test("lässt Einträge anderer Workflows unverändert und macht bei fehlendem Treffer nichts", () => {
  const entries: OfferWorkspaceEntry[] = [
    {
      id: "workflow-2",
      workflowId: "workflow-2",
      offer,
      status: "reviewed",
      updatedAt: "2026-08-17T10:00:00.000Z",
    },
  ];

  const unchanged = requestOfferWorkspaceReview(
    entries,
    "missing-workflow",
    "2026-09-03T09:00:00.000Z",
  );

  assert.strictEqual(unchanged, entries);
});
