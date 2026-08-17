import assert from "node:assert/strict";
import test from "node:test";

import type { OfferDraft } from "../../components/inbox/types.ts";
import {
  filterOfferWorkspaceEntries,
  findOfferWorkspaceEntry,
  reviewOfferWorkspaceEntry,
  reviseOfferWorkspaceEntry,
  upsertOfferWorkspaceEntry,
  type OfferWorkspaceEntry,
} from "./inbox-storage.ts";

const offer: OfferDraft = {
  customerName: "Beispielkunde",
  title: "Angebotsentwurf Innenarbeiten",
  projectSummary: "Vorbereiteter Entwurf ohne Preise.",
  positions: [],
  assumptions: [],
  missingInformation: ["Maße"],
  recommendedNextStep: "Maße fachlich prüfen.",
  status: "draft",
};

test("adds a new offer workflow as review-pending", () => {
  const entries = upsertOfferWorkspaceEntry(
    [],
    offer,
    "workflow-1",
    "2026-08-17T10:00:00.000Z",
  );

  assert.deepEqual(entries, [
    {
      id: "workflow-1",
      workflowId: "workflow-1",
      offer,
      status: "review-pending",
      updatedAt: "2026-08-17T10:00:00.000Z",
    },
  ]);
});

test("replaces only the matching workflow and moves it to the front", () => {
  const previous: OfferWorkspaceEntry[] = [
    {
      id: "workflow-2",
      workflowId: "workflow-2",
      offer: { ...offer, title: "Anderer Entwurf" },
      status: "reviewed",
      updatedAt: "2026-08-16T10:00:00.000Z",
    },
    {
      id: "workflow-1",
      workflowId: "workflow-1",
      offer,
      status: "reviewed",
      updatedAt: "2026-08-15T10:00:00.000Z",
    },
  ];
  const entries = upsertOfferWorkspaceEntry(
    previous,
    { ...offer, title: "Überarbeiteter Entwurf" },
    "workflow-1",
    "2026-08-17T11:00:00.000Z",
  );

  assert.equal(entries[0].offer.title, "Überarbeiteter Entwurf");
  assert.equal(entries[0].status, "review-pending");
  assert.equal(entries[1].workflowId, "workflow-2");
});

test("marks only the matching offer workflow as reviewed", () => {
  const entries = upsertOfferWorkspaceEntry(
    [],
    offer,
    "workflow-1",
    "2026-08-17T10:00:00.000Z",
  );
  const reviewed = reviewOfferWorkspaceEntry(
    entries,
    "workflow-1",
    "2026-08-17T12:00:00.000Z",
  );

  assert.equal(reviewed[0].status, "reviewed");
  assert.equal(reviewed[0].updatedAt, "2026-08-17T12:00:00.000Z");
  assert.strictEqual(
    reviewOfferWorkspaceEntry(
      reviewed,
      "missing-workflow",
      "2026-08-17T13:00:00.000Z",
    ),
    reviewed,
  );
});

test("finds a historical offer only by its exact workspace id", () => {
  const entries = upsertOfferWorkspaceEntry(
    [],
    offer,
    "workflow-1",
    "2026-08-17T10:00:00.000Z",
  );

  assert.equal(findOfferWorkspaceEntry(entries, "workflow-1"), entries[0]);
  assert.equal(findOfferWorkspaceEntry(entries, "workflow-2"), null);
});

test("filters offer workflows by normalized search text and status", () => {
  const entries: OfferWorkspaceEntry[] = [
    {
      id: "workflow-1",
      workflowId: "workflow-1",
      offer: { ...offer, customerName: "Familie Müller" },
      status: "review-pending",
      updatedAt: "2026-08-17T10:00:00.000Z",
    },
    {
      id: "workflow-2",
      workflowId: "workflow-2",
      offer: { ...offer, title: "Fassadenanstrich Gewerbehalle" },
      status: "reviewed",
      updatedAt: "2026-08-17T11:00:00.000Z",
    },
  ];

  assert.deepEqual(filterOfferWorkspaceEntries(entries, "  MÜLLER ", "all"), [entries[0]]);
  assert.deepEqual(filterOfferWorkspaceEntries(entries, "fassade", "reviewed"), [entries[1]]);
  assert.deepEqual(filterOfferWorkspaceEntries(entries, "fassade", "review-pending"), []);
  assert.deepEqual(filterOfferWorkspaceEntries(entries, "", "all"), entries);
  assert.deepEqual(filterOfferWorkspaceEntries(entries, "", "all", "missing"), entries);
  const completeEntry = {
    ...entries[1],
    offer: { ...entries[1].offer, missingInformation: [] },
  };
  assert.deepEqual(
    filterOfferWorkspaceEntries([entries[0], completeEntry], "", "all", "complete"),
    [completeEntry],
  );
  assert.deepEqual(
    filterOfferWorkspaceEntries([entries[0], completeEntry], "", "reviewed", "missing"),
    [],
  );
});

test("revises only the selected archived offer and reopens its review", () => {
  const first: OfferWorkspaceEntry = {
    id: "workflow-1",
    workflowId: "workflow-1",
    offer,
    status: "reviewed",
    updatedAt: "2026-08-17T10:00:00.000Z",
  };
  const second: OfferWorkspaceEntry = {
    id: "workflow-2",
    workflowId: "workflow-2",
    offer: { ...offer, title: "Anderer Entwurf" },
    status: "reviewed",
    updatedAt: "2026-08-17T11:00:00.000Z",
  };
  const revisedOffer = { ...offer, title: "Überarbeiteter Entwurf" };
  const revised = reviseOfferWorkspaceEntry(
    [first, second],
    "workflow-1",
    revisedOffer,
    "2026-08-17T12:00:00.000Z",
  );

  assert.equal(revised[0].offer, revisedOffer);
  assert.equal(revised[0].status, "review-pending");
  assert.equal(revised[0].updatedAt, "2026-08-17T12:00:00.000Z");
  assert.equal(revised[1], second);
  const unchanged = [first];
  assert.strictEqual(
    reviseOfferWorkspaceEntry(unchanged, "missing", revisedOffer, "2026-08-17T12:00:00.000Z"),
    unchanged,
  );
});
