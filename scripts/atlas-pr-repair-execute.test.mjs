import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertAttemptAvailable,
  attemptArtifactName,
  attemptTagName,
  createExecutionReport,
  renderExecutionReport,
  requireOpenAiApiKey,
  validateChangedFiles,
  validateDispatch,
  validateExecutionPolicy,
  validatePlanArtifact,
  validatePullRequest,
  isTrustedRepairPlanWorkflowPath,
} from "./atlas-pr-repair-execute.mjs";
import { parseRepairConfig } from "./atlas-pr-repair-plan.mjs";

const policySource = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../.github/workflows/atlas-pr-repair-execute.yml", import.meta.url), "utf8");
const policy = parseRepairConfig(policySource);
const sha = "a".repeat(40);
const repository = "atlas/atlas-os";
const pull = {
  state: "open",
  base: { ref: "main", repo: { full_name: repository } },
  head: { ref: "feature/repair", sha, repo: { full_name: repository, fork: false } },
  labels: [{ name: "atlas-repair" }],
};
const plan = {
  prNumber: 42,
  headSha: sha,
  attemptKey: `42:${sha}`,
  status: "REPAIR_ELIGIBLE",
  safeToStart: true,
  prompt: "Repair only scripts/example.mjs.",
  allowedAreas: ["scripts/example.mjs"],
};

test("repair.enabled false blocks execution", () => {
  assert.throws(() => validateExecutionPolicy(policySource), /disabled/);
  assert.equal(policy.enabled, false);
});

test("wrong confirmation blocks", () => {
  assert.throws(() => validateDispatch({ confirm: "REPAIR", prNumber: 42, expectedHeadSha: sha, planRunId: 7 }), /EXECUTE_REPAIR/);
});

test("trusted plan workflow accepts GitHub workflow ref suffix", () => {
  assert.equal(isTrustedRepairPlanWorkflowPath(".github/workflows/atlas-pr-repair.yml"), true);
  assert.equal(isTrustedRepairPlanWorkflowPath(".github/workflows/atlas-pr-repair.yml@main"), true);
  assert.equal(isTrustedRepairPlanWorkflowPath(".github/workflows/other.yml@main"), false);
});

test("missing OPENAI_API_KEY blocks", () => {
  assert.throws(() => requireOpenAiApiKey(""), /not configured/);
});

test("stale head SHA blocks", () => {
  assert.throws(() => validatePullRequest(pull, policy, repository, "b".repeat(40)), /stale/);
});

test("fork blocks", () => {
  const fork = { ...pull, head: { ...pull.head, repo: { full_name: "other/atlas-os", fork: true } } };
  assert.throws(() => validatePullRequest(fork, policy, repository, sha), /repository|Fork/);
});

test("missing atlas-repair label blocks", () => {
  assert.throws(() => validatePullRequest({ ...pull, labels: [] }, policy, repository, sha), /Required label/);
});

test("never-run label blocks", () => {
  assert.throws(() => validatePullRequest({ ...pull, labels: [...pull.labels, { name: "security" }] }, policy, repository, sha), /Never-run/);
});

test("invalid attemptKey blocks", () => {
  assert.throws(() => validatePlanArtifact(["repair-plan.json", "repair-plan.md"], { ...plan, attemptKey: `41:${sha}` }, {
    prNumber: 42, expectedHeadSha: sha,
  }), /attemptKey/);
});

test("identical attemptKey cannot execute twice", () => {
  const name = attemptArtifactName(42, sha);
  assert.throws(() => assertAttemptAvailable([{ name, expired: false }], name), /already/);
  assert.doesNotThrow(() => assertAttemptAvailable([{ name, expired: true }], name));
});

test("attempt marker has a durable tag name independent of artifact retention", () => {
  assert.equal(attemptTagName(42, sha), `atlas-repair-attempt/42-${sha}`);
  assert.match(workflow, /git\.getRef\(/);
  assert.match(workflow, /git\.createRef\(/);
  assert.doesNotMatch(workflow, /retention-days: 7[\s\S]*attempt-artifact/);
});

for (const status of ["REPAIR_BLOCKED", "NO_REPAIR_NEEDED"]) {
  test(`${status} blocks`, () => {
    assert.throws(() => validatePlanArtifact(["repair-plan.json", "repair-plan.md"], { ...plan, status }, {
      prNumber: 42, expectedHeadSha: sha,
    }), /cannot be executed/);
  });
}

test("artifact must contain exactly JSON and Markdown", () => {
  assert.throws(() => validatePlanArtifact(["repair-plan.json", "repair-plan.md", "extra.txt"], plan, {
    prNumber: 42, expectedHeadSha: sha,
  }), /only/);
});

test("forbidden and outside-plan path changes prevent push", () => {
  assert.throws(() => validateChangedFiles({ files: [".github/workflows/ci.yml"], additions: 1, deletions: 0 }, {
    ...plan, allowedAreas: [".github/workflows/ci.yml"],
  }, policy), /forbidden/);
  assert.throws(() => validateChangedFiles({ files: ["app/page.tsx"], additions: 1, deletions: 0 }, plan, policy), /outside/);
});

test("size limits prevent push", () => {
  assert.throws(() => validateChangedFiles({ files: ["scripts/example.mjs"], additions: 501, deletions: 0 }, plan, policy), /line limit/);
  const files = Array.from({ length: 11 }, (_, index) => `scripts/${index}.mjs`);
  assert.throws(() => validateChangedFiles({ files, additions: 11, deletions: 0 }, { ...plan, allowedAreas: files }, policy), /file limit/);
});

test("workflow performs exactly one gated commit and normal push", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /pull_request_target:|pull_request:|schedule:/);
  assert.match(workflow, /contents: write\n  pull-requests: read\n  actions: read\n  checks: read/);
  assert.doesNotMatch(workflow, /pull-requests: write|issues: write/);
  assert.equal((workflow.match(/git commit /g) ?? []).length, 1);
  assert.equal((workflow.match(/\bpush origin\b/g) ?? []).length, 1);
  assert.match(workflow, /fix\(autopilot\): apply approved repair plan/);
  assert.doesNotMatch(workflow, /push[^\n]*(?:--force|-f\b)|gh pr create|pulls\.create|pulls\.merge/i);
  assert.match(workflow, /isTrustedRepairPlanWorkflowPath\(run\.path\)/);
  assert.match(workflow, /execFileSync\("git", \["diff", "HEAD", "--name-only", "-z"\]/);
  assert.match(workflow, /execFileSync\("git", \["diff", "HEAD", "--numstat"\]/);
});

test("tests and safety gates precede commit and push", () => {
  const unit = workflow.indexOf("name: Unit tests");
  const lint = workflow.indexOf("name: Lint");
  const build = workflow.indexOf("name: Build");
  const diff = workflow.indexOf("name: Check patch whitespace");
  const commit = workflow.indexOf("name: Commit approved repair");
  const push = workflow.indexOf("name: Push once");
  assert.ok(unit > 0 && lint > unit && build > lint && diff > build && commit > diff && push > commit);
  assert.doesNotMatch(workflow.slice(unit, push), /continue-on-error|if:\s*always/);
});

test("secret is scoped to key check and Codex step, and prompt comes from plan", () => {
  const occurrences = [...workflow.matchAll(/secrets\.OPENAI_API_KEY/g)];
  assert.equal(occurrences.length, 1);
  assert.match(workflow, /prompt-file: \.git\/atlas-repair-prompt\.txt/);
  assert.match(workflow, /writeFileSync\("\.git\/atlas-repair-prompt\.txt", plan\.prompt/);
  assert.doesNotMatch(workflow, /echo.*OPENAI_API_KEY|print.*OPENAI_API_KEY/);
});

test("execution report redacts secrets and records no merge", () => {
  const report = createExecutionReport({
    prNumber: 42, expectedHeadSha: sha, attemptKey: `42:${sha}`, planRunId: 7,
    status: "failed token=supersecretvalue", startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:01:00Z",
    changedFiles: ["scripts/example.mjs"], tests: { unit: "failed api_key=anothersecretvalue" },
  });
  const serialized = `${JSON.stringify(report)}\n${renderExecutionReport(report)}`;
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /supersecretvalue|anothersecretvalue/);
  assert.match(serialized, /No merge was performed/);
  assert.equal(report.mergePerformed, false);
});

test("audit artifact contains only two reports and is retained seven days", () => {
  const upload = workflow.slice(workflow.indexOf("name: Upload read-only execution audit"));
  assert.match(upload, /repair-execution-report\.json/);
  assert.match(upload, /repair-execution-report\.md/);
  assert.match(upload, /retention-days: 7/);
});
