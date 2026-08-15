export const STATE_MARKER = "<!-- atlas-codex-pr-remediation-state ";
export const MAX_ROUNDS = 2;

const PRIORITY_ORDER = ["P1", "P2"];
const TEST_OR_HELPER_PATH = /(?:^|\/)(?:__tests__|tests?|e2e|playwright|test-helpers?)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i;
const CODEX_REVIEWER_LOGIN = "chatgpt-codex-connector";

export function normalizeGitHubLogin(login) {
  return String(login ?? "").trim().toLowerCase().replace(/\[bot\]$/, "");
}

export function isCodexReviewer(login) {
  return normalizeGitHubLogin(login) === CODEX_REVIEWER_LOGIN;
}

export function findPriority(body) {
  const priorities = [...String(body ?? "").matchAll(/(?:^|\W)(P[12])(?:\W|$)/gi)]
    .map((match) => match[1].toUpperCase());
  return PRIORITY_ORDER.find((priority) => priorities.includes(priority)) ?? null;
}

export function selectUnresolvedReviewFindings(reviewThreads, reviewCommentIds) {
  const selectedCommentIds = new Set([...reviewCommentIds].map(String));
  return reviewThreads.flatMap((thread) => {
    if (thread.isResolved) return [];
    const comment = thread.comments.find((candidate) =>
      isCodexReviewer(candidate.author) && selectedCommentIds.has(String(candidate.databaseId)),
    );
    if (!comment) return [];
    const priority = findPriority(comment.body);
    return priority ? [{
      id: thread.id,
      commentId: String(comment.databaseId),
      priority,
      path: comment.path,
      body: comment.body,
    }] : [];
  });
}

export function encodeState(state) {
  return `${STATE_MARKER}${JSON.stringify(state)} -->`;
}

export function decodeState(body) {
  const source = String(body ?? "");
  const start = source.indexOf(STATE_MARKER);
  if (start < 0) return null;
  const end = source.indexOf(" -->", start + STATE_MARKER.length);
  if (end < 0) return null;
  try {
    const state = JSON.parse(source.slice(start + STATE_MARKER.length, end));
    if (state?.version !== 1 || !Number.isInteger(state.round) || state.round < 1 || state.round > MAX_ROUNDS) return null;
    if (!Number.isInteger(state.prNumber) || state.prNumber < 1) return null;
    if (!["remediation_requested", "review_requested", "awaiting_review_after_push", "escalated", "clean"].includes(state.phase)) return null;
    if (!/^[a-f0-9]{40}$/.test(state.boundHead)) return null;
    if (!Array.isArray(state.originalPaths) || !state.originalPaths.every((path) => typeof path === "string")) return null;
    if (!Array.isArray(state.findingIds) || !state.findingIds.every((id) => typeof id === "string")) return null;
    return state;
  } catch {
    return null;
  }
}

export function latestState(comments) {
  return [...comments]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((comment) => comment.author === "github-actions[bot]" ? decodeState(comment.body) : null)
    .find(Boolean) ?? null;
}

function stateFor({ pull, round, phase, originalPaths, findingIds }) {
  return {
    version: 1,
    prNumber: pull.number,
    round,
    phase,
    boundHead: pull.headSha,
    originalPaths: [...new Set(originalPaths)].sort(),
    findingIds: [...new Set(findingIds)].sort(),
  };
}

function escalation(reason, state = null) {
  return { action: "ESCALATE", reason, state };
}

export function planRemediation({ event, pull, findings, comments = [] }) {
  if (pull.state !== "open" || pull.draft) return { action: "WAIT", reason: "Pull request is not open and ready." };
  if (pull.baseRef !== "main" || pull.headRef === "main" || pull.headRepository !== pull.baseRepository) {
    return escalation("Only same-repository pull requests from a non-main branch into main are eligible.");
  }

  let previous = latestState(comments);
  if (previous && previous.prNumber !== pull.number) return escalation("Stored remediation state belongs to another pull request.");
  if (event.name === "synchronize") {
    if (previous?.phase === "awaiting_review_after_push" || previous?.phase === "review_requested") {
      if (pull.headSha === previous.boundHead) {
        return { action: "WAIT", reason: "This synchronize event has already been recorded for the current head." };
      }
      return escalation("The PR head changed while awaiting review of the bound remediation head.", previous);
    }
    if (!previous || previous.phase !== "remediation_requested") return { action: "WAIT", reason: "No remediation push is pending." };
    if (pull.headSha === previous.boundHead) {
      return { action: "WAIT", reason: "This synchronize transition was already reconciled by a review for the current head." };
    }
    if (event.before !== previous.boundHead) {
      return escalation("The PR head changed outside the expected bound-head transition.", previous);
    }
    return {
      action: "AWAIT_REVIEW",
      state: stateFor({
        pull,
        round: previous.round,
        phase: "awaiting_review_after_push",
        originalPaths: previous.originalPaths,
        findingIds: previous.findingIds,
      }),
    };
  }

  if (event.name !== "review") return { action: "WAIT", reason: "Unsupported event." };
  if (event.reviewHeadSha !== pull.headSha) return escalation("The review is not bound to the current PR head.", previous);

  if (previous?.phase === "remediation_requested" && previous.boundHead !== pull.headSha && event.before === previous.boundHead) {
    previous = stateFor({
      pull,
      round: previous.round,
      phase: "awaiting_review_after_push",
      originalPaths: previous.originalPaths,
      findingIds: previous.findingIds,
    });
  }

  if (previous && previous.phase !== "clean" && previous.boundHead !== pull.headSha) {
    return escalation("Stored remediation state is not bound to the reviewed PR head.", previous);
  }

  const blocking = findings.filter((finding) => finding.priority === "P1" || finding.priority === "P2");

  if (previous?.boundHead === pull.headSha && previous.phase === "escalated") {
    return { action: "WAIT", reason: "This head is already escalated." };
  }
  if (previous?.boundHead === pull.headSha && previous.phase === "clean") {
    if (blocking.length === 0) return { action: "WAIT", reason: "This head is already clean." };
  } else if (previous?.phase === "clean" && previous.boundHead !== pull.headSha) {
    previous = null;
  }

  if (previous?.phase === "remediation_requested" && previous.boundHead === pull.headSha) {
    return { action: "WAIT", reason: "Remediation is already requested for this head." };
  }

  if (blocking.length === 0) {
    return {
      action: "CLEAN",
      state: stateFor({
        pull,
        round: previous?.round ?? 1,
        phase: "clean",
        originalPaths: previous?.originalPaths ?? pull.changedPaths,
        findingIds: previous?.findingIds ?? [],
      }),
    };
  }

  const originalPaths = previous?.originalPaths ?? pull.changedPaths;
  const allowedPaths = new Set(originalPaths);
  const unrelated = blocking.filter((finding) => finding.path && !allowedPaths.has(finding.path) && !TEST_OR_HELPER_PATH.test(finding.path));
  if (unrelated.length > 0) return escalation("A new P1/P2 finding is outside the original PR file scope.", previous);

  const cleanCompletesRemediation = previous?.phase === "clean"
    && previous.boundHead === pull.headSha
    && previous.findingIds.length > 0;
  const reviewedAfterPush = previous?.phase === "awaiting_review_after_push"
    || previous?.phase === "review_requested"
    || cleanCompletesRemediation;
  const round = reviewedAfterPush ? previous.round + 1 : 1;
  if (round > MAX_ROUNDS) return escalation("P1/P2 findings remain after two remediation rounds.", previous);

  return {
    action: "REQUEST_REMEDIATION",
    state: stateFor({
      pull,
      round,
      phase: "remediation_requested",
      originalPaths,
      findingIds: blocking.map((finding) => finding.id),
    }),
    findings: blocking,
  };
}
