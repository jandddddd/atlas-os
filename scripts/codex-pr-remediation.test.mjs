import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  decodeState,
  encodeState,
  findPriority,
  isCodexReviewer,
  normalizeGitHubLogin,
  planRemediation,
  selectUnresolvedReviewFindings,
} from "./codex-pr-remediation.mjs";

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

function reviewThread({ id, resolved = false, commentId, priority = "P2", path = "components/inbox/InboxAnalysis.tsx" }) {
  return {
    id,
    isResolved: resolved,
    comments: [{
      databaseId: commentId,
      author: "chatgpt-codex-connector[bot]",
      body: `${priority} review finding`,
      path,
    }],
  };
}

function comment(state, createdAt = "2026-08-14T10:00:00Z") {
  return { author: "github-actions[bot]", createdAt, body: encodeState(state) };
}

test("priority parsing is limited to P1 and P2", () => {
  assert.equal(findPriority("[P2] issue"), "P2");
  assert.equal(findPriority("P3 only"), null);
});

test("Codex author identity is normalized consistently across GitHub surfaces", () => {
  assert.equal(normalizeGitHubLogin("chatgpt-codex-connector[bot]"), "chatgpt-codex-connector");
  assert.equal(normalizeGitHubLogin("ChatGPT-Codex-Connector"), "chatgpt-codex-connector");
  assert.equal(isCodexReviewer("chatgpt-codex-connector[bot]"), true);
  assert.equal(isCodexReviewer("chatgpt-codex-connector"), true);
  assert.equal(isCodexReviewer("another-reviewer[bot]"), false);
});

test("unresolved P2 from the current review triggers remediation", () => {
  const findings = selectUnresolvedReviewFindings(
    [reviewThread({ id: "thread-p2", commentId: 101 })],
    new Set(["101"]),
  );
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings, comments: [] });
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.deepEqual(result.state.findingIds, ["thread-p2"]);
});

test("actual GraphQL Codex bot login keeps unresolved P1 out of CLEAN", () => {
  const findings = selectUnresolvedReviewFindings(
    [reviewThread({ id: "graphql-p1", commentId: 107, priority: "P1" })],
    new Set(["107"]),
  );
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings, comments: [] });
  assert.equal(findings[0].priority, "P1");
  assert.equal(result.action, "REQUEST_REMEDIATION");
  assert.notEqual(result.action, "CLEAN");
});

test("resolved P2 does not trigger or enter stored remediation state", () => {
  const findings = selectUnresolvedReviewFindings(
    [reviewThread({ id: "resolved-p2", resolved: true, commentId: 102 })],
    new Set(["102"]),
  );
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings, comments: [] });
  assert.deepEqual(findings, []);
  assert.equal(result.action, "CLEAN");
  assert.deepEqual(result.state.findingIds, []);
});

test("mixed thread state includes and stores only unresolved current-review findings", () => {
  const findings = selectUnresolvedReviewFindings([
    reviewThread({ id: "resolved", resolved: true, commentId: 103 }),
    reviewThread({ id: "unresolved", commentId: 104 }),
    reviewThread({ id: "other-review", commentId: 105 }),
  ], new Set(["103", "104"]));
  const result = planRemediation({ event: { name: "review", reviewHeadSha: shaA }, pull: basePull, findings, comments: [] });
  assert.deepEqual(findings.map((item) => item.id), ["unresolved"]);
  assert.deepEqual(result.state.findingIds, ["unresolved"]);
});

test("a later resolution snapshot cannot resurrect a previously open finding", () => {
  const open = selectUnresolvedReviewFindings(
    [reviewThread({ id: "thread-changing", commentId: 106 })],
    new Set(["106"]),
  );
  const resolved = selectUnresolvedReviewFindings(
    [reviewThread({ id: "thread-changing", resolved: true, commentId: 106 })],
    new Set(["106"]),
  );
  assert.equal(open.length, 1);
  assert.deepEqual(resolved, []);
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
  assert.match(workflow, /isResolved/);
  assert.match(workflow, /trusted-module\.outputs\.available == 'true'/);
});

test("non-main pull requests are rejected before trusted checkout or coordinator import", () => {
  const workflow = readFileSync(new URL("../.github/workflows/codex-pr-remediation.yml", import.meta.url), "utf8");
  const coordinateJob = workflow.slice(workflow.indexOf("  coordinate:"));
  const mainOnlyGate = coordinateJob.indexOf("if: github.event.pull_request.base.ref == 'main'");
  const checkout = coordinateJob.indexOf("name: Checkout trusted base revision");
  const moduleImport = coordinateJob.indexOf("scripts/codex-pr-remediation.mjs");
  assert.ok(mainOnlyGate >= 0, "coordinate job must have a main-only eligibility gate");
  assert.ok(mainOnlyGate < checkout, "main-only eligibility must be evaluated before checkout");
  assert.ok(mainOnlyGate < moduleImport, "main-only eligibility must be evaluated before coordinator import");
  assert.match(coordinateJob, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
});

test("state marker round-trips only a bounded valid state", () => {
  const state = { version: 1, prNumber: 49, round: 2, phase: "review_requested", boundHead: shaA, originalPaths: [], findingIds: [] };
  assert.deepEqual(decodeState(encodeState(state)), state);
  assert.equal(decodeState(encodeState({ ...state, round: 3 })), null);
  assert.equal(decodeState(encodeState({ ...state, originalPaths: null })), null);
});
