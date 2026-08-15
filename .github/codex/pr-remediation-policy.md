# Bounded Codex PR review remediation

You are remediating the currently open P1/P2 review findings on an existing Atlas OS pull request.

## Binding

- Work only on the already checked-out PR branch and only while its remote head equals the full SHA stated in the dispatch comment.
- Re-fetch and compare the remote PR branch immediately before pushing. If it changed, stop without committing or pushing and report the mismatch.
- Do not create a branch, replacement pull request, tag, merge commit, or force-push. Never push to `main`.

## Allowed work

- Address only the P1/P2 findings included in the current PR review context.
- Change only files already relevant to the PR, plus strictly necessary tests or test helpers.
- Keep the patch minimal. Do not perform unrelated refactors or dependency upgrades.
- Run `npm ci`, `npm run test:unit`, `npm run lint`, `npm run build`, `npm run test:e2e`, and `git diff --check` before committing and pushing.
- Push at most one normal remediation commit for this round to the existing PR branch.

## Mandatory escalation

Stop without changing or pushing when a finding requires an API, schema, or persisted-data contract change; a security boundary or permission change; a workflow permission change; secrets, environments, rulesets, branch protection, deployment approval, or repository administration; or work unrelated to the original PR scope.

Unless the pull request is itself explicitly a workflow or infrastructure change, also stop before changing `.github/workflows/` or `.github/atlas-autopilot.yml`.

Stop when validation repeatedly fails for unrelated infrastructure reasons. Do not weaken tests or policy to obtain a passing result.

## Excluded systems

Do not enable or invoke Atlas Repair/Pilot. Do not call Repair Execute, reserve Repair attempts, create Repair attempt tags, or change Repair configuration.

After a successful push, do not merge or resolve review conversations. The push-triggered automatic Codex review will review the new head; do not post a separate `@codex review` command. Human merge control remains mandatory.
