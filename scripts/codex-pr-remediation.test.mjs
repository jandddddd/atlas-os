import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { decodeState, encodeState, findPriority, planRemediation } from "./codex-pr-remediation.mjs";

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const shaC = "c".repeat(40);
const basePull = {
  number: 49,
  state: "open",
  draft: false,
  baseRef: "main",
  headRef: "feature/example",
  baseRepository: "jandddddd/atlas-os",
  headRepository: "jandddddd/atlas-os",
  headSha: shaA,
  changedPaths: ["components/inbox/InboxAnalysis.tsx"],
};
const finding = { id: "thread-1", priority: "P1", path: "components/inbox/InboxAnalysis.tsx", body: "P1 fix this" };

function comment(state, createdAt = "2026-08-14T10:00:00Z") {
  return { author: "github-actions[bot]", createdAt, body: encodeState(state) };
}

test("priority parsing is limited to P1 and P2", () => {
  assert.equal(findPriority("[P2] issue"), "P2");
  assert.equal(findPriority("P3 only"), null);
});

test("first current-head finding requests round one on the same branch", () => {
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [finding], comments: [] });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.equal(result.state.round, 1);
  assert.equal(result.state.boundHead, shaA);
});

test("stale review fails closed", () => {
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaB }, pull: basePull, findings: [finding], comments: [] });
  assert.equal(result.action, "ESCALATE");
  assert.match(result.reason, /not bound/);
});

test("expected remediation push requests a fresh review for the new head", () => {
  const state = { version: 1, prNumber: 49, round: 1, phase: "remediation_requested", boundHead: shaA, originalPaths: basePull.changedPaths, findingIds: ["thread-1"] };
  const result = planRemediation({ event: { name: "synchronize", before: shaA }, pull: { ...basePull, headSha: shaB }, findings: [], comments: [comment(state)] });
  assert.equal(result.action, "REQUEST_REVIEW");
  assert.equal(result.state.boundHead, shaB);
  assert.equal(result.state.round, 1);
});

test("unexpected head transition escalates", () => {
  const state = { version: 1, prNumber: 49, round: 1, phase: "remediation_requested", boundHead: shaA, originalPaths: basePull.changedPaths, findingIds: ["thread-1"] };
  const result = planRemediation({ event: { name: "synchronize", before: shaC }, pull: { ...basePull, headSha: shaB }, findings: [], comments: [comment(state)] });
  assert.equal(result.action, "ESCALATE");
});

test("second reviewed head gets the final allowed remediation round", () => {
  const state = { version: 1, prNumber: 49, round: 1, phase: "review_requested", boundHead: shaA, originalPaths: basePull.changedPaths, findingIds: ["thread-1"] };
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [{ ...finding, id: "thread-2" }], comments: [comment(state)] });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.equal(result.state.round, 2);
});

test("findings after two rounds require human escalation", () => {
  const state = { version: 1, prNumber: 49, round: 2, phase: "review_requested", boundHead: shaA, originalPaths: basePull.changedPaths, findingIds: ["thread-2"] };
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [finding], comments: [comment(state)] });
  assert.equal(result.action, "ESCALATE");
  assert.match(result.reason, /two remediation rounds/);
});

test("new finding outside original scope escalates but test helpers remain eligible", () => {
  const state = { version: 1, prNumber: 49, round: 1, phase: "review_requested", boundHead: shaA, originalPaths: basePull.changedPaths, findingIds: ["thread-1"] };
  const comments = [comment(state)];
  const unrelated = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [{ ...finding, id: "thread-2", path: "app/api/admin/route.ts" }], comments });
  assert.equal(unrelated.action, "ESCALATE");
  const helper = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [{ ...finding, id: "thread-3", path: "tests/inbox-helper.ts" }], comments });
  assert.equal(helper.action, "REQUEST_REMEDIATION");
});

test("clean fresh review stops without merge behavior", () => {
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings: [], comments: [] });
  assert.equal(result.action, "CLEAN");
});

test("workflow has no merge, Repair Execute, secret, or contents-write path", () => {
  const workflow = readFileSync(new URL("../.github/workflows/codex-pr-remediation.yml", import.meta.url), "utf8");
  assert.doesNotMatch(workflow, /pulls\.merge|enablePullRequestAutoMerge|git push|contents:\s*write|OPENAI_API_KEY|secrets\.|atlas-pr-repair-execute|repair-attempt/i);
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /@codex review/);
});

test("state marker round-trips only a bounded valid state", () => {
  const state = { version: 1, prNumber: 49, round: 2, phase: "review_requested", boundHead: shaA, originalPaths: [], findingIds: [] };
  assert.deepEqual(decodeState(encodeState(state)), state);
  assert.equal(decodeState(encodeState({ ...state, round: 3 })), null);
  assert.equal(decodeState(encodeState({ ...state, originalPaths: null })), null);
});
