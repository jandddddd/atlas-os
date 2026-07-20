import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  deduplicateCheckRuns,
  normalizeCheckName,
  evaluatePullRequest,
  findReviewPriority,
  isOwnedSupervisorComment,
  parseConfig,
} from "./atlas-pr-supervisor.mjs";

const workflow = readFileSync(new URL("../.github/workflows/atlas-pr-supervisor.yml", import.meta.url), "utf8");

const config = {
  enabled: true,
  mode: "dry-run",
  allowed_base_branches: ["main"],
  required_check_names: ["CI / verify"],
  blocking_review_priorities: ["P1", "P2"],
  maximum_changed_files: 25,
  maximum_changed_lines: 1500,
  forbidden_paths: [".github/workflows/", ".env", ".env.*", "migrations/", "prisma/"],
  required_label: "atlas-autopilot",
  never_merge_labels: ["do-not-merge", "security", "product-decision"],
};

const greenPr = {
  state: "open",
  draft: false,
  baseBranch: "main",
  labels: ["atlas-autopilot"],
  checks: [{ name: "CI / verify", status: "completed", conclusion: "success" }],
  mergeable: true,
  reviewThreads: [],
  changedFiles: 2,
  additions: 40,
  deletions: 10,
  files: ["scripts/example.mjs", "docs/example.md"],
};

function evaluate(overrides = {}) {
  return evaluatePullRequest({ ...greenPr, ...overrides }, config);
}

test("vollständig grüner PR ist MERGE_READY", () => {
  assert.deepEqual(evaluate(), { status: "MERGE_READY", reasons: [], safeToMerge: true });
});

test("normalizes workflow and job names", () => {
  assert.equal(normalizeCheckName("CI", "verify"), "CI / verify");
});

test("verschachtelte Repair-Policy verändert die Supervisor-Policy nicht", () => {
  const completePolicy = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
  const parsed = parseConfig(completePolicy);
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.mode, "dry-run");
  assert.equal(parsed.repair, undefined);
});

test("Draft-PR ist WAITING und niemals merge-sicher", () => {
  assert.deepEqual(evaluate({ draft: true }), {
    status: "WAITING",
    reasons: ["Der Pull Request ist noch ein Entwurf."],
    safeToMerge: false,
  });
});

test("laufende CI ist WAITING", () => {
  assert.equal(evaluate({ checks: [{ name: "CI / verify", status: "in_progress", conclusion: null }] }).status, "WAITING");
});

test("fehlgeschlagene CI ist BLOCKED", () => {
  assert.equal(evaluate({ checks: [{ name: "CI / verify", status: "completed", conclusion: "failure" }] }).status, "BLOCKED");
});

test("übersprungener Pflicht-Check ist BLOCKED", () => {
  assert.equal(evaluate({ checks: [{ name: "CI / verify", status: "completed", conclusion: "skipped" }] }).status, "BLOCKED");
});

for (const priority of ["P1", "P2"]) {
  test(`offenes ${priority} blockiert`, () => {
    assert.equal(evaluate({ reviewThreads: [{ priority, resolved: false }] }).status, "BLOCKED");
  });
}

test("nur P3 blockiert nicht", () => {
  assert.equal(evaluate({ reviewThreads: [{ priority: "P3", resolved: false }] }).status, "MERGE_READY");
});

test("fehlendes atlas-autopilot-Label blockiert", () => {
  assert.equal(evaluate({ labels: [] }).status, "BLOCKED");
});

test("do-not-merge-Label blockiert", () => {
  assert.equal(evaluate({ labels: ["atlas-autopilot", "do-not-merge"] }).status, "BLOCKED");
});

test("verbotener Pfad blockiert", () => {
  assert.equal(evaluate({ files: [".github/workflows/rogue.yml"] }).status, "BLOCKED");
});

test("Umbenennung aus verbotenem Pfad blockiert", () => {
  assert.equal(
    evaluate({ files: [{ filename: "docs/001.sql", previous_filename: "migrations/001.sql" }] }).status,
    "BLOCKED",
  );
});

test("Umbenennung in verbotenen Pfad blockiert", () => {
  assert.equal(
    evaluate({ files: [{ filename: "prisma/schema.prisma", previous_filename: "docs/schema.prisma" }] }).status,
    "BLOCKED",
  );
});

test("Größenlimit blockiert", () => {
  assert.equal(evaluate({ additions: 1500, deletions: 1 }).status, "BLOCKED");
});

test("Merge-Konflikt blockiert", () => {
  assert.equal(evaluate({ mergeable: false }).status, "BLOCKED");
});

test("Supervisor-Kommentar gehört nur dem GitHub-Actions-Bot mit Marker", () => {
  const marker = "<!-- atlas-pr-supervisor -->";
  assert.equal(isOwnedSupervisorComment({ user: { login: "github-actions[bot]" }, body: marker }, marker), true);
  assert.equal(isOwnedSupervisorComment({ user: { login: "octocat" }, body: marker }, marker), false);
  assert.equal(isOwnedSupervisorComment({ user: { login: "github-actions[bot]" }, body: "Status" }, marker), false);
});

test("Workflow aktualisiert den Status bei Review-Aktivität", () => {
  assert.match(workflow, /pull_request_review:\n\s+types: \[submitted, edited, dismissed\]/);
  assert.match(workflow, /pull_request_review_comment:\n\s+types: \[created, edited, deleted\]/);
  assert.match(workflow, /"pull_request_review",\n\s+"pull_request_review_comment",/);
});

test("P2-Marker bleibt in Review-Threads mit mehr als 100 Kommentaren sichtbar", () => {
  const commentBodies = ["P2: ursprünglicher Review-Kommentar", ...Array.from({ length: 100 }, () => "Antwort")];
  assert.equal(findReviewPriority(commentBodies), "P2");
  assert.match(workflow, /comments\(first: 100, after: \$cursor\)/);
  assert.match(workflow, /while \(commentCursor\)/);
});

test("CI-Check vom PR-Merge-SHA wird erkannt und nicht doppelt gezählt", () => {
  const verify = { id: 42, name: "CI / verify", status: "completed", conclusion: "success" };
  const checks = deduplicateCheckRuns([
    { id: 7, name: "other", status: "completed", conclusion: "success" },
    verify,
    verify,
  ]);
  assert.equal(checks.length, 2);
  assert.equal(evaluate({ checks }).status, "MERGE_READY");
  assert.match(workflow, /ref: `pull\/\$\{pullNumber\}\/merge`/);
});

test("Workflow checkt den Base-SHA vor dem absoluten Supervisor-Import aus", () => {
  const checkoutIndex = workflow.indexOf("uses: actions/checkout@v4");
  const debugIndex = workflow.indexOf("ls -la scripts");
  const importIndex = workflow.indexOf("pathToFileURL(`${process.env.GITHUB_WORKSPACE}/scripts/atlas-pr-supervisor.mjs`).href");
  assert.ok(checkoutIndex >= 0 && checkoutIndex < debugIndex && debugIndex < importIndex);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha/);
});
