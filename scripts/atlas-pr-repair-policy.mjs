#!/usr/bin/env node

const SHA = /^[0-9a-f]{40}$/i;

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^(?:"(.*)"|'(.*)')$/, (_, double, single) => double ?? single);
}

export function parseRepairConfig(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => /^repair:\s*(?:#.*)?$/.test(line));
  if (start < 0) throw new Error("Missing repair policy.");
  const repair = {};
  let currentList;
  for (const rawLine of lines.slice(start + 1)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    const indent = rawLine.match(/^\s*/)[0].length;
    if (indent === 0) break;
    const line = rawLine.trim();
    if (line.startsWith("- ")) {
      if (!currentList) throw new Error(`List item without a repair key: ${line}`);
      repair[currentList].push(parseScalar(line.slice(2)));
      continue;
    }
    const match = /^([a-z_]+):(?:\s*(.*))?$/.exec(line);
    if (!match) throw new Error(`Unsupported repair policy line: ${line}`);
    const [, key, value = ""] = match;
    if (value === "") {
      repair[key] = [];
      currentList = key;
    } else {
      repair[key] = parseScalar(value);
      currentList = undefined;
    }
  }
  return repair;
}

function stringList(policy, key, { nonEmpty = true } = {}) {
  const value = policy[key];
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)
      || value.some((item) => typeof item !== "string" || item.trim() === "" || item.includes("*"))) {
    throw new Error(`${key} must be ${nonEmpty ? "a non-empty" : "an"} exact string list without wildcards.`);
  }
  return value;
}

function integerList(policy, key, { nonEmpty = true } = {}) {
  const value = policy[key];
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)
      || value.some((item) => !Number.isInteger(item) || item < 1)) {
    throw new Error(`${key} must be ${nonEmpty ? "a non-empty" : "an"} list of positive PR numbers.`);
  }
  return value;
}

export function validatePilotPolicy(policy, { requireEnabled = false } = {}) {
  if (typeof policy.pilot_enabled !== "boolean") throw new Error("pilot_enabled must be boolean.");
  if (typeof policy.pilot_required_label !== "string" || !policy.pilot_required_label.trim()
      || policy.pilot_required_label.includes("*")) {
    throw new Error("pilot_required_label must be one exact non-empty label without wildcards.");
  }
  const active = requireEnabled || policy.pilot_enabled === true;
  integerList(policy, "pilot_allowed_pr_numbers", { nonEmpty: active });
  stringList(policy, "pilot_allowed_actors", { nonEmpty: active });
  stringList(policy, "pilot_allowed_authors", { nonEmpty: active });
  stringList(policy, "pilot_allowed_head_prefixes", { nonEmpty: active });
  if (requireEnabled && policy.pilot_enabled !== true) throw new Error("Repair pilot execution is disabled by policy.");
  return policy;
}

export function validateRepairPolicy(policy, { requireEnabled = false } = {}) {
  if (typeof policy.enabled !== "boolean") throw new Error("repair.enabled must be boolean.");
  if (requireEnabled && policy.enabled !== true) throw new Error("Repair execution is disabled by policy.");
  if ((policy.execution_mode ?? policy.mode) !== "manual") throw new Error("Repair execution mode must be manual.");
  if (policy.execution_mode && policy.mode && policy.execution_mode !== policy.mode) throw new Error("Repair mode and execution_mode must agree.");
  if (policy.maximum_attempts_per_commit !== 1) throw new Error("Exactly one repair attempt per commit is required.");
  for (const key of ["require_plan_artifact", "require_expected_head_sha", "require_same_repository", "require_non_fork"]) {
    if (policy[key] !== true) throw new Error(`${key} must be true.`);
  }
  for (const key of ["maximum_changed_files", "maximum_changed_lines"]) {
    if (!Number.isFinite(policy[key]) || !Number.isInteger(policy[key]) || policy[key] < 1) throw new Error(`${key} must be a finite positive integer.`);
  }
  if (typeof policy.require_label !== "string" || !policy.require_label.trim() || policy.require_label.includes("*")) throw new Error("require_label must be an exact label.");
  for (const key of ["allowed_base_branches", "never_run_labels", "allowed_block_reasons"]) stringList(policy, key);
  if (!Array.isArray(policy.forbidden_paths) || policy.forbidden_paths.length === 0
      || policy.forbidden_paths.some((path) => typeof path !== "string" || !path.trim())) {
    throw new Error("forbidden_paths must be a non-empty list of non-empty path patterns.");
  }
  if (policy.auto_merge !== false) throw new Error("auto_merge must remain false.");
  validatePilotPolicy(policy, { requireEnabled: requireEnabled || policy.pilot_enabled === true });
  return policy;
}

function gate(code, passed) {
  return { code, passed: passed === true };
}

export function evaluatePilotGates(policy, context) {
  validatePilotPolicy(policy);
  const labels = new Set(context.labels ?? []);
  const baseRepository = context.baseRepository;
  const headRepository = context.headRepository;
  const headBranch = context.headBranch ?? "";
  const baseBranch = context.baseBranch ?? "";
  const gates = [
    gate("REPAIR_ENABLED", policy.enabled === true),
    gate("PILOT_ENABLED", policy.pilot_enabled === true),
    gate("PR_ALLOWLISTED", policy.pilot_allowed_pr_numbers.includes(context.prNumber)),
    gate("ACTOR_ALLOWLISTED", policy.pilot_allowed_actors.includes(context.actor)),
    gate("TRIGGERING_ACTOR_ALLOWLISTED", policy.pilot_allowed_actors.includes(context.triggeringActor)),
    gate("AUTHOR_ALLOWLISTED", policy.pilot_allowed_authors.includes(context.author)),
    gate("PR_OPEN", context.state === "open"),
    gate("PR_NOT_DRAFT", context.draft === false),
    gate("BASE_ALLOWED", policy.allowed_base_branches.includes(baseBranch)),
    gate("SAME_REPOSITORY", baseRepository === context.repository && headRepository === context.repository),
    gate("NON_FORK", context.isFork === false),
    gate("REPAIR_LABEL_PRESENT", labels.has(policy.require_label)),
    gate("PILOT_LABEL_PRESENT", labels.has(policy.pilot_required_label)),
    gate("NO_NEVER_RUN_LABEL", !(policy.never_run_labels ?? []).some((label) => labels.has(label))),
    gate("HEAD_SHA_MATCHES", SHA.test(context.expectedHeadSha ?? "") && context.headSha === context.expectedHeadSha),
    gate("HEAD_IS_PR_BRANCH", headBranch !== "" && headBranch !== "main" && headBranch !== baseBranch),
    gate("HEAD_PREFIX_ALLOWED", policy.pilot_allowed_head_prefixes.some((prefix) => headBranch.startsWith(prefix))),
  ];
  return { passed: gates.every((item) => item.passed), gates };
}

export function assertPilotGates(policy, context) {
  const result = evaluatePilotGates(policy, context);
  const failed = result.gates.filter((item) => !item.passed).map((item) => item.code);
  if (failed.length) throw new Error(`Pilot gates rejected: ${failed.join(", ")}.`);
  return result;
}
