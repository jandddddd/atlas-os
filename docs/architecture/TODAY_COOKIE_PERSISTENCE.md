# Today Cookie Persistence (temporary)

The Today approval queue currently has no database. Until a durable repository is available, Atlas stores a small, browser-scoped state cookie named `atlas-today-decisions`.

The versioned cookie payload contains only the decision ID and its last action:

```json
{"version":1,"decisions":[{"decisionId":"offer-mueller","action":"approve"}]}
```

Fixture decisions remain the authoritative source for all decision text and details. On every Today request, the server validates the cookie, ignores malformed, unknown, or unsupported entries, and applies valid actions to the fixture queue. Duplicate IDs are normalized defensively: the first valid action is retained and later duplicate entries are ignored. `approve` removes an item; `later` moves it behind the remaining items. The payload retains at most 20 entries, so it is intentionally not an event history.

The cookie is `httpOnly`, `sameSite=lax`, scoped to `/today`, and marked `secure` in production. It is not encrypted because it contains no secret data. Cookie manipulation must therefore never be treated as proof of authorization or an audit trail.

The server action validates that a submitted decision is the current queue item before writing the cookie. Invalid or stale submissions return controlled errors and leave persistence unchanged. The client continues to update its local view after a successful action, while a reload rebuilds the same queue on the server from fixtures plus the cookie.

This is a transition only, not production-grade persistence: browser cookies have limited size, are user-controlled, are not shared between devices, and have no durable audit or concurrency guarantees. A database-backed `TodayDecisionRepository` can replace the cookie module later while keeping the typed action state and queue-application helper; it should store validated decision outcomes per authenticated user or workspace and return the same state to the application layer.
