# Today Cookie Persistence (temporary)

The Today approval queue currently has no database. Until a durable repository is available, Atlas stores a small, browser-scoped state cookie named `atlas-today-decisions`.

The cookie is a transition mechanism, not the source for decision content. It stores no complete decision objects, customer data, prompts, or secrets. Fixtures and the future repository remain authoritative for decision IDs, text, details, and the set of currently known decisions.

## Version 2 payload

The current versioned payload has the following shape:

```ts
{
  version: 2,
  decisions: [
    {
      decisionId: string,
      action: "approve" | "later"
    }
  ],
  decisionOrder: string[]
}
```

For example:

```json
{
  "version": 2,
  "decisions": [
    { "decisionId": "offer-mueller", "action": "approve" }
  ],
  "decisionOrder": ["visit-weber", "supplier-selection", "customer-reply"]
}
```

`decisions` records compact outcome or deferral state only. Currently, only `approve` and `later` are persisted. It is capped at 20 entries and is intentionally not an event history. Duplicate IDs are normalized defensively: the first valid action is retained and later duplicate entries are ignored.

`decisionOrder` stores the persisted order of known, open decisions. A decision selected as the priority is placed first in this array. When the state is applied, IDs that are unknown, malformed, or no longer present in the fixture/repository are ignored defensively; the authoritative fixture/repository order supplies any remaining known open decisions.

Prioritizing a decision updates `decisionOrder`. If that decision previously had a `later` status, prioritizing it removes that status in the same state update. A decision ID must therefore not be handled as both prioritized and `later` at the same time.

## Version 1 migration

Version 1 cookies remain readable. Their payload had no `decisionOrder` field and stored only `version` plus `decisions`.

When a valid v1 cookie is read, Atlas safely derives the missing order from the authoritative fixture/repository order while applying the valid compact actions. The in-memory state is treated as v2 with an empty explicit order; this preserves the authoritative default ordering rather than trusting cookie-provided decision objects. The next successful cookie write serializes the v2 schema, including `decisionOrder`.

Malformed payloads, unsupported versions, unknown decision IDs, unsupported actions, and invalid order entries are ignored defensively. They do not create decisions and do not replace the fixture/repository as the source of truth.

## Server actions and queue updates

The earlier rule that every server action may target only the current queue item is no longer sufficient. `approve` and `later` continue to apply to the current priority decision. `prioritize` may select any known open decision, persists its queue position through `decisionOrder`, and then makes it the current priority for subsequent actions.

After every successful action, the server derives the resulting queue from fixtures/repository data plus the validated cookie state. The client renders that returned order; a reload rebuilds the same queue server-side from the same inputs. Controlled errors leave persistence unchanged.

## Cookie properties and limits

The cookie is `httpOnly`, `sameSite=lax`, scoped to `/today`, and marked `secure` in production. It is not encrypted because it contains no secret data. Cookie manipulation must therefore never be treated as proof of authorization or an audit trail.

This is not production-grade persistence: browser cookies have limited size, are user-controlled, are not shared between devices, and have no durable audit or concurrency guarantees. A database-backed `TodayDecisionRepository` can replace the cookie module later while keeping the typed action state and queue-application helper; it should store validated decision outcomes per authenticated user or workspace and return the same state to the application layer.
