# Atlas PR Autopilot

## Zielarchitektur

Der Atlas PR Autopilot soll Pull Requests schrittweise von einer nachvollziehbaren Bewertung bis zu einer streng begrenzten Automatisierung begleiten. Policy, Datensammlung und Bewertung bleiben getrennt: `.github/atlas-autopilot.yml` enthält die freigegebene Policy, der GitHub-Workflow sammelt ausschließlich GitHub-Metadaten und `scripts/atlas-pr-supervisor.mjs` wertet einen JSON-Snapshot deterministisch aus.

Der Supervisor liefert immer einen strukturierten Zustand (`POLICY_READY`, `WAITING` oder `BLOCKED`), begründende Meldungen und das Feld `supervisorPolicySatisfied`. `POLICY_READY` bedeutet ausschließlich, dass die deterministische Atlas-Supervisor-Policy erfüllt ist. Der Zustand ist keine formale Mergefreigabe und trifft keine Aussage darüber, ob GitHub-Reviews, Required Checks oder Branch Protection erfüllt sind. Der PR-Kommentar ist die für Menschen lesbare Zusammenfassung; GitHub-Regeln und menschliche Freigabe bleiben maßgeblich.

## Automatisierungsgrenze nach dem kontrollierten Pilot

Sprint 2G friert den erfolgreichen Pilot als deaktivierte Betriebsbaseline ein. Eine spätere Ausbaustufe darf höchstens die automatische, rein lesende Erzeugung eines Repair-Plans für eng begrenzte PRs prüfen. Eine solche Planung muss weiterhin an einen konkreten Head-SHA gebunden sein und darf weder Code ausführen noch schreiben.

Repair Execution bleibt manuell ausgelöst, über das separate Environment bewusst freigegeben und auf einen zuvor geprüften Plan beschränkt. Automatische Execution, Retry-Schleifen und Auto-Merge bleiben außerhalb der freigegebenen Architektur. Ein erfolgreicher Repair-Push ist nur ein neuer PR-Head und keine Mergefreigabe; CI, gegebenenfalls erneute Approval und ein separater menschlicher Merge-Entschluss bleiben erforderlich.

## Sprint-2-Abschluss: finales Betriebsmodell

- **Supervisor:** Darf durch die eingecheckten PR-, Review- und CI-Ereignisse automatisch sowie manuell starten. Er beobachtet und klassifiziert den PR-Zustand. Er schreibt ausschließlich seinen eigenen PR-Statuskommentar und das begrenzte Beobachtungsartefakt; er verändert keinen Code, erstellt keinen Commit und pusht oder mergt nicht.
- **Repair Plan:** Der manuelle `workflow_dispatch` bleibt unterstützt. Zusätzlich darf ausschließlich ein vertrauenswürdiger, erfolgreich abgeschlossener regulärer Supervisor-Lauf unter allen Sprint-2H-Fail-closed-Gates automatisch eine Planung anstoßen. Jede automatische Planung ist `NON_EXECUTING_READ_ONLY`, reserviert keinen Attempt, verwendet keine Secrets, schreibt keinen Branch und startet Repair Execute nicht. Ein Plan ist weder Ausführungs- noch Merge-Autorisierung.
- **Repair Execute:** Besitzt ausschließlich `workflow_dispatch`. Er verlangt die exakte Bindung von PR-Nummer, unverändertem Head-SHA und einem erfolgreichen, manuell ausgelösten validierten Plan. Das Environment `atlas-repair-pilot` und dessen Approval gelten weiterhin, soweit administrativ konfiguriert. Es gibt keinen automatischen Retry, keine Branch- oder PR-Erstellung und keinen Merge. Der bestehende Attempt-Tag-Vertrag erlaubt höchstens einen Repair-Versuch pro geeignetem PR-Head-SHA.
- **Eingecheckte Baseline:** `repair.enabled`, `repair.pilot_enabled` und `repair.auto_merge` sind `false`. Die aktiven Pilot-Allowlists für PR, Actor, Triggering Actor und Autor sind leer. Keine temporäre Pilot-Aktivierung bleibt eingecheckt. Der Unit-Test `repository policy satisfies the Sprint 2 closeout baseline` erzwingt diesen Zustand.

## Sprint-3-Handoff

Mit dem Abschluss von Sprint 2 gelten Supervisor, Repair Plan und Repair Execute als Baseline-Infrastruktur. Weitere Repair-Automatisierung gehört nicht zur unmittelbaren Roadmap; Sprint 3 kehrt zur Atlas-Produkt- und Anwendungsentwicklung zurück. Jede künftige Erweiterung von Schreibautomatisierung benötigt einen neuen, ausdrücklich beauftragten Safety Review und einen separaten Aktivierungssprint. Die in Sprint 2 abgeschlossenen Grenzen dürfen nicht implizit durch Produktarbeit erweitert werden.

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

## Sprint 2E: Vorbereitung eines kontrollierten Repair-Piloten

Sprint 2E ergänzt ausschließlich die deaktivierte technische Vorbereitung eines eng begrenzten Piloten. Neben `repair.enabled` muss `repair.pilot_enabled` ausdrücklich aktiviert werden. Eine spätere Ausführung erfordert außerdem eine exakte Allowlist mit genau einer PR-Nummer sowie getrennte exakte Allowlists für Actor, Triggering Actor und Author, ein Pilot-Label, einen erlaubten Head-Branch-Präfix und das GitHub Environment `atlas-repair-pilot`. Wildcards und implizite Freigaben sind nicht zulässig. Im Sprint-2E-Implementierungs-PR bleiben `repair.enabled`, `repair.pilot_enabled` und `repair.auto_merge` auf `false`.

Sprint 2F aktiviert den kontrollierten Pilot nach Abschluss der administrativen Vorbereitung ausschließlich für den Fixture-PR #43 auf `pilot/atlas-repair-fixture`. Die PR-Allowlist enthält genau `43`; Actor, Triggering Actor und Autor sind jeweils ausschließlich `jandddddd`. `repair.enabled` und `repair.pilot_enabled` sind dafür `true`, während `repair.auto_merge` unverändert `false` bleibt. Der Aktivierungs-PR #42 ist nicht freigegeben. Repair Execution bleibt ein separater, späterer manueller `workflow_dispatch` nach Merge und Prüfung des Aktivierungs-PRs sowie nach einem erfolgreichen, an den unveränderten Pilot-Head-SHA gebundenen Repair-Plan.

Planning und Execution verwenden denselben deterministischen Pilot-Gate-Contract. Ein Plan bleibt als Auditnachweis erzeugbar, wenn der Pilot deaktiviert oder der PR nicht freigegeben ist; `safeToStart` wird aber nur bei vollständig erfüllter Repair- und Pilot-Policy `true`. Execution prüft die Gates erneut beim initialen PR-Laden und unmittelbar vor der Attempt-Reservierung. Der Remote-Head wird zusätzlich vor Commit und Push erneut validiert.

Das Environment ist eine zusätzliche administrative Freigabe und wird nicht durch Repositorycode eingerichtet. Der Execute-Workflow bleibt rein manuell, führt genau einen Versuch pro PR-Head-SHA aus und pusht ausschließlich normal auf den erneut validierten bestehenden PR-Branch. Codex erhält keine GitHub-Credentials. Es existiert weiterhin kein Mergepfad.

### Environment-Secret einrichten

Vor einer späteren Aktivierung muss eine Repository-Administration im Environment `atlas-repair-pilot` ein Secret namens `OPENAI_API_KEY` anlegen. Es soll ein dedizierter, eng begrenzter Schlüssel sein. Der Wert gehört niemals in Policy, Workflow-Datei, Prompt, Report, Log, Screenshot oder PR-Code. Ein fehlendes Secret beendet den Ausführungsworkflow ohne Codex-Aufruf und ohne Push.

## Geplante Stufen

1. **Bewertung:** deterministische Policy-Prüfung und zusammengefasster PR-Kommentar (Sprint 1).
2. **Reparatur:** manueller Diagnoseplan in Sprint 2A, Audit-Artefakte in Sprint 2B und manuelle, einmalige Ausführung in Sprint 2C (weiterhin per Kill-Switch deaktiviert).
3. **Auto-Merge risikoarmer PRs:** nur nach zusätzlicher Risikoklassifizierung, Schutzregeln und ausdrücklicher Aktivierung.
4. **Nächste Aufgabe starten:** nach erfolgreichem Abschluss die nächste freigegebene Aufgabe aus einer Sprint-Queue anstoßen.

Jede Stufe benötigt eine eigene Sicherheitsprüfung und Aktivierung. Eine spätere Stufe darf nicht implizit durch die Konfiguration einer früheren aktiviert werden.

## Sicherheitsgrenzen

### Sprint 2H: automatische, rein lesende Repair-Planung

`Atlas PR Repair Plan` behält seinen bisherigen manuellen `workflow_dispatch` einschließlich `REPAIR`-Bestätigung unverändert bei und besitzt zusätzlich genau einen automatischen Einstieg: `workflow_run` nach einem technisch erfolgreich abgeschlossenen `Atlas PR Supervisor`. Manuell gestartete Supervisor-Läufe, Läufe ohne zugeordneten PR und fehlgeschlagene Supervisor-Läufe starten keine automatische Planung. Der Supervisor veröffentlicht dafür eine sieben Tage aufbewahrte, begrenzte Beobachtung mit Repository, PR-Nummer, beobachtetem Head-SHA, Status und Gründen, stabilem State-Fingerprint, Run-ID/-Attempt sowie vertrauenswürdigem Workflow-SHA. Sie enthält weder Logs noch Prompts oder Secrets.

Der automatische Plan-Workflow lädt zuerst die Supervisor-Beobachtung und checkt danach exakt deren vertrauenswürdigen Code-SHA mit `persist-credentials: false` aus. Der tatsächliche `HEAD` wird vor jedem Import von Policy- oder Planungscode mit diesem SHA verglichen; ein fehlender oder abweichender Commit beendet den Lauf fail-closed. Damit kann ein zwischenzeitlich fortgeschrittenes `main` den ausgewerteten Code nicht verändern. Der manuelle Pfad behält seinen Checkout des zum Dispatch-Zeitpunkt aktuellen `main`; in beiden Pfaden enthält `trustedWorkflowSha` den tatsächlich ausgeführten Checkout-SHA.

PR-, Datei-, Check- und Review-Fakten werden über die GitHub API geladen. Supervisor und Plan verwenden dieselbe geteilte Check-Sammlung: PR-Head-SHA, `merge_commit_sha` und, sofern vorhanden, `refs/pull/<number>/merge`, gefolgt von derselben deterministischen Check-Run-Deduplizierung und Namensnormalisierung. Der automatische Plan schließt den auslösenden Supervisor-Lauf wie dessen Ursprungsbewertung aus. Begrenzte Annotationen und Diagnoseausschnitte bleiben unverändert. Anschließend wird die Supervisor-Entscheidung aus dem exakt gebundenen vertrauenswürdigen Code erneut berechnet und muss denselben Status/Fingerprint liefern. Der aktuelle PR-Head muss dem vom Supervisor beobachteten vollständigen SHA entsprechen. Ein Head-Wechsel unterdrückt die automatische Planung; ein bereits erzeugter Plan für einen alten SHA ist nur noch informativ und niemals eine Ausführungsfreigabe.

Automatische Planung ist fail-closed. Zulässig sind nur offene, nicht als Draft markierte Same-Repository-PRs ohne Fork gegen exakt `main`, deren Supervisor-Status `BLOCKED` ist und deren Blockgrund von der bestehenden Repair-Policy erlaubt wird. Beide exakten Labels `atlas-autopilot` und `atlas-repair` müssen vorhanden sein; Never-run-Labels, offene P1/P2-Findings, verbotene Pfade, Datei-/Zeilenlimitverletzungen, ein abweichender Head-SHA oder unbekannte Blockgründe unterdrücken den Plan. Wildcards und fremde Repositories/Branches autorisieren nichts. Die Ausführungs-/Pilot-Allowlists sind ausdrücklich keine Voraussetzung für das Erstellen eines lesenden Plans und bleiben leer und deaktiviert.

Die automatische Route besitzt nur `contents: read`, `pull-requests: read`, `checks: read` und `actions: read`. Sie hat keine Secrets, führt keinen PR-Code aus und verwendet weder OpenAI noch Codex. PR+Head-Concurrency verhindert parallele Planläufe. Zusätzlich bildet ein deterministischer SHA-256-Fingerprint aus Supervisor-Status und sortierten Gründen zusammen mit PR und Head den automatischen Artefaktnamen; existiert dieses nicht abgelaufene Artefakt bereits, wird das Duplikat unterdrückt. Es gibt keine Retry-Schleife.

JSON und Markdown verwenden denselben deterministischen Planvertrag wie der manuelle Pfad und ergänzen `triggerSource`, Repository, exakten Head-SHA, Supervisor-Run/-Attempt/-Head, vertrauenswürdigen Workflow-SHA, State-Fingerprint, `planningMode: NON_EXECUTING_READ_ONLY`, `attemptReserved: false` und `repairExecuted: false`. Ein erzeugter Plan ist weder Autorisierung noch Freigabe für Repair oder Merge. Repair Execution bleibt ein separater, ausdrücklich bestätigter manueller `workflow_dispatch`; die automatische Route reserviert keinen Attempt, startet keinen Execute-Workflow und besitzt keinen Branch-, PR-, Merge- oder Administrations-Schreibpfad.

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
