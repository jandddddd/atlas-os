import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertPilotGates, evaluatePilotGates, parseRepairConfig, validatePilotPolicy } from "./atlas-pr-repair-policy.mjs";
import { createRepairPlan } from "./atlas-pr-repair-plan.mjs";
import { validatePullRequest } from "./atlas-pr-repair-execute.mjs";

const source = readFileSync(new URL("../.github/atlas-autopilot.yml", import.meta.url), "utf8");
const disabled = parseRepairConfig(source);
const active = {
  ...disabled,
  enabled: true,
  pilot_enabled: true,
  pilot_allowed_pr_numbers: [42],
  pilot_allowed_actors: ["operator"],
  pilot_allowed_authors: ["author"],
};
const context = {
  repository: "atlas/atlas-os",
  prNumber: 42,
  actor: "operator",
  triggeringActor: "operator",
  author: "author",
  state: "open",
  draft: false,
  baseBranch: "main",
  headBranch: "pilot/atlas-repair-42",
  baseRepository: "atlas/atlas-os",
  headRepository: "atlas/atlas-os",
  isFork: false,
  labels: ["atlas-repair", "atlas-repair-pilot"],
  expectedHeadSha: "a".repeat(40),
  headSha: "a".repeat(40),
};

test("repository policy keeps both repair switches disabled", () => {
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.pilot_enabled, false);
  assert.equal(disabled.auto_merge, false);
  assert.doesNotThrow(() => validatePilotPolicy(disabled));
});

test("all exact pilot gates pass for one explicitly allowed PR", () => {
  assert.equal(evaluatePilotGates(active, context).passed, true);
  assert.doesNotThrow(() => assertPilotGates(active, context));
});

test("allowlisted triggering actor passes while a different triggering actor fails", () => {
  assert.equal(evaluatePilotGates(active, context).gates.find((gate) => gate.code === "TRIGGERING_ACTOR_ALLOWLISTED")?.passed, true);
  assert.equal(evaluatePilotGates(active, { ...context, triggeringActor: "not-allowlisted" })
    .gates.find((gate) => gate.code === "TRIGGERING_ACTOR_ALLOWLISTED")?.passed, false);
});

test("syntactically hostile branch content remains an inert data value", () => {
  const maliciousBranch = 'pilot/atlas-repair-");globalThis.atlasRepairInjected=true;(value=";()=payload';
  delete globalThis.atlasRepairInjected;
  const result = evaluatePilotGates(active, { ...context, headBranch: maliciousBranch });
  assert.equal(result.passed, true);
  assert.equal(globalThis.atlasRepairInjected, undefined);
  const execution = validatePullRequest({
    number: context.prNumber, state: "open", draft: false, user: { login: context.author },
    base: { ref: "main", repo: { full_name: context.repository } },
    head: { ref: maliciousBranch, sha: context.headSha, repo: { full_name: context.repository, fork: false } },
    labels: context.labels.map((name) => ({ name })),
  }, active, context.repository, context.expectedHeadSha, { actor: context.actor, triggeringActor: context.triggeringActor });
  assert.equal(execution.headBranch, maliciousBranch);
  assert.equal(globalThis.atlasRepairInjected, undefined);
});

function currentPilotPull(overrides = {}) {
  const pull = {
    number: context.prNumber, state: "open", draft: false, user: { login: context.author },
    base: { ref: "main", repo: { full_name: context.repository } },
    head: { ref: context.headBranch, sha: context.headSha, repo: { full_name: context.repository, fork: false } },
    labels: context.labels.map((name) => ({ name })),
  };
  return { ...pull, ...overrides };
}

for (const [scenario, mutate, expected] of [
  ["pilot label removed after reservation", (pull) => ({ ...pull, labels: [{ name: "atlas-repair" }] }), /PILOT_LABEL_PRESENT/],
  ["never-run label added after reservation", (pull) => ({ ...pull, labels: [...pull.labels, { name: "do-not-merge" }] }), /Never-run/],
  ["pull request closed after reservation", (pull) => ({ ...pull, state: "closed" }), /not open/],
  ["head SHA changed during execution", (pull) => ({ ...pull, head: { ...pull.head, sha: "b".repeat(40) } }), /stale/],
]) {
  test(`${scenario} blocks the pre-write validation`, () => {
    assert.throws(() => validatePullRequest(
      mutate(currentPilotPull()), active, context.repository, context.expectedHeadSha,
      { actor: context.actor, triggeringActor: context.triggeringActor },
    ), expected);
  });
}

test("unchanged valid PR passes pre-write validation for the intended branch", () => {
  const validated = validatePullRequest(
    currentPilotPull(), active, context.repository, context.expectedHeadSha,
    { actor: context.actor, triggeringActor: context.triggeringActor },
  );
  assert.equal(validated.headBranch, context.headBranch);
  assert.equal(validated.headSha, context.headSha);
});

test("planning and execution use the identical pilot-gate contract", () => {
  const planning = createRepairPlan({
    ...context,
    headSha: context.expectedHeadSha,
    files: ["scripts/fixtures/atlas-repair-pilot-fixture.mjs"], changedFiles: 1, additions: 1, deletions: 1,
    failedChecks: [{ name: "CI / verify", logExcerpt: "fixture assertion failed" }], reviewThreads: [],
    supervisor: { status: "BLOCKED", reasons: ["CI failed"] }, blockReasons: ["required_check_failed"],
  }, active);
  const execution = validatePullRequest({
    number: context.prNumber, state: context.state, draft: context.draft, user: { login: context.author },
    base: { ref: context.baseBranch, repo: { full_name: context.baseRepository } },
    head: { ref: context.headBranch, sha: context.headSha, repo: { full_name: context.headRepository, fork: false } },
    labels: context.labels.map((name) => ({ name })),
  }, active, context.repository, context.expectedHeadSha, {
    actor: context.actor, triggeringActor: context.triggeringActor,
  });
  assert.equal(planning.safeToStart, true);
  assert.deepEqual(planning.pilotGateResults, execution.pilotGateResults);
});

for (const [name, override, code] of [
  ["repair disabled", { policy: { enabled: false } }, "REPAIR_ENABLED"],
  ["pilot disabled", { policy: { pilot_enabled: false } }, "PILOT_ENABLED"],
  ["PR not allowlisted", { context: { prNumber: 43 } }, "PR_ALLOWLISTED"],
  ["actor not allowlisted", { context: { actor: "other" } }, "ACTOR_ALLOWLISTED"],
  ["triggering actor not allowlisted", { context: { triggeringActor: "other" } }, "TRIGGERING_ACTOR_ALLOWLISTED"],
  ["author not allowlisted", { context: { author: "other" } }, "AUTHOR_ALLOWLISTED"],
  ["closed PR", { context: { state: "closed" } }, "PR_OPEN"],
  ["draft PR", { context: { draft: true } }, "PR_NOT_DRAFT"],
  ["wrong base", { context: { baseBranch: "release" } }, "BASE_ALLOWED"],
  ["foreign repository", { context: { headRepository: "other/repo" } }, "SAME_REPOSITORY"],
  ["fork", { context: { isFork: true } }, "NON_FORK"],
  ["repair label missing", { context: { labels: ["atlas-repair-pilot"] } }, "REPAIR_LABEL_PRESENT"],
  ["pilot label missing", { context: { labels: ["atlas-repair"] } }, "PILOT_LABEL_PRESENT"],
  ["never-run label", { context: { labels: ["atlas-repair", "atlas-repair-pilot", "security"] } }, "NO_NEVER_RUN_LABEL"],
  ["stale SHA", { context: { headSha: "b".repeat(40) } }, "HEAD_SHA_MATCHES"],
  ["main head", { context: { headBranch: "main" } }, "HEAD_IS_PR_BRANCH"],
  ["unapproved prefix", { context: { headBranch: "feature/repair" } }, "HEAD_PREFIX_ALLOWED"],
]) {
  test(`${name} fails closed with ${code}`, () => {
    const policy = { ...active, ...(override.policy ?? {}) };
    const candidate = { ...context, ...(override.context ?? {}) };
    const result = evaluatePilotGates(policy, candidate);
    assert.equal(result.passed, false);
    assert.equal(result.gates.find((gate) => gate.code === code)?.passed, false);
    assert.throws(() => assertPilotGates(policy, candidate), new RegExp(code));
  });
}

for (const key of ["pilot_allowed_pr_numbers", "pilot_allowed_actors", "pilot_allowed_authors", "pilot_allowed_head_prefixes"]) {
  test(`active pilot rejects empty ${key}`, () => {
    assert.throws(() => validatePilotPolicy({ ...active, [key]: [] }, { requireEnabled: true }), new RegExp(key));
  });
}

test("pilot lists reject wildcards and wrong element types", () => {
  assert.throws(() => validatePilotPolicy({ ...active, pilot_allowed_actors: ["*"] }), /wildcards/);
  assert.throws(() => validatePilotPolicy({ ...active, pilot_allowed_pr_numbers: ["42"] }), /PR numbers/);
});
