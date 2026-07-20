# Atlas PR Autopilot

## Zielarchitektur

Der Atlas PR Autopilot soll Pull Requests schrittweise von einer nachvollziehbaren Bewertung bis zu einer streng begrenzten Automatisierung begleiten. Policy, Datensammlung und Bewertung bleiben getrennt: `.github/atlas-autopilot.yml` enthält die freigegebene Policy, der GitHub-Workflow sammelt ausschließlich GitHub-Metadaten und `scripts/atlas-pr-supervisor.mjs` wertet einen JSON-Snapshot deterministisch aus.

Der Supervisor liefert immer einen strukturierten Zustand (`MERGE_READY`, `WAITING` oder `BLOCKED`), begründende Meldungen und das rein informative Feld `safeToMerge`. Der PR-Kommentar ist die für Menschen lesbare Zusammenfassung. Fachliche Freigabe und GitHub-Branch-Protection bleiben maßgeblich.

## Sprint 1: Dry-Run

Sprint 1 implementiert nur die Bewertungsstufe. Der Supervisor prüft PR-Status, Base-Branch, Labels, Check Runs, Merge-Konflikte, offene priorisierte Review-Threads, Größenlimits und verbotene Pfade. Laufende oder noch nicht vorhandene Pflicht-Checks führen zu `WAITING`; Fehler und Policy-Verstöße führen zu `BLOCKED`. Nur ein vollständig grüner PR wird als `MERGE_READY` gemeldet.

Der Modus ist ausdrücklich `dry-run`. `auto_merge: false` ist Teil der Policy. Weder Skript noch Workflow besitzen eine Merge-, Push- oder Code-Reparaturfunktion. Ein Ergebnis ist eine Entscheidungshilfe, keine automatische Freigabe.

## Geplante Stufen

1. **Bewertung:** deterministische Policy-Prüfung und zusammengefasster PR-Kommentar (Sprint 1).
2. **Automatische Codex-Reparatur:** späterer, separat freizugebender Prozess für klar begrenzte Änderungen auf dem PR-Branch.
3. **Auto-Merge risikoarmer PRs:** nur nach zusätzlicher Risikoklassifizierung, Schutzregeln und ausdrücklicher Aktivierung.
4. **Nächste Aufgabe starten:** nach erfolgreichem Abschluss die nächste freigegebene Aufgabe aus einer Sprint-Queue anstoßen.

Jede Stufe benötigt eine eigene Sicherheitsprüfung und Aktivierung. Eine spätere Stufe darf nicht implizit durch die Konfiguration einer früheren aktiviert werden.

## Sicherheitsgrenzen

- `pull_request_target` checkt ausschließlich den SHA des vertrauenswürdigen Base-Branches aus. PR-Head-Code wird im privilegierten Kontext weder geladen noch ausgeführt.
- Bewertet werden nur PRs, deren Head- und Base-Repository dieses Repository sind. Fork-PRs werden abgewiesen.
- Die Berechtigungen sind auf `contents: read`, `checks: read`, `actions: read` und das für den Statuskommentar notwendige `pull-requests: write` begrenzt.
- Der bestehende CI-Workflow und seine Prüfungen werden nicht verändert oder abgeschwächt.
- Verbotene Pfade, Never-merge-Labels, Konflikte sowie offene P1/P2-Threads blockieren die Freigabe.
- Der Kommentar enthält keine Secrets und das Skript führt keine GitHub-Schreibaktion aus.
- Es gibt niemals direkte Pushes auf `main`. Auch spätere Reparaturen müssen auf einem separaten PR-Branch erfolgen.
- Branch-Protection, erforderliche Reviews und menschliche Freigaben bleiben außerhalb des Supervisors verbindlich.

## Secrets für spätere Stufen

Sprint 1 benötigt keine zusätzlichen Repository-Secrets; der Workflow verwendet ausschließlich das kurzlebige `GITHUB_TOKEN` mit minimalen Berechtigungen. Spätere Codex-Reparaturen können einen dedizierten, eng begrenzten OpenAI-API-Schlüssel benötigen. Eine spätere Merge- oder Queue-Integration kann außerdem eine GitHub App mit minimalen, explizit dokumentierten Repository-Berechtigungen erfordern.

Solche Secrets dürfen erst bei Implementierung der jeweiligen Stufe eingerichtet werden. Sie dürfen niemals an PR-Code, Forks, Logs oder Client-Code weitergegeben werden. Persönliche Zugriffstokens mit breiten Rechten sind nicht vorgesehen.

## Kill-Switch

`enabled: false` in `.github/atlas-autopilot.yml` ist der zentrale Kill-Switch. Der Supervisor meldet dann `BLOCKED` und `safeToMerge: false`. Zusätzlich kann der Workflow in GitHub Actions deaktiviert werden. Der Kill-Switch führt niemals zu einem Merge oder zu einer Umgehung bestehender Schutzregeln.
