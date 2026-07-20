import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createRepairPlan,
  parseRepairConfig,
  renderRepairPlanMarkdown,
  validateExpectedHeadSha,
  writeRepairPlanArtifacts,
} from "./atlas-pr-repair-plan.mjs";

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

test("a stale SHA prevents plan and artifact creation steps", () => {
  const validation = workflow.indexOf("name: Revalidate head SHA before plan creation");
  const creation = workflow.indexOf("name: Create deterministic repair plan");
  const upload = workflow.indexOf("name: Upload repair plan artifact");
  assert.ok(validation >= 0 && creation > validation && upload > creation);
  assert.doesNotMatch(workflow.slice(creation, upload), /if:\s*always\(\)/);
  assert.doesNotMatch(workflow.slice(upload), /if:\s*(?:always|failure)\(\)/);
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

test("writes complete JSON and a redacted Markdown audit artifact", async () => {
  const directory = mkdtempSync(join(tmpdir(), "atlas-repair-plan-"));
  try {
    const result = plan({
      supervisor: { status: "BLOCKED", reasons: ["token=supersecretvalue"] },
      failedChecks: [{ name: "CI / verify", logExcerpt: "api_key=anothersecretvalue" }],
    });
    await writeRepairPlanArtifacts(directory, result, `atlas-repair-plan-pr-42-${sha.slice(0, 12)}`);
    const written = JSON.parse(readFileSync(join(directory, "repair-plan.json"), "utf8"));
    const markdown = readFileSync(join(directory, "repair-plan.md"), "utf8");
    assert.deepEqual(written, result);
    assert.match(markdown, /PR number:\*\* 42/);
    assert.match(markdown, new RegExp(sha));
    assert.match(markdown, /Repair status:\*\* REPAIR_ELIGIBLE/);
    assert.match(markdown, /Reasons/);
    assert.match(markdown, new RegExp(`42:${sha}`));
    assert.match(markdown, /\[REDACTED\]/);
    assert.doesNotMatch(markdown, /supersecretvalue|anothersecretvalue/);
    assert.deepEqual(readdirSync(directory, { withFileTypes: true }).map((entry) => entry.name).sort(), [
      "repair-plan.json",
      "repair-plan.md",
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const [status, overrides] of [
  ["REPAIR_ELIGIBLE", {}],
  ["REPAIR_BLOCKED", { labels: [] }],
  ["NO_REPAIR_NEEDED", { supervisor: { status: "MERGE_READY", reasons: [] }, blockReasons: [] }],
]) {
  test(`Markdown represents ${status}`, () => {
    assert.match(renderRepairPlanMarkdown(plan(overrides), "artifact"), new RegExp(`Repair status:\\*\\* ${status}`));
  });
}

test("workflow is manual, read-only, trusted-main planning only", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /pull_request_target:|pull_request:|schedule:/);
  assert.match(workflow, /contents: read\n  pull-requests: read\n  checks: read\n  actions: read/);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|codex|openai|git push|contents: write|pull-requests: write|issues: write/iu);
});

test("workflow uploads exactly the two repair plan files for seven days", () => {
  assert.match(workflow, /uses: actions\/upload-artifact@v4/);
  assert.match(workflow, /name: atlas-repair-plan-pr-\$\{\{ steps\.pull\.outputs\.number \}\}-\$\{\{ steps\.pull\.outputs\.short-head-sha \}\}/);
  const upload = workflow.slice(workflow.indexOf("name: Upload repair plan artifact"));
  const paths = [...upload.matchAll(/\$\{\{ runner\.temp \}\}\/atlas-repair-plan\/(repair-plan\.(?:json|md))/g)].map((match) => match[1]);
  assert.deepEqual(paths, ["repair-plan.json", "repair-plan.md"]);
  assert.match(upload, /retention-days: 7/);
});
