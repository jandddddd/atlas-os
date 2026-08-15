import assert from "node:assert/strict";
import test from "node:test";

import { encodeState, planRemediation } from "./codex-pr-remediation.mjs";

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const shaC = "c".repeat(40);
const pull = {
  number: 49,
  state: "open",
  draft: false,
  baseRef: "main",
  headRef: "feature/example",
  baseRepository: "jandddddd/atlas-os",
  headRepository: "jandddddd/atlas-os",
  headSha: shaB,
  changedPaths: ["components/inbox/InboxAnalysis.tsx"],
};
const state = {
  version: 1,
  prNumber: 49,
  round: 1,
  phase: "remediation_requested",
  boundHead: shaA,
  originalPaths: pull.changedPaths,
  findingIds: ["thread-1"],
};
const comments = [{
  author: "github-actions[bot]",
  createdAt: "2026-08-15T10:00:00Z",
  body: encodeState(state),
}];
const finding = {
  id: "thread-2",
  priority: "P2",
  path: "components/inbox/InboxAnalysis.tsx",
  body: "P2 still blocking",
};

test("automatic review can reconcile the expected remediation push before synchronize state is published", () => {
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: shaB, before: shaA },
    pull,
    findings: [finding],
    comments,
  });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.equal(result.state.round, 2);
  assert.equal(result.state.boundHead, shaB);
  assert.deepEqual(result.state.originalPaths, state.originalPaths);
});

test("clean automatic review can reconcile the expected remediation push before synchronize state is published", () => {
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: shaB, before: shaA },
    pull,
    findings: [],
    comments,
  });
  assert.equal(result.action, "CLEAN");
  assert.equal(result.state.round, 1);
  assert.equal(result.state.boundHead, shaB);
  assert.deepEqual(result.state.findingIds, state.findingIds);
});

test("automatic review still fails closed when the new head is not a direct child of the requested remediation head", () => {
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: shaB, before: shaC },
    pull,
    findings: [finding],
    comments,
  });
  assert.equal(result.action, "ESCALATE");
  assert.match(result.reason, /not bound to the reviewed PR head/);
  assert.equal(result.state.boundHead, shaA);
});
