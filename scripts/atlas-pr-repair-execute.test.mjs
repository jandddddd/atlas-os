import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  attemptTagName,
  createExecutionReport,
  deriveExecutionOutcome,
  renderExecutionReport,
  requireOpenAiApiKey,
  validateChangedFiles,
  validateDispatch,
  validateExecutionPolicy,
  validatePlanArtifact,
  validatePullRequest,
  isTrustedRepairPlanWorkflowPath,
  validateTreeSnapshot,
} from "./atlas-pr-repair-execute.mjs";
import { parseRepairConfig } from "./atlas-pr-repair-plan.mjs";

const policySource = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../.github/workflows/atlas-pr-repair-execute.yml", import.meta.url), "utf8");
const planningWorkflow = readFileSync(new URL("../.github/workflows/atlas-pr-repair.yml", import.meta.url), "utf8");
const policy = parseRepairConfig(policySource);
const sha = "a".repeat(40);
const repository = "atlas/atlas-os";
const pull = {
  number: 42,
  state: "open",
  draft: false,
  user: { login: "author" },
  base: { ref: "main", repo: { full_name: repository } },
  head: { ref: "pilot/atlas-repair-42", sha, repo: { full_name: repository, fork: false } },
  labels: [{ name: "atlas-repair" }, { name: "atlas-repair-pilot" }],
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

function enabledPolicySource() {
  return policySource
    .replace("  enabled: false", "  enabled: true")
    .replace("  pilot_enabled: false", "  pilot_enabled: true")
    .replace("  pilot_allowed_pr_numbers:", "  pilot_allowed_pr_numbers:\n    - 42")
    .replace("  pilot_allowed_triggering_actors:\n    - \"jandddddd\"", "  pilot_allowed_triggering_actors:\n    - \"operator\"")
    .replace("  pilot_allowed_actors:\n    - \"jandddddd\"", "  pilot_allowed_actors:\n    - \"operator\"")
    .replace("  pilot_allowed_authors:\n    - \"jandddddd\"", "  pilot_allowed_authors:\n    - \"author\"");
}

for (const [field, invalidValues] of [
  ["maximum_changed_files", [undefined, "0", "-1", "1.5", "NaN", "Infinity", "null"]],
  ["maximum_changed_lines", [undefined, "0", "-1", "1.5", "NaN", "Infinity", "null"]],
]) {
  for (const invalidValue of invalidValues) {
    test(`enabled policy rejects ${field}=${invalidValue ?? "missing"}`, () => {
      const line = `  ${field}: ${policy[field]}`;
      const replacement = invalidValue === undefined ? "" : `  ${field}: ${invalidValue}`;
      assert.throws(() => validateExecutionPolicy(enabledPolicySource().replace(line, replacement)), new RegExp(field));
    });
  }
}

for (const replacement of ["", "  forbidden_paths: null", "  forbidden_paths:", "  forbidden_paths:\n    - 123"]) {
  test(`enabled policy rejects invalid forbidden_paths: ${replacement || "missing"}`, () => {
    const invalidPolicy = enabledPolicySource().replace(
      /  forbidden_paths:\n(?:    - .*\n){6}/,
      replacement ? `${replacement}\n` : "",
    );
    assert.throws(() => validateExecutionPolicy(invalidPolicy), /forbidden_paths/);
  });
}

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

test("post-validation generated forbidden file prevents commit", () => {
  assert.throws(() => validateTreeSnapshot({
    trackedFiles: [], untrackedFiles: [".github/workflows/generated.yml"],
    numstat: [], untrackedContents: [[".github/workflows/generated.yml", Buffer.from("name: bad\n")]],
  }, { ...plan, allowedAreas: [".github/workflows/generated.yml"] }, policy), /forbidden/);
  assert.match(workflow, /Revalidate complete repair tree after tests/);
  assert.ok(workflow.indexOf("Revalidate complete repair tree after tests") < workflow.indexOf("name: Commit approved repair"));
});

test("initial scope validation uses the preserved trusted tree checker", () => {
  const scopeCheck = workflow.slice(
    workflow.indexOf("name: Validate repair scope and size"),
    workflow.indexOf("name: Unit tests"),
  );
  assert.match(scopeCheck, /ATLAS_REPAIR_TRUSTED: \$\{\{ runner\.temp \}\}\/atlas-repair-trusted/);
  assert.match(scopeCheck, /ATLAS_REPAIR_MODULE_ROOT: \$\{\{ runner\.temp \}\}\/atlas-repair-trusted/);
  assert.match(scopeCheck, /run: node "\$RUNNER_TEMP\/atlas-repair-trusted\/atlas-pr-repair-tree-check\.mjs"/);
  assert.doesNotMatch(scopeCheck, /run: node scripts\/atlas-pr-repair-tree-check\.mjs/);
});

test("workflow installs the same trusted Node dependencies as CI before validation commands", () => {
  const setup = workflow.indexOf("name: Setup Node.js");
  const install = workflow.indexOf("name: Install dependencies");
  const unit = workflow.indexOf("name: Unit tests");
  assert.ok(setup > 0 && install > setup && unit > install);
  assert.match(workflow.slice(setup, unit), /uses: actions\/setup-node@v4[\s\S]*node-version: 24[\s\S]*cache: npm/);
  assert.match(workflow.slice(install, unit), /run: npm ci --include-workspace-root/);
});

test("credentialed fetch uses only isolated trusted Git configuration", () => {
  const fetchSecurity = workflow.slice(
    workflow.indexOf("name: Prepare trusted Git config for remote revalidation"),
    workflow.indexOf("name: Commit approved repair"),
  );
  const fetchStep = fetchSecurity.slice(fetchSecurity.indexOf("name: Revalidate remote head before commit"));
  assert.match(fetchSecurity, /GIT_CONFIG_GLOBAL: \/dev\/null/);
  assert.match(fetchSecurity, /GIT_CONFIG_NOSYSTEM: "1"/);
  assert.match(fetchSecurity, /trusted_config="\$\(mktemp "\$RUNNER_TEMP\/atlas-repair-fetch-git-config\.XXXXXX"\)"/);
  assert.match(fetchSecurity, /rm -f \.git\/config\n\s+install -m 600 "\$trusted_config" \.git\/config/);
  assert.doesNotMatch(fetchSecurity.slice(0, fetchSecurity.indexOf("name: Revalidate remote head before commit")), /GITHUB_TOKEN/);
  assert.match(fetchStep, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(fetchStep, /git -c core\.hooksPath=\/dev\/null \\\n[\s\S]*fetch --no-tags "https:\/\/github\.com\/\$\{GITHUB_REPOSITORY\}\.git"/);
  assert.doesNotMatch(fetchStep, /fetch --no-tags origin/);
  assert.match(fetchStep, /unset GITHUB_TOKEN/);
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
  assert.equal((workflow.match(/commit -m /g) ?? []).length, 1);
  assert.match(workflow, /git -c core\.hooksPath=\/dev\/null commit /);
  assert.doesNotMatch(workflow, /git config core\.hooksPath/);
  assert.equal((workflow.match(/\bpush "https:\/\/github\.com\/\$\{GITHUB_REPOSITORY\}\.git"/g) ?? []).length, 1);
  assert.match(workflow, /GIT_CONFIG_GLOBAL: \/dev\/null/);
  assert.match(workflow, /GIT_CONFIG_NOSYSTEM: "1"/);
  assert.match(workflow, /trusted_config="\$\(mktemp "\$RUNNER_TEMP\/atlas-repair-git-config\.XXXXXX"\)"/);
  assert.match(workflow, /rm -f \.git\/config\n\s+install -m 600 "\$trusted_config" \.git\/config/);
  assert.match(workflow, /git -c core\.hooksPath=\/dev\/null \\\n[\s\S]*push "https:\/\/github\.com\/\$\{GITHUB_REPOSITORY\}\.git"/);
  assert.match(workflow, /fix\(autopilot\): apply approved repair plan/);
  assert.doesNotMatch(workflow, /push[^\n]*(?:--force|-f\b)|gh pr create|pulls\.create|pulls\.merge/i);
  assert.match(workflow, /environment: atlas-repair-pilot/);
  assert.match(workflow, /ATLAS_ACTOR: \$\{\{ github\.actor \}\}/);
  assert.match(workflow, /ATLAS_TRIGGERING_ACTOR: \$\{\{ github\.triggering_actor \}\}/);
  assert.match(workflow, /isTrustedRepairPlanWorkflowPath\(run\.path\)/);
  assert.match(workflow, /atlas-pr-repair-tree-check\.mjs/);
});

test("pilot gates are revalidated immediately before attempt reservation", () => {
  const reserve = workflow.slice(workflow.indexOf("name: Reserve the single repair attempt"), workflow.indexOf("name: Run one bounded Codex repair attempt"));
  assert.match(reserve, /validatePullRequest\(pull, policy/);
  assert.match(reserve, /actor: process\.env\.ATLAS_ACTOR/);
  assert.match(reserve, /triggeringActor: process\.env\.ATLAS_TRIGGERING_ACTOR/);
  assert.match(reserve, /validated\.headBranch !== process\.env\.HEAD_BRANCH/);
  assert.match(reserve, /git\.getRef/);
  assert.match(reserve, /git\.createRef/);
});

test("complete current pilot gates are reloaded immediately before commit and push", () => {
  const remote = workflow.indexOf("name: Revalidate remote head before commit");
  const precommit = workflow.indexOf("name: Revalidate current pilot gates before commit");
  const commit = workflow.indexOf("name: Commit approved repair");
  const prepush = workflow.indexOf("name: Revalidate current pilot gates before push");
  const push = workflow.indexOf("name: Push once to the existing PR branch");
  assert.ok(remote > 0 && precommit > remote && commit > precommit && prepush > commit && push > prepush);
  for (const source of [workflow.slice(precommit, commit), workflow.slice(prepush, push)]) {
    assert.match(source, /github\.rest\.repos\.getContent/);
    assert.match(source, /path: "\.github\/atlas-autopilot\.yml", ref: "main"/);
    assert.match(source, /validateExecutionPolicy/);
    assert.match(source, /github\.rest\.pulls\.get/);
    assert.match(source, /validatePullRequest/);
    assert.match(source, /actor: process\.env\.ATLAS_ACTOR/);
    assert.match(source, /triggeringActor: process\.env\.ATLAS_TRIGGERING_ACTOR/);
  }
  assert.equal((workflow.match(/push "https:\/\/github\.com\/\$\{GITHUB_REPOSITORY\}\.git"/g) ?? []).length, 1);
});

test("pre-write gate failures are FAILED with fixed audit reason codes", () => {
  assert.deepEqual(deriveExecutionOutcome({ reserve: "success", codex: "success", precommit: "failure", commit: "skipped", push: "skipped" }), {
    status: "FAILED", phase: "pre-commit-gate-revalidation", reasonCode: "PRE_COMMIT_GATES_REJECTED",
    attemptReserved: true, codexStarted: true, pushPerformed: false,
  });
  assert.deepEqual(deriveExecutionOutcome({ reserve: "success", codex: "success", commit: "success", prepush: "failure", push: "skipped" }), {
    status: "FAILED", phase: "pre-push-gate-revalidation", reasonCode: "PRE_PUSH_GATES_REJECTED",
    attemptReserved: true, codexStarted: true, pushPerformed: false,
  });
});

test("Codex step receives neither GitHub token nor repository credentials", () => {
  const codex = workflow.slice(workflow.indexOf("name: Run one bounded Codex repair attempt"), workflow.indexOf("name: Remove transient prompt"));
  assert.doesNotMatch(codex, /GITHUB_TOKEN|github\.token|github-token|persist-credentials/);
  assert.match(codex, /openai-api-key/);
});

function githubScriptSources(source) {
  const lines = source.split("\n");
  const scripts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("uses: actions/github-script@")) continue;
    const scriptIndex = lines.findIndex((line, candidate) => candidate > index && /^\s+script: \|$/.test(line));
    assert.ok(scriptIndex > index, "github-script step must have a script block");
    const indentation = lines[scriptIndex].match(/^\s*/)[0].length;
    const body = [];
    for (let candidate = scriptIndex + 1; candidate < lines.length; candidate += 1) {
      const line = lines[candidate];
      if (line.trim() && line.match(/^\s*/)[0].length <= indentation) break;
      body.push(line);
    }
    scripts.push(body.join("\n"));
    index = scriptIndex;
  }
  return scripts;
}

test("PR-controlled GitHub expressions never enter github-script source", () => {
  for (const [name, source] of [["planning", planningWorkflow], ["execution", workflow]]) {
    const scripts = githubScriptSources(source);
    assert.ok(scripts.length > 0, `${name} workflow must expose github-script blocks`);
    for (const script of scripts) assert.doesNotMatch(script, /\$\{\{/);
    assert.doesNotMatch(source, /context\.triggering_actor/);
  }
  assert.match(planningWorkflow, /ATLAS_TRIGGERING_ACTOR: \$\{\{ github\.triggering_actor \}\}[\s\S]*triggeringActor: process\.env\.ATLAS_TRIGGERING_ACTOR/);
  assert.match(workflow, /PILOT_HEAD_BRANCH: \$\{\{ steps\.pilot\.outputs\.head-branch \}\}[\s\S]*core\.setOutput\("head-branch", process\.env\.PILOT_HEAD_BRANCH\)/);
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
  assert.equal(occurrences.length, 2);
  const secretCheck = workflow.slice(
    workflow.indexOf("name: Validate OpenAI credential availability"),
    workflow.indexOf("name: Reserve the single repair attempt"),
  );
  assert.match(secretCheck, /requireOpenAiApiKey/);
  assert.match(secretCheck, /runner\.temp|RUNNER_TEMP/);
  assert.match(secretCheck, /atlas-repair-trusted\/atlas-pr-repair-execute\.mjs/);
  assert.doesNotMatch(secretCheck, /from "\.\/scripts\/atlas-pr-repair-execute\.mjs"/);
  assert.match(workflow, /prompt-file: \.git\/atlas-repair-prompt\.txt/);
  assert.match(workflow, /writeFileSync\("\.git\/atlas-repair-prompt\.txt", plan\.prompt/);
  assert.doesNotMatch(workflow, /echo.*OPENAI_API_KEY|print.*OPENAI_API_KEY/);
});

test("execution report redacts secrets and records no merge", () => {
  const report = createExecutionReport({
    repository: "atlas/atlas-os", runId: 99, runUrl: "https://github.com/atlas/atlas-os/actions/runs/99",
    actor: "operator", triggeringActor: "operator", prAuthor: "author",
    baseBranch: "main", headBranch: "pilot/atlas-repair-42",
    baseRepository: "atlas/atlas-os", headRepository: "atlas/atlas-os",
    trustedPolicySha: sha, trustedWorkflowSha: sha, planDigest: "b".repeat(64),
    pilotGateResults: [{ code: "PR_ALLOWLISTED", passed: true }],
    prNumber: 42, expectedHeadSha: sha, attemptKey: `42:${sha}`, planRunId: 7,
    status: "FAILED", phase: "codex token=supersecretvalue", reasonCode: "CODEX_FAILED",
    attemptReserved: true, attemptTag: `atlas-repair-attempt/42-${sha}`, codexStarted: true, pushPerformed: false,
    startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:01:00Z",
    changedFiles: ["scripts/example.mjs"], tests: { unit: "failed api_key=anothersecretvalue" },
  });
  const serialized = `${JSON.stringify(report)}\n${renderExecutionReport(report)}`;
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /supersecretvalue|anothersecretvalue/);
  assert.match(serialized, /No merge was performed/);
  assert.equal(report.mergePerformed, false);
  assert.equal(report.attemptReserved, true);
  assert.equal(report.codexStarted, true);
  assert.equal(report.pushPerformed, false);
  assert.equal(report.repository, "atlas/atlas-os");
  assert.equal(report.planDigest, "b".repeat(64));
  assert.deepEqual(report.pilotGateResults, [{ code: "PR_ALLOWLISTED", passed: true }]);
});

function executionAuditValues(overrides = {}) {
  return {
    repository: "atlas/atlas-os", runId: 99, runUrl: "https://github.com/atlas/atlas-os/actions/runs/99",
    actor: "operator", triggeringActor: "operator", prAuthor: "normal-user",
    baseBranch: "main", headBranch: "pilot/atlas-repair-normal",
    baseRepository: "atlas/atlas-os", headRepository: "atlas/atlas-os",
    prNumber: 42, expectedHeadSha: sha, planRunId: 7,
    status: "FAILED", phase: "pre-push-gate-revalidation", reasonCode: "PRE_PUSH_GATES_REJECTED",
    attemptReserved: true, attemptTag: `atlas-repair-attempt/42-${sha}`,
    codexStarted: true, pushPerformed: false,
    startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:01:00Z",
    ...overrides,
  };
}

for (const branch of [
  "pilot/atlas-repair-(parentheses)",
  'pilot/atlas-repair-quote"branch',
  "pilot/atlas-repair-key=value",
  "pilot/atlas-repair-normal",
]) {
  test(`audit preserves bounded GitHub branch identifier ${branch}`, () => {
    assert.equal(createExecutionReport(executionAuditValues({ headBranch: branch })).headBranch, branch);
  });
}

test("audit preserves bounded bot and normal author identifiers", () => {
  assert.equal(createExecutionReport(executionAuditValues({ prAuthor: "dependabot[bot]" })).prAuthor, "dependabot[bot]");
  assert.equal(createExecutionReport(executionAuditValues({ prAuthor: "normal-user" })).prAuthor, "normal-user");
});

test("audit rejects overlong or control-character identifiers", () => {
  assert.equal(createExecutionReport(executionAuditValues({ headBranch: "x".repeat(256) })).headBranch, null);
  assert.equal(createExecutionReport(executionAuditValues({ prAuthor: "bot\nforged" })).prAuthor, null);
});

test("Markdown escapes identifier presentation without changing audit data", () => {
  const branch = 'pilot/atlas-repair-(quoted)="value"';
  const report = createExecutionReport(executionAuditValues({ headBranch: branch, prAuthor: "dependabot[bot]" }));
  const markdown = renderExecutionReport(report);
  assert.equal(report.headBranch, branch);
  assert.equal(report.prAuthor, "dependabot[bot]");
  assert.match(markdown, /dependabot\\\[bot\\\]/);
  assert.match(markdown, /pilot\/atlas\\-repair\\-\\\(quoted\\\)=&quot;value&quot;/);
  assert.doesNotMatch(markdown, /dependabot\[bot\]|\(quoted\)="value"/);
});

for (const [name, path, visibleBreak] of [
  ["LF", "docs/line\nfeed", "\\\\n"],
  ["CRLF", "docs/carriage\r\nreturn", "\\\\r\\\\n"],
  ["heading-like suffix", "docs/report\n# forged heading", "\\\\n\\# forged heading"],
  ["list-like suffix", "docs/report\n- forged item", "\\\\n\\- forged item"],
]) {
  test(`Markdown visibly encodes ${name} in changed file names without changing audit data`, () => {
    const report = createExecutionReport(executionAuditValues({ changedFiles: [path] }));
    const markdown = renderExecutionReport(report);
    assert.equal(report.changedFiles[0], path);
    assert.ok(markdown.includes(visibleBreak));
    assert.doesNotMatch(markdown, /\n# forged heading|\n- forged item/);
  });
}

test("normal changed file name remains unchanged as an audit and Markdown data value", () => {
  const path = "docs/normal";
  const report = createExecutionReport(executionAuditValues({ changedFiles: [path] }));
  assert.equal(report.changedFiles[0], path);
  assert.match(renderExecutionReport(report), /- docs\/normal/);
});

test("Markdown rendering encodes structural controls across all audited text fields", () => {
  const report = createExecutionReport(executionAuditValues({
    headBranch: "pilot/atlas-repair-normal",
    actor: "normal-actor",
    triggeringActor: "normal-actor",
    prAuthor: "normal-author",
    repository: "atlas/atlas-os",
  }));
  report.headBranch = "pilot/branch\n# heading";
  report.actor = "actor\r\n- item";
  report.triggeringActor = "trigger\u2028next";
  report.prAuthor = "author\tname";
  report.repository = "atlas/repo\u0085next";
  report.reasonCode = "REASON\n# forged";
  const markdown = renderExecutionReport(report);
  assert.doesNotMatch(markdown, /\n# (?:heading|forged)|\n- item/);
  for (const visible of ["\\\\n", "\\\\r\\\\n", "\\\\u2028", "\\\\t", "\\\\u0085"]) assert.ok(markdown.includes(visible));
});

test("execution report rejects free-form statuses and reason codes", () => {
  const values = {
    prNumber: 42, expectedHeadSha: sha, planRunId: 7, status: "FAILED", phase: "codex",
    reasonCode: "CODEX_FAILED", attemptReserved: true, attemptTag: `atlas-repair-attempt/42-${sha}`,
    codexStarted: true, pushPerformed: false, startedAt: "start", finishedAt: "finish",
  };
  assert.throws(() => createExecutionReport({ ...values, status: "failed token=secret" }), /status/);
  assert.throws(() => createExecutionReport({ ...values, reasonCode: "token=secret" }), /reason code/);
});

test("blocked dispatch audit does not publish invalid raw identifiers", () => {
  const report = createExecutionReport({
    prNumber: Number("not-a-number"), expectedHeadSha: "token=supersecretvalue", planRunId: 0,
    status: "BLOCKED", phase: "dispatch-validation", reasonCode: "INVALID_DISPATCH",
    attemptReserved: false, codexStarted: false, pushPerformed: false,
    startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:00:01Z",
  });
  const serialized = `${JSON.stringify(report)}\n${renderExecutionReport(report)}`;
  assert.equal(report.prNumber, null);
  assert.equal(report.expectedHeadSha, null);
  assert.equal(report.planRunId, null);
  assert.doesNotMatch(serialized, /supersecretvalue|not-a-number/);
});

test("audit artifact contains only two reports and is retained seven days", () => {
  const upload = workflow.slice(workflow.indexOf("name: Upload read-only execution audit"));
  assert.match(workflow, /name: Create final audit report[\s\S]*if: always\(\) && steps\.audit-init\.outcome == 'success'/);
  assert.match(upload, /if: always\(\) && steps\.audit\.outcome == 'success'/);
  assert.match(upload, /repair-execution-report\.json/);
  assert.match(upload, /repair-execution-report\.md/);
  assert.match(upload, /name: atlas-repair-execution-report-run-\$\{\{ github\.run_id \}\}/);
  assert.match(upload, /retention-days: 7/);
});

test("blocked and failed outcomes use fixed reason codes without masking workflow failures", () => {
  assert.deepEqual(deriveExecutionOutcome({ policy: "failure", reserve: "skipped", codex: "skipped", push: "skipped" }), {
    status: "BLOCKED",
    phase: "policy-validation",
    reasonCode: "POLICY_REJECTED",
    attemptReserved: false,
    codexStarted: false,
    pushPerformed: false,
  });
  assert.deepEqual(deriveExecutionOutcome({ reserve: "success", codex: "failure", push: "skipped" }), {
    status: "FAILED",
    phase: "codex",
    reasonCode: "CODEX_FAILED",
    attemptReserved: true,
    codexStarted: true,
    pushPerformed: false,
  });
  assert.equal(workflow.includes("continue-on-error"), false);
});

test("every fallible phase around and after reservation has a stable audit mapping", () => {
  const phases = [
    ["enforcement", "trusted-enforcement-setup", "TRUSTED_ENFORCEMENT_SETUP_FAILED", false],
    ["prompt", "prompt-restore", "PROMPT_RESTORE_FAILED", false],
    ["cleanup", "prompt-cleanup", "PROMPT_CLEANUP_FAILED", true],
    ["setup", "node-setup", "NODE_SETUP_FAILED", true],
    ["fetch_config", "git-config-setup", "GIT_CONFIG_SETUP_FAILED", true],
  ];

  for (const [step, phase, reasonCode, attemptReserved] of phases) {
    const outcome = deriveExecutionOutcome({
      reserve: attemptReserved ? "success" : "skipped",
      codex: attemptReserved ? "success" : "skipped",
      [step]: "failure",
      push: "skipped",
    });
    assert.equal(outcome.status, attemptReserved ? "FAILED" : "BLOCKED");
    assert.equal(outcome.phase, phase);
    assert.equal(outcome.reasonCode, reasonCode);
    assert.equal(outcome.attemptReserved, attemptReserved);
  }
});

test("all fallible post-reservation workflow steps expose outcomes to the audit finalizer", () => {
  const steps = [
    ["Run one bounded Codex repair attempt", "codex"],
    ["Remove transient prompt", "cleanup"],
    ["Validate repair scope and size", "scope"],
    ["Setup Node.js", "setup"],
    ["Install dependencies", "install"],
    ["Unit tests", "unit"],
    ["Lint", "lint"],
    ["Build", "build"],
    ["Check patch whitespace", "diff"],
    ["Revalidate complete repair tree after tests", "tree"],
    ["Prepare trusted Git config for remote revalidation", "fetch_config"],
    ["Revalidate remote head before commit", "remote"],
    ["Commit approved repair", "commit"],
    ["Push once to the existing PR branch", "push"],
  ];
  const postReservation = workflow.slice(
    workflow.indexOf("name: Reserve the single repair attempt"),
    workflow.indexOf("name: Create final audit report"),
  );
  const audit = workflow.slice(workflow.indexOf("name: Create final audit report"));

  for (const [name, id] of steps) {
    assert.match(postReservation, new RegExp(`name: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\s+id: ${id}`));
    assert.match(audit, new RegExp(`STEP_${id.toUpperCase()}: \\$\\{\\{ steps\\.${id}\\.outcome \\}\\}`));
  }
});

test("successful push produces a complete PUSHED audit outcome", () => {
  assert.deepEqual(deriveExecutionOutcome({ reserve: "success", codex: "success", push: "success" }), {
    status: "PUSHED",
    phase: "completed",
    reasonCode: "NONE",
    attemptReserved: true,
    codexStarted: true,
    pushPerformed: true,
  });
});

test("attempt is reserved only after plan, checkout, head and secret validation", () => {
  const planValidation = workflow.indexOf("name: Validate repair plan artifact");
  const checkout = workflow.indexOf("name: Checkout the exact PR head for repair");
  const head = workflow.indexOf("name: Revalidate PR head immediately before repair");
  const secret = workflow.indexOf("name: Validate OpenAI credential availability");
  const reserve = workflow.indexOf("name: Reserve the single repair attempt");
  const codex = workflow.indexOf("name: Run one bounded Codex repair attempt");
  assert.ok(planValidation > 0 && checkout > planValidation && head > checkout && secret > head && reserve > secret && codex > reserve);
  assert.doesNotMatch(workflow.slice(0, reserve), /git\.createRef\(/);
  assert.match(workflow.slice(reserve, codex), /validatePullRequest\(pull, policy/);
  assert.match(workflow.slice(reserve, codex), /git\.getRef\(/);
  assert.match(workflow.slice(reserve, codex), /git\.createRef\(/);
});
