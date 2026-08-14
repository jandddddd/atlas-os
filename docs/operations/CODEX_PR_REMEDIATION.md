# Bounded Codex PR review remediation

## Operator experience

The normal path is intentionally short: create or mark a pull request ready, wait for Codex review and CI, then merge manually when the review is clean. No automation in this workflow can merge.

When Codex submits an open P1/P2 finding against the exact current head, `Bounded Codex PR Remediation` posts a PR-context `@codex` request. Codex receives the existing review threads directly, so an operator does not have to copy findings between tools. The request points to the reusable policy in `.github/codex/pr-remediation-policy.md` and binds the task to the full head SHA.

The coordinator joins the exact submitted review's comment IDs to authoritative, fully paginated GraphQL `reviewThreads` data. Only threads whose current `isResolved` value is `false` become findings or enter stored state. If all P1/P2 threads have been resolved before evaluation, the coordinator performs no remediation action.

Codex author identity passes through one canonical, case-insensitive GitHub-login comparison that treats the platform's optional `[bot]` suffix consistently. The webhook reviewer, REST review comments, and GraphQL thread comments must all match that canonical identity before a finding can be dispatched.

After Codex validates and pushes one normal commit to the same branch, the PR `synchronize` event must identify the previously bound SHA as its immediate `before` value. Only then does the coordinator post `@codex review` for the new full head SHA. A new review may start one more remediation round. If P1/P2 findings remain after round two, automation stops and posts a human-escalation comment.

The workflow stores its small state record in a hidden, bot-owned PR-comment marker. It records the PR number, phase, full bound head, round number, original changed paths, and finding thread IDs. It creates no branch, tag, replacement PR, environment, secret, ruleset, or repository setting.

## Deterministic stops

The coordinator fails closed for a stale review SHA, an unexpected head transition, a fork, a non-`main` base, a `main` head, a third remediation round, or a new finding outside the original changed paths (except a clearly named test/test-helper path). The Codex task policy additionally requires immediate human escalation for API/schema/persistence contract changes, security or permission boundaries, workflow permissions, secrets, environments, rulesets, branch protection, deployment approval, repository administration, unrelated scope, or repeated unrelated infrastructure failures.

Workflow files and `.github/atlas-autopilot.yml` are excluded from ordinary product remediation. They may be touched only when the PR itself is explicitly a workflow/infrastructure PR, and permission/security changes still require human escalation.

## Security and ownership boundaries

The coordinator checks out trusted base-branch code under `pull_request_target`; it never checks out or executes PR code. Its token has `contents: read` plus only the issue/PR comment permissions needed to dispatch Codex commands. It has no content-write, merge, administration, deployment, environment, or secret permission.

During the workflow's own rollout PR, the trusted base may not contain the coordinator module yet. That bootstrap case exits successfully without dispatching anything; the workflow never falls back to importing the untrusted PR copy. Once merged, every run imports the module from the checked-out trusted base revision.

Codex remediation is governed by the repository instructions and performs validation in its isolated PR task. Immediately before pushing, it must re-fetch the remote PR branch and confirm the head still matches its bound input SHA. A mismatch stops without push. Each pushed head receives a fresh review request; old findings cannot authorize work on a new head.

Atlas Repair remains separate baseline infrastructure. This workflow does not reference Repair Plan or Repair Execute, does not reserve an attempt, does not create an attempt tag, and does not alter `.github/atlas-autopilot.yml`. `repair.enabled`, `repair.pilot_enabled`, and `repair.auto_merge` remain disabled.

## Human escalation

An escalation comment explains the deterministic stop. The operator reviews the finding and decides how to proceed; automation does not resolve conversations or restart itself. A clean review simply returns control to the human merge decision.
