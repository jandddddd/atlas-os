# Today Cookie Persistence (temporary)

The Today approval queue currently has no database. Until a durable repository is available, Atlas stores a small, browser-scoped state cookie named `atlas-today-decisions`.

The cookie is a transition mechanism, not the source for decision content. It stores no complete decision objects, customer data, prompts, or secrets. Fixtures and the future repository remain authoritative for decision IDs, text, details, and the set of currently known decisions.

## Version 3 payload

The current versioned payload has the following shape:

```ts
{
  version: 3,
  decisions: [
    {
      decisionId: string,
      action: "approve" | "later"
    }
  ],
  manualPriorityDecisionId: string | null
}
```

For example:

```json
{
  "version": 3,
  "decisions": [
    { "decisionId": "offer-mueller", "action": "approve" }
  ],
  "manualPriorityDecisionId": "supplier-selection"
}
```

`decisions` records compact outcome or deferral state only. Currently, only `approve` and `later` are persisted. It is capped at 20 entries and is intentionally not an event history. Duplicate IDs are normalized defensively: the first valid action is retained and later duplicate entries are ignored.

`manualPriorityDecisionId` stores only the one explicit manual override. When the state is applied, Atlas first calculates the current base order through the Decision Engine, then moves this still-open decision to the top. All remaining decisions keep the freshly calculated engine order. Unknown, malformed, or no longer open override IDs are ignored defensively.

Prioritizing a decision updates `manualPriorityDecisionId`. If that decision previously had a `later` status, prioritizing it removes that status in the same state update. Approving the manually prioritized decision clears the override, so dependency and factor changes immediately determine the remaining queue.

## Version migrations

Version 1 cookies remain readable. Their payload had no manual override and stored only `version` plus `decisions`.

When a valid v1 cookie is read, Atlas applies the valid compact actions with no manual override. Version 2 cookies remain readable as well: their first valid `decisionOrder` entry becomes the single manual override, while the rest of the legacy order is discarded. This keeps the intentional user choice without freezing the remaining queue. The next successful cookie write serializes the v3 schema.

Malformed payloads, unsupported versions, unknown decision IDs, unsupported actions, and invalid order entries are ignored defensively. They do not create decisions and do not replace the fixture/repository as the source of truth.

## Server actions and queue updates

The earlier rule that every server action may target only the current queue item is no longer sufficient. `approve` and `later` continue to apply to the current priority decision. `prioritize` may select any known open decision, persists only its ID through `manualPriorityDecisionId`, and then makes it the current priority for subsequent actions.

After every successful action, the server derives the resulting queue from fixtures/repository data plus the validated cookie state. The client renders that returned order; a reload rebuilds the same queue server-side from the same inputs. Controlled errors leave persistence unchanged.

## Cookie properties and limits

The cookie is `httpOnly`, `sameSite=lax`, scoped to `/today`, and marked `secure` in production. It is not encrypted because it contains no secret data. Cookie manipulation must therefore never be treated as proof of authorization or an audit trail.

This is not production-grade persistence: browser cookies have limited size, are user-controlled, are not shared between devices, and have no durable audit or concurrency guarantees. A database-backed `TodayDecisionRepository` can replace the cookie module later while keeping the typed action state and queue-application helper; it should store validated decision outcomes per authenticated user or workspace and return the same state to the application layer.
