#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { redactDiagnostic } from "./atlas-pr-repair-plan.mjs";
import { assertPilotGates, parseRepairConfig, validateRepairPolicy } from "./atlas-pr-repair-policy.mjs";

const SHA = /^[0-9a-f]{40}$/i;
const EXECUTION_STATUSES = new Set(["BLOCKED", "FAILED", "PUSHED"]);
const EXECUTION_REASON_CODES = new Set([
  "INVALID_DISPATCH",
  "POLICY_REJECTED",
  "PILOT_GATES_REJECTED",
  "PR_OR_PLAN_RUN_INVALID",
  "PLAN_ARTIFACT_MISSING",
  "PLAN_ARTIFACT_INVALID",
  "TRUSTED_ENFORCEMENT_SETUP_FAILED",
  "CHECKOUT_FAILED",
  "PROMPT_RESTORE_FAILED",
  "HEAD_SHA_STALE",
  "OPENAI_KEY_MISSING",
  "ATTEMPT_UNAVAILABLE",
  "CODEX_FAILED",
  "PROMPT_CLEANUP_FAILED",
  "SCOPE_VALIDATION_FAILED",
  "NODE_SETUP_FAILED",
  "DEPENDENCY_INSTALL_FAILED",
  "TESTS_FAILED",
  "LINT_FAILED",
  "BUILD_FAILED",
  "DIFF_CHECK_FAILED",
  "TREE_REVALIDATION_FAILED",
  "GIT_CONFIG_SETUP_FAILED",
  "REMOTE_HEAD_CHANGED",
  "COMMIT_FAILED",
  "PUSH_FAILED",
  "NONE",
]);

export function pathMatches(path, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/")) return path.startsWith(pattern);
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix) && path.length > prefix.length;
    }
    return path === pattern;
  });
}

export function validateExecutionPolicy(source) {
  const policy = parseRepairConfig(source);
  return validateRepairPolicy(policy, { requireEnabled: true });
}

export function validateDispatch({ confirm, prNumber, expectedHeadSha, planRunId }) {
  if (confirm !== "EXECUTE_REPAIR") throw new Error('confirm must be exactly "EXECUTE_REPAIR".');
  if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error("A valid pr_number is required.");
  if (!SHA.test(expectedHeadSha ?? "")) throw new Error("expected_head_sha must be a full 40-character SHA.");
  if (!Number.isInteger(planRunId) || planRunId < 1) throw new Error("A valid repair_plan_run_id is required.");
}

export function isTrustedRepairPlanWorkflowPath(value) {
  if (typeof value !== "string") return false;
  const [workflowPath] = value.split("@", 2);
  return workflowPath === ".github/workflows/atlas-pr-repair.yml";
}

export function requireOpenAiApiKey(value) {
  if (typeof value !== "string" || value.length === 0) throw new Error("OPENAI_API_KEY is not configured.");
}

export function pullRequestPilotContext(pull, { repository, expectedHeadSha, actor, triggeringActor }) {
  return {
    repository,
    prNumber: pull.number,
    actor,
    triggeringActor,
    author: pull.user?.login,
    state: pull.state,
    draft: pull.draft,
    baseBranch: pull.base?.ref,
    headBranch: pull.head?.ref,
    baseRepository: pull.base?.repo?.full_name,
    headRepository: pull.head?.repo?.full_name,
    isFork: pull.head?.repo?.fork === true || pull.head?.repo?.full_name !== pull.base?.repo?.full_name,
    labels: (pull.labels ?? []).map((label) => typeof label === "string" ? label : label.name),
    expectedHeadSha,
    headSha: pull.head?.sha,
  };
}

export function validatePullRequest(pull, policy, repository, expectedHeadSha, actors = {}) {
  if (pull.state !== "open") throw new Error("Pull request is not open.");
  if (pull.head?.sha !== expectedHeadSha) throw new Error("expected_head_sha is stale; the pull request head has changed.");
  const baseRepository = pull.base?.repo?.full_name;
  const headRepository = pull.head?.repo?.full_name;
  if (baseRepository !== repository || headRepository !== repository) throw new Error("Pull request must originate in this repository.");
  if (pull.head?.repo?.fork === true || headRepository !== baseRepository) throw new Error("Fork pull requests cannot be repaired.");
  if (!(policy.allowed_base_branches ?? []).includes(pull.base?.ref)) throw new Error("Pull request base branch is not allowed.");
  const labels = (pull.labels ?? []).map((label) => typeof label === "string" ? label : label.name);
  if (!labels.includes(policy.require_label)) throw new Error(`Required label ${policy.require_label} is missing.`);
  const blockedLabel = (policy.never_run_labels ?? []).find((label) => labels.includes(label));
  if (blockedLabel) throw new Error(`Never-run label ${blockedLabel} is present.`);
  if (!pull.head?.ref || pull.head.ref === pull.base?.ref || pull.head.ref === "main") {
    throw new Error("Repair branch must be a non-main PR branch.");
  }
  const context = pullRequestPilotContext(pull, { repository, expectedHeadSha, ...actors });
  const pilot = assertPilotGates(policy, context);
  return { headBranch: pull.head.ref, headSha: pull.head.sha, context, pilotGateResults: pilot.gates };
}

export function validatePlanArtifact(files, plan, { prNumber, expectedHeadSha }) {
  const names = [...files].sort();
  if (names.length !== 2 || names[0] !== "repair-plan.json" || names[1] !== "repair-plan.md") {
    throw new Error("Repair plan artifact must contain only repair-plan.json and repair-plan.md.");
  }
  const attemptKey = `${prNumber}:${expectedHeadSha}`;
  if (plan.attemptKey !== attemptKey) throw new Error("Repair plan attemptKey does not match this dispatch.");
  if (plan.status !== "REPAIR_ELIGIBLE") throw new Error(`Repair plan status ${plan.status ?? "UNKNOWN"} cannot be executed.`);
  if (plan.safeToStart !== true) throw new Error("Repair plan is not safe to start.");
  if (plan.prNumber !== prNumber || plan.headSha !== expectedHeadSha) throw new Error("Repair plan is bound to a different PR or SHA.");
  if (typeof plan.prompt !== "string" || plan.prompt.trim() === "") throw new Error("Repair plan has no executable prompt.");
  if (!Array.isArray(plan.allowedAreas) || plan.allowedAreas.length === 0) throw new Error("Repair plan has no allowed paths.");
  return { attemptKey, prompt: plan.prompt, allowedAreas: plan.allowedAreas };
}

export function attemptTagName(prNumber, expectedHeadSha) {
  return `atlas-repair-attempt/${prNumber}-${expectedHeadSha}`;
}

export function validateChangedFiles({ files, additions, deletions }, plan, policy) {
  const uniqueFiles = [...new Set(files)].sort();
  if (uniqueFiles.length === 0) throw new Error("Codex produced no repair changes.");
  const allowed = new Set(plan.allowedAreas);
  const outsidePlan = uniqueFiles.find((path) => !allowed.has(path));
  if (outsidePlan) throw new Error(`Changed path is outside the approved plan: ${outsidePlan}`);
  const forbidden = uniqueFiles.find((path) => pathMatches(path, policy.forbidden_paths ?? []));
  if (forbidden) throw new Error(`Changed forbidden path: ${forbidden}`);
  if (uniqueFiles.length > policy.maximum_changed_files) throw new Error("Repair exceeds the changed-file limit.");
  if (additions + deletions > policy.maximum_changed_lines) throw new Error("Repair exceeds the changed-line limit.");
  return uniqueFiles;
}

export function validateTreeSnapshot({ trackedFiles, untrackedFiles, numstat, untrackedContents }, plan, policy) {
  let additions = 0;
  let deletions = 0;
  for (const [added, deleted] of numstat) {
    if (added === "-" || deleted === "-") throw new Error("Binary repair changes are not allowed.");
    additions += Number(added);
    deletions += Number(deleted);
  }
  for (const [, contents] of untrackedContents) {
    if (contents.includes(0)) throw new Error("Binary repair changes are not allowed.");
    additions += contents.toString().split("\n").length;
  }
  return validateChangedFiles({
    files: [...trackedFiles, ...untrackedFiles], additions, deletions,
  }, plan, policy);
}

export function deriveExecutionOutcome(steps) {
  const orderedFailures = [
    ["dispatch", "dispatch-validation", "INVALID_DISPATCH"],
    ["policy", "policy-validation", "POLICY_REJECTED"],
    ["pilot", "pilot-gate-validation", "PILOT_GATES_REJECTED"],
    ["pull", "pr-and-plan-run-validation", "PR_OR_PLAN_RUN_INVALID"],
    ["download", "plan-artifact-download", "PLAN_ARTIFACT_MISSING"],
    ["plan", "plan-artifact-validation", "PLAN_ARTIFACT_INVALID"],
    ["enforcement", "trusted-enforcement-setup", "TRUSTED_ENFORCEMENT_SETUP_FAILED"],
    ["checkout", "pr-head-checkout", "CHECKOUT_FAILED"],
    ["prompt", "prompt-restore", "PROMPT_RESTORE_FAILED"],
    ["head", "pre-reservation-head-validation", "HEAD_SHA_STALE"],
    ["secret", "secret-validation", "OPENAI_KEY_MISSING"],
    ["reserve", "attempt-reservation", "ATTEMPT_UNAVAILABLE"],
    ["codex", "codex", "CODEX_FAILED"],
    ["cleanup", "prompt-cleanup", "PROMPT_CLEANUP_FAILED"],
    ["scope", "scope-validation", "SCOPE_VALIDATION_FAILED"],
    ["setup", "node-setup", "NODE_SETUP_FAILED"],
    ["install", "dependency-install", "DEPENDENCY_INSTALL_FAILED"],
    ["unit", "unit-tests", "TESTS_FAILED"],
    ["lint", "lint", "LINT_FAILED"],
    ["build", "build", "BUILD_FAILED"],
    ["diff", "diff-check", "DIFF_CHECK_FAILED"],
    ["tree", "tree-revalidation", "TREE_REVALIDATION_FAILED"],
    ["fetch_config", "git-config-setup", "GIT_CONFIG_SETUP_FAILED"],
    ["remote", "remote-head-validation", "REMOTE_HEAD_CHANGED"],
    ["commit", "commit", "COMMIT_FAILED"],
    ["push", "push", "PUSH_FAILED"],
  ];
  const failed = orderedFailures.find(([step]) => steps[step] === "failure");
  const attemptReserved = steps.reserve === "success";
  const codexStarted = attemptReserved && steps.codex !== "skipped";
  const pushPerformed = steps.push === "success";

  if (pushPerformed) {
    return {
      status: "PUSHED",
      phase: "completed",
      reasonCode: "NONE",
      attemptReserved,
      codexStarted,
      pushPerformed,
    };
  }

  return {
    status: attemptReserved ? "FAILED" : "BLOCKED",
    phase: failed?.[1] ?? "workflow-incomplete",
    reasonCode: failed?.[2] ?? "POLICY_REJECTED",
    attemptReserved,
    codexStarted,
    pushPerformed,
  };
}

export function createExecutionReport(values) {
  if (!EXECUTION_STATUSES.has(values.status)) throw new Error("Invalid execution report status.");
  if (!EXECUTION_REASON_CODES.has(values.reasonCode)) throw new Error("Invalid execution report reason code.");
  const prNumber = Number.isInteger(values.prNumber) && values.prNumber > 0 ? values.prNumber : null;
  const expectedHeadSha = SHA.test(values.expectedHeadSha ?? "") ? values.expectedHeadSha : null;
  const planRunId = Number.isInteger(values.planRunId) && values.planRunId > 0 ? values.planRunId : null;
  const attemptKey = prNumber !== null && expectedHeadSha !== null ? `${prNumber}:${expectedHeadSha}` : null;
  return {
    repository: identifier(values.repository, 200),
    runId: Number.isInteger(values.runId) && values.runId > 0 ? values.runId : null,
    runUrl: identifier(values.runUrl, 500),
    actor: identifier(values.actor, 100),
    triggeringActor: identifier(values.triggeringActor, 100),
    prAuthor: identifier(values.prAuthor, 100),
    prNumber,
    baseBranch: identifier(values.baseBranch, 255),
    headBranch: identifier(values.headBranch, 255),
    baseRepository: identifier(values.baseRepository, 200),
    headRepository: identifier(values.headRepository, 200),
    expectedHeadSha,
    trustedPolicySha: SHA.test(values.trustedPolicySha ?? "") ? values.trustedPolicySha : null,
    trustedWorkflowSha: SHA.test(values.trustedWorkflowSha ?? "") ? values.trustedWorkflowSha : null,
    attemptKey,
    planRunId,
    planDigest: /^[0-9a-f]{64}$/i.test(values.planDigest ?? "") ? values.planDigest : null,
    pilotGateResults: Array.isArray(values.pilotGateResults)
      ? values.pilotGateResults.map((item) => ({
        code: /^[A-Z][A-Z0-9_]*$/.test(item?.code ?? "") ? item.code : "INVALID_GATE",
        passed: item?.passed === true,
      }))
      : [],
    status: values.status,
    phase: redactDiagnostic(values.phase, 100),
    reasonCode: values.reasonCode,
    startedAt: redactDiagnostic(values.startedAt, 100),
    finishedAt: redactDiagnostic(values.finishedAt, 100),
    attemptReserved: values.attemptReserved === true,
    attemptTag: values.attemptReserved === true
      ? redactDiagnostic(values.attemptTag, 500)
      : null,
    codexStarted: values.codexStarted === true,
    pushPerformed: values.pushPerformed === true,
    changedFiles: (values.changedFiles ?? []).map((path) => redactDiagnostic(path, 500)),
    tests: Object.fromEntries(Object.entries(values.tests ?? {}).map(([name, result]) => [
      redactDiagnostic(name, 100), redactDiagnostic(result, 100),
    ])),
    commitSha: SHA.test(values.commitSha ?? "") ? values.commitSha : null,
    mergePerformed: false,
    statement: "No merge was performed.",
  };
}

function identifier(value, maximumLength) {
  return typeof value === "string" && /^[A-Za-z0-9_./:@-]+$/.test(value) && value.length <= maximumLength
    ? value
    : null;
}

export function renderExecutionReport(report) {
  const files = report.changedFiles.length ? report.changedFiles.map((path) => `- \`${path}\``).join("\n") : "- None";
  const tests = Object.keys(report.tests).length
    ? Object.entries(report.tests).map(([name, result]) => `- ${name}: ${result}`).join("\n")
    : "- None recorded";
  const gates = report.pilotGateResults.length
    ? report.pilotGateResults.map((gate) => `- ${gate.code}: ${gate.passed}`).join("\n")
    : "- None recorded";
  return `# Atlas repair execution report\n\n- Repository: ${report.repository ?? "invalid"}\n- Run: ${report.runId ?? "invalid"}${report.runUrl ? ` (${report.runUrl})` : ""}\n- Actor: ${report.actor ?? "invalid"}\n- Triggering actor: ${report.triggeringActor ?? "invalid"}\n- PR author: ${report.prAuthor ?? "invalid"}\n- PR: ${report.prNumber ?? "invalid"}\n- Base: ${report.baseRepository ?? "invalid"}:${report.baseBranch ?? "invalid"}\n- Head: ${report.headRepository ?? "invalid"}:${report.headBranch ?? "invalid"}\n- Expected head SHA: ${report.expectedHeadSha ? `\`${report.expectedHeadSha}\`` : "invalid"}\n- Trusted policy SHA: ${report.trustedPolicySha ?? "invalid"}\n- Trusted workflow SHA: ${report.trustedWorkflowSha ?? "invalid"}\n- Attempt key: ${report.attemptKey ? `\`${report.attemptKey}\`` : "invalid"}\n- Plan run ID: ${report.planRunId ?? "invalid"}\n- Plan digest: ${report.planDigest ?? "invalid"}\n- Status: **${report.status}**\n- Phase: ${report.phase}\n- Reason code: \`${report.reasonCode}\`\n- Attempt reserved: ${report.attemptReserved}\n- Attempt tag: ${report.attemptTag ? `\`${report.attemptTag}\`` : "none"}\n- Codex started: ${report.codexStarted}\n- Push performed: ${report.pushPerformed}\n- Started: ${report.startedAt}\n- Finished: ${report.finishedAt}\n- Commit SHA: ${report.commitSha ? `\`${report.commitSha}\`` : "none"}\n\n## Pilot gates\n\n${gates}\n\n## Changed files\n\n${files}\n\n## Validation\n\n${tests}\n\n**No merge was performed.**\n`;
}

export async function writeExecutionReport(outputDirectory, report) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(outputDirectory, "repair-execution-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(join(outputDirectory, "repair-execution-report.md"), renderExecutionReport(report), "utf8"),
  ]);
}
