import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createRepairPlan, parseRepairConfig, validateExpectedHeadSha } from "./atlas-pr-repair-plan.mjs";

const policySource = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
const policy = parseRepairConfig(policySource);
const workflow = readFileSync(new URL("../.github/workflows/atlas-pr-repair.yml", import.meta.url), "utf8");
const sha = "a".repeat(40);

const repairable = {
  prNumber: 42,
  baseBranch: "main",
  headBranch: "feature/fix",
  headSha: sha,
  headRepository: "atlas/atlas-os",
  baseRepository: "atlas/atlas-os",
  isFork: false,
  labels: ["atlas-repair"],
  files: ["scripts/example.mjs"],
  changedFiles: 1,
  additions: 10,
  deletions: 2,
  failedChecks: [{ name: "CI / verify", logExcerpt: "Assertion failed at test 4" }],
  reviewThreads: [],
  supervisor: { status: "BLOCKED", reasons: ["CI failed"] },
  blockReasons: ["required_check_failed"],
};

function plan(overrides = {}) {
  return createRepairPlan({ ...repairable, ...overrides }, policy);
}

test("MERGE_READY needs no repair", () => {
  assert.equal(plan({ supervisor: { status: "MERGE_READY", reasons: [] }, blockReasons: [] }).status, "NO_REPAIR_NEEDED");
});

test("running CI blocks repair", () => {
  assert.equal(plan({ supervisor: { status: "WAITING", reasons: ["CI running"] }, blockReasons: [] }).status, "REPAIR_BLOCKED");
});

test("failed required CI is eligible but kill-switch prevents starting", () => {
  const result = plan();
  assert.equal(result.status, "REPAIR_ELIGIBLE");
  assert.equal(result.safeToStart, false);
  assert.equal(result.attemptKey, `42:${sha}`);
});

for (const priority of ["P1", "P2"]) {
  test(`open ${priority} is eligible`, () => {
    const result = plan({
      failedChecks: [],
      reviewThreads: [{ priority, resolved: false, path: "app/page.tsx", line: 7, body: "Handle the error." }],
      blockReasons: ["blocking_review_found"],
    });
    assert.equal(result.status, "REPAIR_ELIGIBLE");
  });
}

test("P3 alone does not trigger repair", () => {
  assert.equal(plan({ reviewThreads: [{ priority: "P3", resolved: false }], blockReasons: [] }).status, "REPAIR_BLOCKED");
});

test("missing repair label blocks", () => assert.equal(plan({ labels: [] }).status, "REPAIR_BLOCKED"));
test("fork pull request blocks", () => assert.equal(plan({ isFork: true }).status, "REPAIR_BLOCKED"));
test("forbidden path blocks", () => assert.equal(plan({ files: [".github/workflows/ci.yml"] }).status, "REPAIR_BLOCKED"));
test("changed-file limit blocks", () => assert.equal(plan({ changedFiles: 11 }).status, "REPAIR_BLOCKED"));
test("changed-line limit blocks", () => assert.equal(plan({ additions: 500, deletions: 1 }).status, "REPAIR_BLOCKED"));
test("security label blocks", () => assert.equal(plan({ labels: ["atlas-repair", "security"] }).status, "REPAIR_BLOCKED"));

test("stale expected SHA aborts", () => {
  assert.throws(() => validateExpectedHeadSha("b".repeat(40), sha), /stale/);
  assert.match(workflow, /expected_head_sha is stale/);
  assert.match(workflow, /core\.setFailed/);
});

test("revalidates the SHA immediately before plan creation", () => {
  const validation = workflow.indexOf("name: Revalidate head SHA before plan creation");
  const plan = workflow.indexOf("name: Create deterministic repair plan");
  assert.ok(validation >= 0 && plan > validation);
  assert.match(workflow.slice(validation, plan), /expected_head_sha is stale/);
});

test("prompt contains diagnostics and findings but redacts known secrets", () => {
  const result = plan({
    failedChecks: [{ name: "CI / verify", logExcerpt: "failure token=topsecretvalue sk-abcdefghijklmnop" }],
    reviewThreads: [{ priority: "P1", resolved: false, path: "app/page.tsx", line: 7, body: "Bearer abc.def.ghi must be removed" }],
    blockReasons: ["required_check_failed", "blocking_review_found"],
  });
  assert.match(result.prompt, /CI \/ verify/);
  assert.match(result.prompt, /app\/page\.tsx:7/);
  assert.match(result.prompt, /\[REDACTED\]/);
  assert.doesNotMatch(result.prompt, /topsecretvalue|sk-abcdefghijklmnop|abc\.def\.ghi/);
});

test("workflow is manual, read-only, trusted-main planning only", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /pull_request_target:|pull_request:|schedule:/);
  assert.match(workflow, /contents: read\n  pull-requests: read\n  checks: read\n  actions: read/);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|codex|git push|contents: write|pull-requests: write/);
});
