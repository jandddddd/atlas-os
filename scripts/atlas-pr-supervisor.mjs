#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SUCCESS_CONCLUSIONS = new Set(["success"]);
const WAITING_STATUSES = new Set(["queued", "in_progress", "pending", "requested", "waiting"]);
const NON_BLOCKING_CONCLUSIONS = new Set(["neutral", "skipped"]);

export function isOwnedSupervisorComment(comment, marker) {
  return comment.user?.login === "github-actions[bot]" && comment.body?.includes(marker) === true;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^(?:"(.*)"|'(.*)')$/, (_, double, single) => double ?? single);
}

export function parseConfig(source) {
  const config = {};
  let currentList;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (!currentList) throw new Error(`List item without a key: ${line}`);
      config[currentList].push(parseScalar(line.slice(2)));
      continue;
    }
    const match = /^([a-z_]+):(?:\s*(.*))?$/.exec(line);
    if (!match) throw new Error(`Unsupported configuration line: ${line}`);
    const [, key, value = ""] = match;
    if (value === "") {
      config[key] = [];
      currentList = key;
    } else {
      config[key] = parseScalar(value);
      currentList = undefined;
    }
  }
  return config;
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

function checkState(check) {
  const status = String(check.status ?? "").toLowerCase();
  const conclusion = check.conclusion == null ? "" : String(check.conclusion).toLowerCase();
  if (WAITING_STATUSES.has(status) || (status !== "completed" && !conclusion)) return "waiting";
  if (SUCCESS_CONCLUSIONS.has(conclusion)) return "success";
  if (NON_BLOCKING_CONCLUSIONS.has(conclusion)) return "non_blocking";
  return "failed";
}

export function evaluatePullRequest(input, config) {
  const blocked = [];
  const waiting = [];
  const labels = new Set(input.labels ?? []);
  const checks = input.checks ?? [];

  if (config.enabled !== true) blocked.push("Atlas PR Autopilot ist deaktiviert.");
  if (config.mode !== "dry-run") blocked.push("Für Sprint 1 ist ausschließlich der Modus dry-run erlaubt.");
  if (input.state !== "open") blocked.push("Der Pull Request ist nicht offen.");
  if (input.draft === true) waiting.push("Der Pull Request ist noch ein Entwurf.");
  if (!(config.allowed_base_branches ?? []).includes(input.baseBranch)) {
    blocked.push(`Base-Branch „${input.baseBranch}“ ist nicht erlaubt.`);
  }
  if (!labels.has(config.required_label)) {
    blocked.push(`Erforderliches Label „${config.required_label}“ fehlt.`);
  }
  for (const label of config.never_merge_labels ?? []) {
    if (labels.has(label)) blocked.push(`Never-merge-Label „${label}“ ist gesetzt.`);
  }

  for (const check of checks) {
    const state = checkState(check);
    if (state === "failed") blocked.push(`Check „${check.name}“ ist fehlgeschlagen (${check.conclusion ?? check.status}).`);
    if (state === "waiting") waiting.push(`Check „${check.name}“ läuft noch.`);
  }
  for (const requiredName of config.required_check_names ?? []) {
    const required = checks.find((check) => check.name === requiredName);
    if (!required) waiting.push(`Erforderlicher Check „${requiredName}“ wurde noch nicht gefunden.`);
    else if (checkState(required) !== "success" && checkState(required) !== "waiting") {
      blocked.push(`Erforderlicher Check „${requiredName}“ ist nicht erfolgreich.`);
    }
  }

  if (input.mergeable === false || input.mergeable === "CONFLICTING") blocked.push("Der Pull Request hat Merge-Konflikte.");
  if (input.mergeable == null || input.mergeable === "UNKNOWN") waiting.push("Der Merge-Konfliktstatus wird noch berechnet.");

  const openBlockingReviews = (input.reviewThreads ?? []).filter(
    (thread) => !thread.resolved && (config.blocking_review_priorities ?? []).includes(thread.priority),
  );
  for (const priority of config.blocking_review_priorities ?? []) {
    const count = openBlockingReviews.filter((thread) => thread.priority === priority).length;
    if (count > 0) blocked.push(`${count} offene ${priority}-Review-Kommentar${count === 1 ? "" : "e"}.`);
  }

  if ((input.changedFiles ?? 0) > config.maximum_changed_files) {
    blocked.push(`Dateilimit überschritten: ${input.changedFiles} von maximal ${config.maximum_changed_files}.`);
  }
  const changedLines = (input.additions ?? 0) + (input.deletions ?? 0);
  if (changedLines > config.maximum_changed_lines) {
    blocked.push(`Zeilenlimit überschritten: ${changedLines} von maximal ${config.maximum_changed_lines}.`);
  }
  const changedPaths = (input.files ?? []).flatMap((file) => {
    if (typeof file === "string") return [file];
    return [file.filename, file.previous_filename].filter((path) => typeof path === "string");
  });
  const forbiddenFiles = changedPaths.filter((path) => pathIsForbidden(path, config.forbidden_paths ?? []));
  if (forbiddenFiles.length > 0) blocked.push(`Verbotene Pfade geändert: ${forbiddenFiles.join(", ")}.`);

  const reasons = [...new Set(blocked.length > 0 ? blocked : waiting)];
  const status = blocked.length > 0 ? "BLOCKED" : waiting.length > 0 ? "WAITING" : "MERGE_READY";
  return { status, reasons, safeToMerge: status === "MERGE_READY" };
}

async function main() {
  const configIndex = process.argv.indexOf("--config");
  if (configIndex < 0 || !process.argv[configIndex + 1]) throw new Error("Usage: atlas-pr-supervisor.mjs --config <path>");
  const [configSource, inputSource] = await Promise.all([
    readFile(process.argv[configIndex + 1], "utf8"),
    new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    }),
  ]);
  const result = evaluatePullRequest(JSON.parse(inputSource), parseConfig(configSource));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
