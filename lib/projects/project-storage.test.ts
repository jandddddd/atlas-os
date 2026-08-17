import assert from "node:assert/strict";
import test from "node:test";

import type { OfferDraft } from "../../components/inbox/types.ts";
import type { OfferWorkspaceEntry } from "../storage/inbox-storage.ts";
import {
  findProjectBySourceOffer,
  prepareProjectFromReviewedOffer,
} from "./project-storage.ts";

const offer: OfferDraft = {
  customerName: "Familie Schneider",
  title: "Angebotsentwurf Innenarbeiten",
  projectSummary: "Wohnzimmer und Flur streichen.",
  positions: [],
  assumptions: [],
  missingInformation: ["Genaue Raummaße"],
  recommendedNextStep: "Maße fachlich prüfen.",
  status: "draft",
};

function offerEntry(status: OfferWorkspaceEntry["status"]): OfferWorkspaceEntry {
  return {
    id: "workflow-1",
    workflowId: "workflow-1",
    offer,
    status,
    updatedAt: "2026-08-17T10:00:00.000Z",
  };
}

test("prepares a project snapshot only from a reviewed offer", () => {
  const preparedAt = "2026-08-17T12:00:00.000Z";
  const projects = prepareProjectFromReviewedOffer([], offerEntry("reviewed"), preparedAt);

  assert.deepEqual(projects, [
    {
      id: "workflow-1",
      sourceOfferWorkflowId: "workflow-1",
      customerName: "Familie Schneider",
      title: "Angebotsentwurf Innenarbeiten",
      summary: "Wohnzimmer und Flur streichen.",
      openPoints: ["Genaue Raummaße"],
      status: "preparation",
      createdAt: preparedAt,
      updatedAt: preparedAt,
    },
  ]);
});

test("does not treat a pending review as permission to prepare a project", () => {
  const projects: [] = [];

  assert.strictEqual(
    prepareProjectFromReviewedOffer(
      projects,
      offerEntry("review-pending"),
      "2026-08-17T12:00:00.000Z",
    ),
    projects,
  );
});

test("keeps preparation idempotent for the exact source offer", () => {
  const first = prepareProjectFromReviewedOffer(
    [],
    offerEntry("reviewed"),
    "2026-08-17T12:00:00.000Z",
  );
  const second = prepareProjectFromReviewedOffer(
    first,
    offerEntry("reviewed"),
    "2026-08-17T13:00:00.000Z",
  );

  assert.strictEqual(second, first);
  assert.equal(second.length, 1);
  assert.equal(findProjectBySourceOffer(second, "workflow-1"), first[0]);
  assert.equal(findProjectBySourceOffer(second, "other-workflow"), null);
});
