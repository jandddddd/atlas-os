import assert from "node:assert/strict";
import test from "node:test";

import { encodeState, planRemediation } from "./codex-pr-remediation.mjs";

const sha = "a".repeat(40);
const pull = {
  number: 49,
  state: "open",
  draft: false,
  baseRef: "main",
  headRef: "feature/example",
  baseRepository: "jandddddd/atlas-os",
  headRepository: "jandddddd/atlas-os",
  headSha: sha,
  changedPaths: ["components/inbox/InboxAnalysis.tsx"],
};
const finding = {
  id: "thread-new",
  priority: "P2",
  path: "components/inbox/InboxAnalysis.tsx",
  body: "P2 fix this",
};

function comment(state) {
  return {
    author: "github-actions[bot]",
    createdAt: "2026-08-15T11:00:00Z",
    body: encodeState(state),
  };
}

test("initial clean audit does not consume remediation round one", () => {
  const clean = {
    version: 1,
    prNumber: 49,
    round: 1,
    phase: "clean",
    boundHead: sha,
    originalPaths: pull.changedPaths,
    findingIds: [],
  };
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: sha },
    pull,
    findings: [finding],
    comments: [comment(clean)],
  });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.equal(result.state.round, 1);
});

test("clean state after remediation advances to the next bounded round", () => {
  const clean = {
    version: 1,
    prNumber: 49,
    round: 1,
    phase: "clean",
    boundHead: sha,
    originalPaths: pull.changedPaths,
    findingIds: ["thread-previous"],
  };
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: sha },
    pull,
    findings: [finding],
    comments: [comment(clean)],
  });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.equal(result.state.round, 2);
});

test("blocking rereview after a clean round two escalates", () => {
  const clean = {
    version: 1,
    prNumber: 49,
    round: 2,
    phase: "clean",
    boundHead: sha,
    originalPaths: pull.changedPaths,
    findingIds: ["thread-previous"],
  };
  const result = planRemediation({
    event: { name: "review", reviewHeadSha: sha },
    pull,
    findings: [finding],
    comments: [comment(clean)],
  });
  assert.equal(result.action, "ESCALATE");
  assert.match(result.reason, /two remediation rounds/);
});
