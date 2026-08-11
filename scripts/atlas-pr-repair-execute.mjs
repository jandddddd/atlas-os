#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseRepairConfig, redactDiagnostic } from "./atlas-pr-repair-plan.mjs";

const SHA = /^[0-9a-f]{40}$/i;
const EXECUTION_STATUSES = new Set(["BLOCKED", "FAILED", "PUSHED"]);
const EXECUTION_REASON_CODES = new Set([
  "INVALID_DISPATCH",
  "POLICY_REJECTED",
  "PR_OR_PLAN_RUN_INVALID",
  "PLAN_ARTIFACT_MISSING",
  "PLAN_ARTIFACT_INVALID",
  "CHECKOUT_FAILED",
  "HEAD_SHA_STALE",
  "OPENAI_KEY_MISSING",
  "ATTEMPT_UNAVAILABLE",
  "CODEX_FAILED",
  "SCOPE_VALIDATION_FAILED",
  "DEPENDENCY_INSTALL_FAILED",
  "TESTS_FAILED",
  "LINT_FAILED",
  "BUILD_FAILED",
  "DIFF_CHECK_FAILED",
  "TREE_REVALIDATION_FAILED",
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

function requirePolicyValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateExecutionPolicy(source) {
  const policy = parseRepairConfig(source);
  requirePolicyValue(policy.enabled === true, "Repair execution is disabled by policy.");
  requirePolicyValue((policy.execution_mode ?? policy.mode) === "manual", "Repair execution mode must be manual.");
  if (policy.execution_mode && policy.mode) {
    requirePolicyValue(policy.execution_mode === policy.mode, "Repair mode and execution_mode must agree.");
  }
  requirePolicyValue(policy.maximum_attempts_per_commit === 1, "Exactly one repair attempt per commit is required.");
  requirePolicyValue(policy.require_plan_artifact === true, "A repair plan artifact is required.");
  requirePolicyValue(policy.require_expected_head_sha === true, "Expected-head SHA binding is required.");
  requirePolicyValue(policy.require_same_repository === true, "Same-repository enforcement is required.");
  requirePolicyValue(policy.require_non_fork === true, "Fork rejection is required.");
  requirePolicyValue(
    Number.isFinite(policy.maximum_changed_files) && Number.isInteger(policy.maximum_changed_files)
      && policy.maximum_changed_files > 0,
    "maximum_changed_files must be a finite positive integer.",
  );
  requirePolicyValue(
    Number.isFinite(policy.maximum_changed_lines) && Number.isInteger(policy.maximum_changed_lines)
      && policy.maximum_changed_lines > 0,
    "maximum_changed_lines must be a finite positive integer.",
  );
  requirePolicyValue(
    Array.isArray(policy.forbidden_paths) && policy.forbidden_paths.length > 0
      && policy.forbidden_paths.every((path) => typeof path === "string" && path.trim() !== ""),
    "forbidden_paths must be a non-empty list of non-empty strings.",
  );
  requirePolicyValue(policy.auto_merge === false, "auto_merge must remain false.");
  return policy;
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

export function validatePullRequest(pull, policy, repository, expectedHeadSha) {
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
  return { headBranch: pull.head.ref, headSha: pull.head.sha };
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
    ["pull", "pr-and-plan-run-validation", "PR_OR_PLAN_RUN_INVALID"],
    ["download", "plan-artifact-download", "PLAN_ARTIFACT_MISSING"],
    ["plan", "plan-artifact-validation", "PLAN_ARTIFACT_INVALID"],
    ["checkout", "pr-head-checkout", "CHECKOUT_FAILED"],
    ["head", "pre-reservation-head-validation", "HEAD_SHA_STALE"],
    ["secret", "secret-validation", "OPENAI_KEY_MISSING"],
    ["reserve", "attempt-reservation", "ATTEMPT_UNAVAILABLE"],
    ["codex", "codex", "CODEX_FAILED"],
    ["scope", "scope-validation", "SCOPE_VALIDATION_FAILED"],
    ["install", "dependency-install", "DEPENDENCY_INSTALL_FAILED"],
    ["unit", "unit-tests", "TESTS_FAILED"],
    ["lint", "lint", "LINT_FAILED"],
    ["build", "build", "BUILD_FAILED"],
    ["diff", "diff-check", "DIFF_CHECK_FAILED"],
    ["tree", "tree-revalidation", "TREE_REVALIDATION_FAILED"],
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
    prNumber,
    expectedHeadSha,
    attemptKey,
    planRunId,
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

export function renderExecutionReport(report) {
  const files = report.changedFiles.length ? report.changedFiles.map((path) => `- \`${path}\``).join("\n") : "- None";
  const tests = Object.keys(report.tests).length
    ? Object.entries(report.tests).map(([name, result]) => `- ${name}: ${result}`).join("\n")
    : "- None recorded";
  return `# Atlas repair execution report\n\n- PR: ${report.prNumber ?? "invalid"}\n- Expected head SHA: ${report.expectedHeadSha ? `\`${report.expectedHeadSha}\`` : "invalid"}\n- Attempt key: ${report.attemptKey ? `\`${report.attemptKey}\`` : "invalid"}\n- Plan run ID: ${report.planRunId ?? "invalid"}\n- Status: **${report.status}**\n- Phase: ${report.phase}\n- Reason code: \`${report.reasonCode}\`\n- Attempt reserved: ${report.attemptReserved}\n- Attempt tag: ${report.attemptTag ? `\`${report.attemptTag}\`` : "none"}\n- Codex started: ${report.codexStarted}\n- Push performed: ${report.pushPerformed}\n- Started: ${report.startedAt}\n- Finished: ${report.finishedAt}\n- Commit SHA: ${report.commitSha ? `\`${report.commitSha}\`` : "none"}\n\n## Changed files\n\n${files}\n\n## Validation\n\n${tests}\n\n**No merge was performed.**\n`;
}

export async function writeExecutionReport(outputDirectory, report) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(outputDirectory, "repair-execution-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(join(outputDirectory, "repair-execution-report.md"), renderExecutionReport(report), "utf8"),
  ]);
}
