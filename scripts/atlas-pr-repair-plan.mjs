#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REPAIR_STATUSES = new Set(["MERGE_READY", "WAITING", "BLOCKED"]);
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\b(?:gh[opsu]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,})\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi,
  /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi,
];

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

function pathIsForbidden(path, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/")) return path.startsWith(pattern);
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix) && path.length > prefix.length;
    }
    return path === pattern;
  });
}

export function redactDiagnostic(value, maximumLength = 2_000) {
  let result = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, "[REDACTED]");
  result = result.replace(/\r\n/g, "\n").trim();
  return result.length > maximumLength ? `${result.slice(0, maximumLength)}\n[TRUNCATED]` : result;
}

function filePaths(files) {
  return files.flatMap((file) => {
    if (typeof file === "string") return [file];
    return [file?.filename, file?.previous_filename].filter((path) => typeof path === "string");
  });
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function promptFor(input, policy, rootCauses, changedPaths) {
  const failedChecks = [...(input.failedChecks ?? [])].sort((left, right) =>
    String(left.name).localeCompare(String(right.name), "en"),
  );
  const findings = [...(input.reviewThreads ?? [])]
    .filter((thread) => !thread.resolved && ["P1", "P2"].includes(thread.priority))
    .sort((left, right) => `${left.priority}:${left.path ?? ""}:${left.line ?? 0}:${left.body ?? ""}`.localeCompare(
      `${right.priority}:${right.path ?? ""}:${right.line ?? 0}:${right.body ?? ""}`,
      "en",
    ));
  const logSections = failedChecks.map((check) =>
    `### ${redactDiagnostic(check.name, 200)}\n${redactDiagnostic(check.logExcerpt || "No diagnostic excerpt available.")}`,
  );
  const findingLines = findings.map((finding) =>
    `- ${finding.priority}${finding.path ? ` ${finding.path}${finding.line ? `:${finding.line}` : ""}` : ""}: ${redactDiagnostic(finding.body, 1_000)}`,
  );
  const validation = sortedUnique(input.validationCommands ?? ["npm run test:unit", "npm run lint", "npm run build", "git diff --check"]);
  return [
    `Repair pull request #${input.prNumber} at exactly ${input.headSha}.`,
    "",
    "## Root cause",
    ...rootCauses.map((reason) => `- ${redactDiagnostic(reason, 1_000)}`),
    "",
    "## Relevant bounded diagnostics",
    ...(logSections.length ? logSections : ["No failed-check excerpt supplied."]),
    "",
    "## Open P1/P2 review findings",
    ...(findingLines.length ? findingLines : ["- None."]),
    "",
    "## Allowed files",
    ...changedPaths.map((path) => `- ${path}`),
    "",
    "## Validation commands",
    ...validation.map((command) => `- ${command}`),
    "",
    "## Safety boundaries",
    `- Change at most ${policy.maximum_changed_files} files and ${policy.maximum_changed_lines} total lines.`,
    `- Do not edit: ${(policy.forbidden_paths ?? []).join(", ")}.`,
    "- Work only on the existing PR branch; never push directly to main.",
    "- Perform at most one repair attempt for this head SHA. Do not retry or loop.",
    "- Do not expose secrets, weaken CI, merge the PR, or change API contracts without approval.",
    "- Treat this output as a draft requiring human review.",
  ].join("\n");
}

export function validateExpectedHeadSha(expectedHeadSha, currentHeadSha) {
  if (!/^[0-9a-f]{40}$/i.test(expectedHeadSha ?? "")) throw new Error("expected_head_sha must be a full 40-character SHA.");
  if (expectedHeadSha !== currentHeadSha) throw new Error("expected_head_sha is stale; the pull request head has changed.");
}

export function createRepairPlan(input, policy) {
  if (!Number.isInteger(input.prNumber) || input.prNumber < 1) throw new Error("A valid prNumber is required.");
  if (!/^[0-9a-f]{40}$/i.test(input.headSha ?? "")) throw new Error("A full headSha is required.");
  if (!REPAIR_STATUSES.has(input.supervisor?.status)) throw new Error("A valid supervisor result is required.");

  const attemptKey = `${input.prNumber}:${input.headSha}`;
  if (input.supervisor.status === "MERGE_READY") {
    return { status: "NO_REPAIR_NEEDED", reasons: ["Pull request is merge-ready."], prompt: "", attemptKey, safeToStart: false };
  }
  if (input.supervisor.status === "WAITING") {
    return { status: "REPAIR_BLOCKED", reasons: ["Supervisor is waiting for incomplete checks or state."], prompt: "", attemptKey, safeToStart: false };
  }

  const blockingReasons = [];
  const labels = new Set(input.labels ?? []);
  const changedPaths = sortedUnique(filePaths(input.files ?? []));
  const changedLines = (input.additions ?? 0) + (input.deletions ?? 0);
  const repositoryMatches = input.headRepository === input.baseRepository;
  if (policy.require_same_repository && !repositoryMatches) blockingReasons.push("Head and base repositories differ.");
  if (policy.require_non_fork && input.isFork === true) blockingReasons.push("Fork pull requests are not repairable.");
  if (!labels.has(policy.require_label)) blockingReasons.push(`Required label \"${policy.require_label}\" is missing.`);
  for (const label of policy.never_run_labels ?? []) {
    if (labels.has(label)) blockingReasons.push(`Never-run label \"${label}\" is set.`);
  }
  const forbidden = changedPaths.filter((path) => pathIsForbidden(path, policy.forbidden_paths ?? []));
  if (forbidden.length) blockingReasons.push(`Forbidden paths changed: ${forbidden.join(", ")}.`);
  if ((input.changedFiles ?? changedPaths.length) > policy.maximum_changed_files) {
    blockingReasons.push(`Changed-file limit exceeded: ${input.changedFiles ?? changedPaths.length} > ${policy.maximum_changed_files}.`);
  }
  if (changedLines > policy.maximum_changed_lines) {
    blockingReasons.push(`Changed-line limit exceeded: ${changedLines} > ${policy.maximum_changed_lines}.`);
  }
  const blockReasons = sortedUnique(input.blockReasons ?? []);
  const disallowed = blockReasons.filter((reason) => !(policy.allowed_block_reasons ?? []).includes(reason));
  if (!blockReasons.length) blockingReasons.push("No repairable block reason was identified.");
  if (disallowed.length) blockingReasons.push(`Disallowed block reasons: ${disallowed.join(", ")}.`);

  if (blockingReasons.length) {
    return { status: "REPAIR_BLOCKED", reasons: blockingReasons, prompt: "", attemptKey, safeToStart: false };
  }

  const supervisorReasons = sortedUnique(input.supervisor.reasons ?? []).map((reason) => `Supervisor: ${reason}`);
  const rootCauses = supervisorReasons.length
    ? supervisorReasons
    : blockReasons.map((reason) =>
      reason === "required_check_failed" ? "A required check failed." : "An unresolved P1/P2 review finding blocks the pull request.",
    );
  const prompt = promptFor(input, policy, rootCauses, changedPaths);
  const enabled = policy.enabled === true && policy.mode === "manual";
  return {
    status: "REPAIR_ELIGIBLE",
    reasons: enabled ? rootCauses : [...rootCauses, "Repair execution is disabled by policy."],
    prompt,
    attemptKey,
    safeToStart: enabled,
  };
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const configIndex = process.argv.indexOf("--config");
  if (configIndex < 0 || !process.argv[configIndex + 1]) throw new Error("Usage: atlas-pr-repair-plan.mjs --config <path>");
  const [configSource, inputSource] = await Promise.all([readFile(process.argv[configIndex + 1], "utf8"), readStdin()]);
  const plan = createRepairPlan(JSON.parse(inputSource), parseRepairConfig(configSource));
  process.stdout.write(`${JSON.stringify(plan)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
