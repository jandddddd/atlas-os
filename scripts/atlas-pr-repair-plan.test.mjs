import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRepairPlan,
  evaluateAutomaticPlanEligibility,
  parseRepairConfig,
  renderRepairPlanMarkdown,
  repairStateFingerprint,
  validateExpectedHeadSha,
  writeRepairPlanArtifacts,
} from "./atlas-pr-repair-plan.mjs";

const policySource = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
const policy = parseRepairConfig(policySource);
const workflow = readFileSync(new URL("../.github/workflows/atlas-pr-repair.yml", import.meta.url), "utf8");
const supervisorWorkflow = readFileSync(new URL("../.github/workflows/atlas-pr-supervisor.yml", import.meta.url), "utf8");
const sha = "a".repeat(40);

test("repair modules can be imported without a CLI argv entry", () => {
  for (const modulePath of ["./atlas-pr-repair-plan.mjs", "./atlas-pr-supervisor.mjs"]) {
    const moduleUrl = new URL(modulePath, import.meta.url).href;
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `import(${JSON.stringify(moduleUrl)})`], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  }
});

const repairable = {
  repository: "atlas/atlas-os",
  prNumber: 42,
  state: "open",
  draft: false,
  baseBranch: "main",
  headBranch: "feature/fix",
  headSha: sha,
  headRepository: "atlas/atlas-os",
  baseRepository: "atlas/atlas-os",
  isFork: false,
  labels: ["atlas-autopilot", "atlas-repair"],
  files: ["scripts/example.mjs"],
  changedFiles: 1,
  additions: 10,
  deletions: 2,
  failedChecks: [{ name: "CI / verify", logExcerpt: "Assertion failed at test 4" }],
  reviewThreads: [],
  supervisor: { status: "BLOCKED", reasons: ["CI failed"] },
  blockReasons: ["required_check_failed"],
  supervisorObservedHeadSha: sha,
  autopilotRequiredLabel: "atlas-autopilot",
};

function plan(overrides = {}) {
  return createRepairPlan({ ...repairable, ...overrides }, policy);
}

function automatic(overrides = {}) {
  return evaluateAutomaticPlanEligibility({ ...repairable, ...overrides }, policy);
}

test("eligible blocked PR produces an automatic read-only plan", () => {
  assert.deepEqual(automatic(), { eligible: true, reasons: [] });
  const result = plan({ triggerSource: "automatic", trustedWorkflowSha: "b".repeat(40) });
  assert.equal(result.triggerSource, "automatic");
  assert.equal(result.planningMode, "NON_EXECUTING_READ_ONLY");
  assert.equal(result.attemptReserved, false);
  assert.equal(result.repairExecuted, false);
  assert.equal(result.safeToStart, false);
  assert.equal(result.trustedWorkflowSha, "b".repeat(40));
});

for (const [name, overrides, reason] of [
  ["successful/ready PR", { supervisor: { status: "POLICY_READY", reasons: [] }, blockReasons: [] }, "SUPERVISOR_NOT_BLOCKED"],
  ["draft PR", { draft: true }, "PR_DRAFT"],
  ["closed PR", { state: "closed" }, "PR_NOT_OPEN"],
  ["fork PR", { isFork: true, headRepository: "fork/atlas-os" }, "FORK_PR"],
  ["wrong base", { baseBranch: "release" }, "BASE_NOT_ALLOWED"],
  ["stale head", { supervisorObservedHeadSha: "b".repeat(40) }, "HEAD_SHA_STALE"],
  ["forbidden path", { files: [".github/workflows/rogue.yml"] }, "FORBIDDEN_PATH"],
  ["P1 finding", { reviewThreads: [{ priority: "P1", resolved: false }] }, "BLOCKING_REVIEW_FINDING"],
  ["P2 finding", { reviewThreads: [{ priority: "P2", resolved: false }] }, "BLOCKING_REVIEW_FINDING"],
  ["missing repair label", { labels: ["atlas-autopilot"] }, "REPAIR_LABEL_MISSING"],
  ["missing autopilot label", { labels: ["atlas-repair"] }, "AUTOPILOT_LABEL_MISSING"],
]) {
  test(`automatic planning rejects ${name}`, () => {
    const result = automatic(overrides);
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes(reason));
  });
}

test("Supervisor state fingerprint is deterministic and state-sensitive", () => {
  assert.equal(
    repairStateFingerprint({ status: "BLOCKED", reasons: ["b", "a"] }),
    repairStateFingerprint({ status: "BLOCKED", reasons: ["a", "b"] }),
  );
  assert.notEqual(
    repairStateFingerprint({ status: "BLOCKED", reasons: ["a"] }),
    repairStateFingerprint({ status: "BLOCKED", reasons: ["b"] }),
  );
});

test("repair plan direct CLI execution still works", () => {
  const scriptPath = fileURLToPath(new URL("./atlas-pr-repair-plan.mjs", import.meta.url));
  const configPath = fileURLToPath(new URL("../.github/atlas-autopilot.yml", import.meta.url));
  const result = spawnSync(process.execPath, [scriptPath, "--config", configPath], {
    encoding: "utf8",
    input: JSON.stringify(repairable),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "REPAIR_ELIGIBLE");
  assert.equal(result.stderr, "");
});

test("POLICY_READY needs no repair", () => {
  assert.equal(plan({ supervisor: { status: "POLICY_READY", reasons: [] }, blockReasons: [] }).status, "NO_REPAIR_NEEDED");
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
  ["NO_REPAIR_NEEDED", { supervisor: { status: "POLICY_READY", reasons: [] }, blockReasons: [] }],
]) {
  test(`Markdown represents ${status}`, () => {
    assert.match(renderRepairPlanMarkdown(plan(overrides), "artifact"), new RegExp(`Repair status:\\*\\* ${status}`));
  });
}

test("workflow keeps manual dispatch and adds only completed-Supervisor automatic planning", () => {
  assert.match(workflow, /^on:\n(?:.|\n)*?  workflow_dispatch:/m);
  assert.match(workflow, /workflow_run:\n\s+workflows: \[Atlas PR Supervisor\]\n\s+types: \[completed\]/);
  assert.doesNotMatch(workflow, /pull_request_target:|pull_request:|schedule:/);
  assert.match(workflow, /contents: read\n  pull-requests: read\n  checks: read\n  actions: read/);
  assert.match(workflow, /ref: \$\{\{ steps\.trigger\.outputs\.trusted-workflow-sha \|\| 'main' \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /OPENAI_API_KEY|codex|openai|git push|contents: write|pull-requests: write|issues: write/iu);
  assert.match(workflow, /listArtifactsForRepo/);
  assert.match(workflow, /atlas-auto-repair-plan-pr-/);
  assert.match(workflow, /create-plan", "false"/);
});

test("automatic Repair Plan remains non-executing and cannot start Repair Execute", () => {
  const result = plan({ triggerSource: "automatic", trustedWorkflowSha: "b".repeat(40) });
  assert.equal(result.planningMode, "NON_EXECUTING_READ_ONLY");
  assert.equal(result.attemptReserved, false);
  assert.equal(result.repairExecuted, false);
  assert.equal(result.safeToStart, false);
  assert.doesNotMatch(workflow, /atlas-pr-repair-execute|createWorkflowDispatch|workflow_dispatches|OPENAI_API_KEY|secrets\./i);
  assert.doesNotMatch(workflow, /git\.(?:createRef|updateRef)|git\s+(?:commit|push)|contents: write|pull-requests: write/i);
});

test("Supervisor and Plan use the same shared multi-ref check collector", () => {
  for (const source of [supervisorWorkflow, workflow]) {
    assert.match(source, /collectPullRequestCheckRuns/);
    assert.match(source, /pull\.merge_commit_sha|collectPullRequestCheckRuns/);
    assert.match(source, /ref: `pull\/\$\{number\}\/merge`/);
    assert.match(source, /checkFacts\(rawChecks, workflowNames/);
  }
  assert.doesNotMatch(workflow, /deduplicateCheckRuns\(await github\.paginate/);
});

test("automatic planning executes and audits the exact Supervisor trusted SHA", () => {
  const download = workflow.indexOf("name: Download trusted Supervisor observation");
  const resolve = workflow.indexOf("name: Resolve manual or automatic trigger binding");
  const checkout = workflow.indexOf("name: Checkout exact trusted planning code");
  const verify = workflow.indexOf("name: Verify exact trusted checkout");
  const collect = workflow.indexOf("name: Collect bounded pull request diagnostics");
  assert.ok(download >= 0 && download < resolve && resolve < checkout && checkout < verify && verify < collect);
  assert.match(workflow, /EXPECTED_TRUSTED_SHA: \$\{\{ steps\.trigger\.outputs\.trusted-workflow-sha \}\}/);
  assert.match(workflow, /actual_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /\[ "\$actual_sha" != "\$EXPECTED_TRUSTED_SHA" \]/);
  assert.match(workflow, /TRUSTED_WORKFLOW_SHA: \$\{\{ steps\.trusted\.outputs\.sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ steps\.trigger\.outputs\.trusted-workflow-sha \|\| 'main' \}\}/);
});

test("missing or mismatched automatic trusted SHA fails closed before policy execution", () => {
  const checkout = workflow.indexOf("name: Checkout exact trusted planning code");
  const verify = workflow.indexOf("name: Verify exact trusted checkout");
  const evaluate = workflow.indexOf("name: Evaluate supervisor facts from trusted code");
  assert.ok(checkout >= 0 && checkout < verify && verify < evaluate);
  assert.match(workflow, /!\/\^\[0-9a-f\]\{40\}\$\/i\.test\(observation\.trustedWorkflowSha\)/);
  assert.match(workflow, /exit 1/);
  assert.doesNotMatch(workflow.slice(0, verify), /scripts\/atlas-pr-(?:supervisor|repair)/);
});

test("workflow uploads exactly the two repair plan files for seven days", () => {
  assert.match(workflow, /uses: actions\/upload-artifact@v6/);
  assert.match(workflow, /format\('atlas-repair-plan-pr-\{0\}-\{1\}'/);
  const upload = workflow.slice(workflow.indexOf("name: Upload repair plan artifact"));
  const paths = [...upload.matchAll(/\$\{\{ runner\.temp \}\}\/atlas-repair-plan\/(repair-plan\.(?:json|md))/g)].map((match) => match[1]);
  assert.deepEqual(paths, ["repair-plan.json", "repair-plan.md"]);
  assert.match(upload, /retention-days: 7/);
});
