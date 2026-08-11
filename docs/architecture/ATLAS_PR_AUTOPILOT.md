# Atlas PR Autopilot

## Zielarchitektur

Der Atlas PR Autopilot soll Pull Requests schrittweise von einer nachvollziehbaren Bewertung bis zu einer streng begrenzten Automatisierung begleiten. Policy, Datensammlung und Bewertung bleiben getrennt: `.github/atlas-autopilot.yml` enthält die freigegebene Policy, der GitHub-Workflow sammelt ausschließlich GitHub-Metadaten und `scripts/atlas-pr-supervisor.mjs` wertet einen JSON-Snapshot deterministisch aus.

Der Supervisor liefert immer einen strukturierten Zustand (`POLICY_READY`, `WAITING` oder `BLOCKED`), begründende Meldungen und das Feld `supervisorPolicySatisfied`. `POLICY_READY` bedeutet ausschließlich, dass die deterministische Atlas-Supervisor-Policy erfüllt ist. Der Zustand ist keine formale Mergefreigabe und trifft keine Aussage darüber, ob GitHub-Reviews, Required Checks oder Branch Protection erfüllt sind. Der PR-Kommentar ist die für Menschen lesbare Zusammenfassung; GitHub-Regeln und menschliche Freigabe bleiben maßgeblich.

## Sprint 1: Dry-Run

Sprint 1 implementiert nur die Bewertungsstufe. Der Supervisor prüft PR-Status, Base-Branch, Labels, Check Runs, Merge-Konflikte, offene priorisierte Review-Threads, Größenlimits und verbotene Pfade. Laufende oder noch nicht vorhandene Pflicht-Checks führen zu `WAITING`; Fehler und Policy-Verstöße führen zu `BLOCKED`. Nur ein nach der Supervisor-Policy vollständig grüner PR wird als `POLICY_READY` gemeldet.

Der Modus ist ausdrücklich `dry-run`. `auto_merge: false` ist Teil der Policy. Weder Skript noch Workflow besitzen eine Merge-, Push- oder Code-Reparaturfunktion. Ein Ergebnis ist eine Entscheidungshilfe, keine automatische Freigabe.

## Sprint 2A: Diagnose und Reparaturplan

Sprint 2A ergänzt einen ausschließlich manuell ausgelösten Planungs- und Freigabepfad. Der Workflow `atlas-pr-repair.yml` nimmt PR-Nummer, den erwarteten vollständigen Head-SHA und die exakte Bestätigung `REPAIR` entgegen. Er checkt ausschließlich vertrauenswürdigen Code von `main` aus, lädt den aktuellen PR-Zustand über die GitHub API und bricht ab, sobald der erwartete SHA nicht mehr dem aktuellen PR-Head entspricht. PR-Head-Code wird weder ausgecheckt noch ausgeführt.

Der Workflow sammelt Supervisor-Fakten, geänderte Pfade, fehlgeschlagene Checks mit begrenzten Diagnoseauszügen sowie offene P1/P2-Review-Threads. `scripts/atlas-pr-repair-plan.mjs` bewertet diesen Snapshot deterministisch und erzeugt einen der Zustände `REPAIR_ELIGIBLE`, `REPAIR_BLOCKED` oder `NO_REPAIR_NEEDED`. Der Prompt enthält nur bereinigte und längenbegrenzte Diagnosen, Review-Findings, die bereits im PR geänderten und damit für die Reparatur vorgesehenen Dateien, Validierungsbefehle und feste Sicherheitsgrenzen. Bekannte Token-, Schlüssel- und Secret-Muster werden entfernt; vollständige unbereinigte Logs werden nicht übernommen.

`repair.enabled` bleibt in Sprint 2A bewusst `false`. Dadurch kann ein Kandidat als `REPAIR_ELIGIBLE` diagnostiziert werden, `safeToStart` bleibt aber `false`: Der Kill-Switch verhindert weiterhin jeden Reparaturlauf. Er benötigt keinen `OPENAI_API_KEY`, besitzt nur lesende Repository-Berechtigungen, schreibt nicht auf den PR-Branch und startet keinen Codex-Aufruf.

Jeder Plan enthält den `attemptKey` `<pr-number>:<head-sha>`. Für einen Head-SHA ist höchstens ein späterer Reparaturlauf zulässig. Ein weiterer manueller Versuch setzt einen neuen Commit und damit einen neuen SHA voraus. Es gibt weder automatische Retries noch eine Reparaturschleife innerhalb eines Workflow-Laufs.

## Sprint 2B: Veröffentlichung von Audit-Artefakten

Sprint 2B veröffentlicht den deterministisch erzeugten Repair-Plan ausschließlich als Audit- und Diagnose-Artefakt sowie im Job Summary. Das sieben Tage aufbewahrte GitHub-Actions-Artefakt enthält nur `repair-plan.json` und `repair-plan.md`. Die JSON-Datei enthält die vollständige strukturierte Planausgabe; die Markdown-Datei fasst PR, gebundenen Head-SHA, Status, Gründe, erlaubte und verbotene Bereiche, bereinigte Check-Diagnosen, offene P1/P2-Findings, Prompt und `attemptKey` zusammen. Auch `REPAIR_BLOCKED` und `NO_REPAIR_NEEDED` dürfen so nachvollziehbar dokumentiert werden.

Vor der Datensammlung und unmittelbar vor Plan- und Artefakterzeugung wird der aktuelle PR-Head erneut gegen den manuell angegebenen vollständigen SHA geprüft. Ein veralteter SHA beendet den Workflow ohne Artefakt. Der Artefaktname enthält PR-Nummer und einen kurzen Head-SHA; der Plan bleibt über den `attemptKey` `<pr-number>:<full-head-sha>` eindeutig an den vollständigen Commit gebunden.

Sprint 2B führt keinen Repair aus und verändert keinen Code. `repair.enabled` bleibt `false`; es gibt keinen Codex- oder OpenAI-Aufruf und kein `OPENAI_API_KEY` ist erforderlich. Der Workflow hat ausschließlich `contents: read`, `pull-requests: read`, `checks: read` und `actions: read`. Er erstellt weder Commits, Branches oder PR-Kommentare noch schreibt er auf den PR-Branch oder führt Merge-Aktionen aus.

## Sprint 2C: Manuelle, einmalige Reparatur

Sprint 2C ergänzt den separaten Workflow `atlas-pr-repair-execute.yml`. Er wird ausschließlich über `workflow_dispatch` mit PR-Nummer, vollständigem erwartetem Head-SHA, der Run-ID eines Sprint-2B-Plans und der exakten Bestätigung `EXECUTE_REPAIR` gestartet. Pro manueller Auslösung gibt es genau einen Codex-Aufruf, keine Retry-Schleife, keinen Folgelauf, keinen neuen PR und keinen Merge. `repair.enabled` bleibt nach der Implementierung zunächst `false`; der Workflow beendet sich deshalb vor jeder Schreibaktion. Die Aktivierung erfordert später eine eigene, ausdrücklich geprüfte Policy-Änderung auf `main`.

Der Workflow checkt zuerst ausschließlich vertrauenswürdiges `main` aus und lädt die dortige Policy und die dortigen Validierungsmodule. Er akzeptiert nur offene, nicht geforkte PRs aus demselben Repository auf einer erlaubten Base-Branch, mit `atlas-repair` und ohne Never-run-Label. Der aktuelle PR-Head muss dem vollständigen `expected_head_sha` entsprechen. Die angegebene Plan-Run-ID muss zu einem erfolgreichen, manuell ausgelösten Lauf von `atlas-pr-repair.yml` auf `main` gehören. Das heruntergeladene Artefakt darf nur `repair-plan.json` und `repair-plan.md` enthalten; Status, `safeToStart`, PR, SHA und `attemptKey` werden vor dem Checkout des PR-Heads validiert.

Der `attemptKey` hat weiterhin die Form `<pr-number>:<full-head-sha>`. Der Workflow lädt und validiert zuerst das gebundene Plan-Artefakt, checkt den exakten PR-Head aus, prüft die Verfügbarkeit des API-Keys und validiert PR-Branch und Head-SHA erneut. Erst unmittelbar vor dem ersten Codex-Aufruf prüft er die Tag-Existenz ein weiteres Mal und reserviert den Versuch als dauerhaftes Git-Tag `atlas-repair-attempt/<pr-number>-<full-head-sha>`. Ein ungültiges oder fehlendes Plan-Artefakt und ein fehlender API-Key verbrauchen damit keinen Versuch. Sobald das Tag angelegt wurde, gilt der Versuch auch bei einem späteren Codex- oder Validierungsfehler als verbraucht. Eine SHA-spezifische Concurrency-Gruppe mit `cancel-in-progress: false` verhindert parallele Reservierungen. Ein neuer Versuch setzt einen neuen PR-Head-SHA und einen daran gebundenen Plan voraus.

Die Reparatur verwendet die offizielle `openai/codex-action@v1` und eine fest gesetzte Codex-CLI-Version. Der Prompt stammt ausschließlich aus dem validierten JSON-Plan und wird nur als temporäre Datei innerhalb der Git-Metadaten bereitgestellt. Codex läuft mit `workspace-write`, ohne direkte GitHub-Credentials und ohne Netzwerkzugriff aus dem Sandbox-Workspace. Der API-Key ist ausschließlich am Vorprüfungs- und Codex-Schritt verfügbar; PR-Code, Tests, Lint und Build erhalten ihn nicht. Der Prompt übernimmt keine unbereinigten vollständigen CI-Logs und Review-Kommentare werden nicht als ungeprüfte Shell-Befehle ausgeführt.

Als erlaubte Reparaturpfade gelten ausschließlich die in `allowedAreas` des Plans gebundenen Dateien. Zusätzlich blockiert die Policy insbesondere Workflows, `.github/atlas-autopilot.yml`, `.env`-Varianten, `migrations/` und `prisma/`. Nach Codex werden getrackte und ungetrackte Änderungen, Binärdateien, maximal zehn Dateien und maximal 500 hinzugefügte oder entfernte Zeilen geprüft. Danach müssen Unit-Tests, Lint, Build und `git diff --check` erfolgreich sein. Unmittelbar vor Commit und normalem Push wird der Remote-Head erneut mit dem erwarteten SHA verglichen. Nur dann entsteht genau ein Commit auf der bestehenden PR-Branch; Force-Push, direkter Push auf `main`, Merge und neuer PR sind ausgeschlossen.

Jeder Lauf, der den vertrauenswürdigen Auditcode von `main` initialisieren konnte, veröffentlicht für sieben Tage `repair-execution-report.json` und `repair-execution-report.md` – auch wenn eine Vorbedingung blockiert oder ein späterer Schritt fehlschlägt. Der Status ist `BLOCKED`, `FAILED` oder `PUSHED`; feste bereinigte Reason Codes und die Felder `attemptReserved`, `codexStarted`, `pushPerformed` und `mergePerformed` machen die erreichte Phase nachvollziehbar. Der Report nennt außerdem PR, SHA, `attemptKey`, Plan-Run-ID, Zeitpunkte, tatsächlich bekannte geänderte Dateien, Prüfergebnisse und gegebenenfalls Commit-SHA. Er enthält keine Prompts, vollständigen Logs, freien Fehlermeldungen oder Secrets. Die mit `if: always()` ausgeführte Berichterstellung ändert den Fehlerstatus des eigentlichen Jobs nicht.

## Sprint 2D: Betriebsreife und Sicherheitsfundament

Sprint 2D integriert `npm run test:unit` in den bestehenden PR-CI-Job `CI / verify`, ohne dessen Checknamen zu ändern. Für `main` soll ausschließlich dieser CI-Job als Required Check dienen. Der Supervisor-Job ist kein geeigneter Required Check, weil ein fachliches Ergebnis `BLOCKED` als technisch erfolgreicher Workflowlauf veröffentlicht wird.

Die konkrete, manuell durch eine Repository-Administration einzurichtende Branch-Protection ist in `docs/operations/GITHUB_BRANCH_PROTECTION.md` beschrieben. Sprint 2D verändert keine Repositoryeinstellungen und aktiviert weder Repair Execution noch Auto-Merge.

### Repository-Secret einrichten

Vor einer späteren Aktivierung muss eine Repository-Administration unter **Settings → Secrets and variables → Actions → New repository secret** ein Secret namens `OPENAI_API_KEY` anlegen. Es soll ein dedizierter, eng begrenzter Schlüssel sein. Der Wert gehört niemals in Policy, Workflow-Datei, Prompt, Report, Log, Screenshot oder PR-Code. Ein fehlendes Secret beendet den Ausführungsworkflow ohne Codex-Aufruf und ohne Push.

## Geplante Stufen

1. **Bewertung:** deterministische Policy-Prüfung und zusammengefasster PR-Kommentar (Sprint 1).
2. **Reparatur:** manueller Diagnoseplan in Sprint 2A, Audit-Artefakte in Sprint 2B und manuelle, einmalige Ausführung in Sprint 2C (weiterhin per Kill-Switch deaktiviert).
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
- Der manuelle Reparaturplan bindet jede Freigabe an den aktuellen Head-SHA und lehnt Forks, verbotene Pfade, Never-run-Labels, fehlende Labels sowie Größenüberschreitungen ab.
- Ausschließlich die Blockgründe `required_check_failed` und `blocking_review_found` können einen Reparaturkandidaten ergeben.
- Es gibt niemals direkte Pushes auf `main`. Auch spätere Reparaturen müssen auf einem separaten PR-Branch erfolgen.
- Branch-Protection, erforderliche Reviews und menschliche Freigaben bleiben außerhalb des Supervisors verbindlich.

## Audit und Secrets für spätere Stufen

Sprint 1, Sprint 2A und Sprint 2B benötigen keine zusätzlichen Repository-Secrets; die Workflows verwenden ausschließlich das kurzlebige `GITHUB_TOKEN` mit minimalen Berechtigungen. Job Summary, die sieben Tage aufbewahrten JSON- und Markdown-Pläne, `attemptKey` und der Workflow Run bilden den Audit-Pfad für eine manuelle Entscheidung. Sprint 2C benötigt nach seiner ausdrücklichen Aktivierung einen dedizierten, eng begrenzten `OPENAI_API_KEY`. Eine spätere Merge- oder Queue-Integration kann außerdem eine GitHub App mit minimalen, explizit dokumentierten Repository-Berechtigungen erfordern.

Solche Secrets dürfen erst bei Implementierung der jeweiligen Stufe eingerichtet werden. Sie dürfen niemals an PR-Code, Forks, Logs oder Client-Code weitergegeben werden. Persönliche Zugriffstokens mit breiten Rechten sind nicht vorgesehen.

## Kill-Switch

`enabled: false` auf oberster Ebene in `.github/atlas-autopilot.yml` ist der Kill-Switch des Supervisors. `repair.enabled: false` ist der unabhängige Kill-Switch für Reparaturen: Ein Diagnoseplan kann erstellt werden, aber `safeToStart` bleibt `false`. Zusätzlich können die jeweiligen Workflows in GitHub Actions deaktiviert werden. Kein Kill-Switch-Zustand führt zu einem Push, Merge oder einer Umgehung bestehender Schutzregeln.
