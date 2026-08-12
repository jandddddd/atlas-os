# Kontrollierter Atlas-Repair-Pilot

## Sprint-2-Closeout: Trigger- und Berechtigungsmatrix

Die Matrix beschreibt die tatsächlich eingecheckten Workflows. „Repository-Inhalt ändern“ meint persistente Änderungen am Git-Repository; der Supervisor darf separat seinen eigenen PR-Kommentar verwalten.

| Workflow | Trigger | Token-Berechtigungen | Repository-Inhalt ändern | Commit | Push | Merge | Secrets / Environment-Approval | Automatischer Start |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atlas PR Supervisor | `pull_request_target`, `pull_request_review`, `pull_request_review_comment`, abgeschlossener `CI`-`workflow_run`, `workflow_dispatch` | `contents: read`, `pull-requests: write`, `checks: read`, `actions: read` | Nein | Nein | Nein | Nein | Keine zusätzlichen Secrets; kein Environment | Ja |
| Atlas PR Repair Plan | abgeschlossener `Atlas PR Supervisor`-`workflow_run`, `workflow_dispatch` | `contents: read`, `pull-requests: read`, `checks: read`, `actions: read` | Nein | Nein | Nein | Nein | Keine zusätzlichen Secrets; kein Environment | Ja, ausschließlich read-only unter den Sprint-2H-Gates |
| Atlas PR Repair Execute | nur `workflow_dispatch` | `contents: write`, `pull-requests: read`, `actions: read`, `checks: read` | Ja: dauerhafter Attempt-Tag/-Ref sowie höchstens ein Repair-Commit mit normalem Push auf den bestehenden validierten PR-Branch | Ja, höchstens ein Repair-Commit je zulässigem Versuch | Ja, normaler Push nur auf den bestehenden PR-Branch | Nein | `OPENAI_API_KEY` aus `atlas-repair-pilot`; Environment-Approval soweit administrativ konfiguriert | Nein |
| CI | `pull_request` | `contents: read` | Nein | Nein | Nein | Nein | Keine zusätzlichen Secrets; kein Environment | Ja |

Die Schreibberechtigung des Supervisors ist auf den Statuskommentar beschränkt. Nur Repair Execute benötigt `contents: write`: zuerst für die dauerhafte Attempt-Reservierung durch den Git-Tag/-Ref `refs/tags/${ATTEMPT_TAG}` und danach für höchstens einen gebundenen Repair-Commit samt normalem Push auf den bereits validierten bestehenden PR-Branch. Dies sind die einzigen persistenten Repository-Mutationen des bestehenden, manuell und über das konfigurierte Environment freigegebenen Ausführungspfads. Repair Execute erstellt weder einen neuen Repair-Branch noch einen PR oder Merge und bleibt ausschließlich `workflow_dispatch`; der automatische read-only Repair-Plan kann ihn nicht dispatchen.

## Operative Erkenntnisse aus dem Live-Pilot

- Ohne das erforderliche Repair-Label wird bereits die Planung fail-closed blockiert; Labels sind echte Eligibility-Gates und keine reine Kennzeichnung.
- Importierbare CLI-Module müssen `process.argv[1] === undefined` tolerieren. Der Import-Guard ist deshalb abgesichert und durch einen Regressionstest gedeckt.
- Environment-Approval autorisiert nur den konkreten Execute-Job. Es ersetzt weder Planprüfung, PR-Review, CI noch Mergefreigabe.
- Ein automatisierter Push erzeugt einen neuen PR-Head. CI muss dafür erneut laufen; Branch Protection kann bestehende Approvals verwerfen und eine neue menschliche Approval verlangen.
- Required Checks können am PR-Head, GitHubs `merge_commit_sha` oder dem PR-Merge-Ref hängen. Supervisor und Plan sammeln und deduplizieren deshalb Checks über alle verfügbaren Referenzen.
- Der in der Supervisor-Beobachtung gebundene vertrauenswürdige Workflow-SHA muss exakt dem tatsächlich ausgecheckten und ausgeführten Code entsprechen; jede Abweichung beendet die automatische Planung vor dem Import.
- Nach dem Pilot wurden Repair, Pilotmodus und alle aktiven Allowlists sofort wieder deaktiviert beziehungsweise geleert. Eine Aktivierung zu Testzwecken gehört nicht in die eingecheckte Baseline.

## Sprint-2H-Betrieb: automatische Read-only-Pläne

Nach einem erfolgreich abgeschlossenen regulären `Atlas PR Supervisor`-Lauf kann `Atlas PR Repair Plan` automatisch einen Diagnoseplan erzeugen. Der automatische Pfad ist ausschließlich Planung: keine Environment-Freigabe, keine Secrets, kein Codex, kein Attempt-Tag, kein Commit, kein Push, kein Execute-Dispatch, kein PR und kein Merge. Seine Token-Rechte sind `contents: read`, `pull-requests: read`, `checks: read` und `actions: read`.

Vor der Erzeugung müssen Operatoren keine Freigabe erteilen. Der Workflow prüft jedoch fail-closed: regulärer Supervisor-Quelllauf mit PR-Zuordnung, identisches Repository, offen, kein Draft, kein Fork, Base exakt `main`, aktueller Head exakt gleich dem vom Supervisor beobachteten SHA, Supervisor `BLOCKED` mit erlaubtem Repair-Grund, Labels `atlas-autopilot` und `atlas-repair`, keine Never-run-Labels, keine offenen P1/P2-Findings, keine verbotenen Pfade und eingehaltene Datei-/Zeilenlimits. Ein nicht erfülltes Gate erzeugt kein Planartefakt.

Vor der Reevaluation checkt der automatische Pfad exakt den in der Supervisor-Beobachtung gespeicherten trusted SHA aus und verifiziert den tatsächlichen Git-`HEAD`; ein inzwischen fortgeschrittenes `main`, ein nicht verfügbarer SHA oder jede Abweichung führt nicht zur Ausführung von Policy-/Planungscode. Supervisor und Plan sammeln Checks identisch von Head-SHA, `merge_commit_sha` und dem verfügbaren PR-Merge-Ref und deduplizieren sie über dieselbe gemeinsame Funktion. Dadurch bleibt insbesondere `CI / verify` am Merge-SHA in beiden Bewertungen sichtbar.

Für denselben PR-Head laufen Planungen nicht parallel. Ein automatischer Artefaktname aus PR, Head und stabilem Supervisor-State-Fingerprint unterdrückt einen bereits vollständig erzeugten Plan desselben Zustands; Wiederholungsschleifen gibt es nicht. Nach einem Head-Wechsel ist jeder alte Plan stale und nur informativ. Der manuelle Repair-Plan-Dispatch mit `REPAIR` bleibt weiterhin verfügbar.

Jeder automatische Plan muss `NON_EXECUTING_READ_ONLY`, `triggerSource: automatic`, Repository, PR, exakten Head, Supervisor-Quelle, vertrauenswürdigen Workflow-SHA sowie `attemptReserved: false` und `repairExecuted: false` ausweisen. Das Artefakt ist keine Autorisierung für Reparatur oder Merge. Execution bleibt separat, manuell und aufgrund der eingecheckten deaktivierten Repair-/Pilot-Policy blockiert.

## Post-Pilot-Betriebsbaseline

Der kontrollierte Pilot war erfolgreich, weil genau ein manuell geplanter und separat über das Environment `atlas-repair-pilot` freigegebener Execute-Lauf den bekannten Fixture-Fehler auf dem bestehenden PR-Branch mit genau einem Repair-Commit behob. Der Lauf reservierte den Versuch dauerhaft für den ursprünglichen Head-SHA, erzeugte keinen Retry, keinen neuen Branch und keinen neuen PR und führte keinen Merge aus.

Als Nachweis werden der erfolgreiche Plan-Run mit `repair-plan.json` und `repair-plan.md`, der Attempt-Tag `atlas-repair-attempt/<pr-number>-<full-head-sha>`, der Execute-Run samt Job Summary sowie `repair-execution-report.json` und `repair-execution-report.md` erwartet. Der Execution-Report muss insbesondere `PUSHED`, den reservierten Versuch, genau den Repair-Commit, `pushPerformed: true`, `mergePerformed: false`, die Plan-Bindung und alle bestandenen Pilot-Gates ausweisen. Der Commit und das Audit belegen eine erfolgreiche Reparatur; erst ein eigenständiger Merge-Commit beziehungsweise der GitHub-PR-Zustand `merged` würde einen abgeschlossenen Merge belegen.

Nach dem automatisierten Repair-Push muss `CI / verify` vollständig für den neuen Head-SHA laufen und erfolgreich sein. Branch-Protection kann frühere PR-Approvals bei einem Push verwerfen; dann ist die verlangte menschliche Approval erneut einzuholen. Die einmalige Environment-Approval autorisiert nur den konkreten Execute-Job und ersetzt weder PR-Review noch CI oder Mergefreigabe. Es gibt keinen automatischen Merge und der Pilot-PR bleibt nach erfolgreicher Reparatur offen, bis Menschen separat über ihn entscheiden.

Unmittelbar nach dem Lauf wird Repair über den geschützten normalen PR-Prozess deaktiviert. Der erwartete eingecheckte Endzustand lautet:

```yaml
auto_merge: false
repair:
  enabled: false
  pilot_enabled: false
  pilot_allowed_pr_numbers:
  pilot_allowed_actors:
  pilot_allowed_triggering_actors:
  pilot_allowed_authors:
  auto_merge: false
```

Die leeren Listen werden als `[]` geparst. Der weiterhin enge Head-Präfix ist keine aktive Identitäts- oder PR-Freigabe; bei deaktivierten Schaltern kann kein Execute-Lauf die Policy-Gates passieren. Repair darf nach dem Pilot weder für Prüfzwecke reaktiviert noch automatisch ausgelöst werden.

## Sprint-2F-Aktivierung für den Fixture-PR

Der separate Fixture-Pilot existiert als PR #43 auf `pilot/atlas-repair-fixture`. Sein absichtlich fehlerhafter Head ist `8abcdacf1ba75f10267da4abec2db9af36af8791`. Der Sprint-2F-Aktivierungs-PR #42 schaltet die Policy ausschließlich für diesen Pilot-PR frei:

```yaml
repair:
  enabled: true
  pilot_enabled: true
  pilot_required_label: "atlas-repair-pilot"
  pilot_allowed_pr_numbers:
    - 43
  pilot_allowed_actors:
    - "jandddddd"
  pilot_allowed_triggering_actors:
    - "jandddddd"
  pilot_allowed_authors:
    - "jandddddd"
  pilot_allowed_head_prefixes:
    - "pilot/atlas-repair-"
  auto_merge: false
```

Der Execute-Workflow besitzt ausschließlich `workflow_dispatch`. Er startet keinen Repair automatisch und besitzt keinen Mergepfad.

PR #42 selbst ist nicht allowlisted. Es gibt keine Wildcards, leeren aktiven Listen oder zusätzlichen Freigaben. Der Branch von PR #43 erfüllt das enge Präfix `pilot/atlas-repair-`. Repair bleibt bis zu einem späteren ausdrücklich manuellen Dispatch unausgeführt; `repair.auto_merge` bleibt unverändert `false`.

## Verbindliche Reihenfolge bis zum ersten Pilotlauf

A. Das GitHub Environment `atlas-repair-pilot` ist administrativ eingerichtet. Dieser PR nimmt keine GitHub-Administration vor.

B. Der Required Reviewer ist eingerichtet und Administrator-Bypass ist deaktiviert. Der Operator prüft unmittelbar vor einem späteren Dispatch weiterhin Environment, Secret, Pilot-PR, aktuellen Head-SHA, Plan-Artefakt und alle Allowlist-Werte. Kann diese bewusste Einzel-Freigabe nicht gewährleistet werden, findet kein Pilotlauf statt.

C. `OPENAI_API_KEY` ist ausschließlich als Environment Secret in `atlas-repair-pilot` hinterlegt, niemals als Repository Secret, Variable, Datei, Log oder PR-Inhalt.

D. Das Label `atlas-repair-pilot` ist eingerichtet.

E. Der ungefährliche Fixture-Pilot-PR #43 wurde von `jandddddd` gegen `main` auf `pilot/atlas-repair-fixture` erstellt. Er trägt das erforderliche Pilot-Label `atlas-repair-pilot`; die übrigen unverändert geltenden Repair-Gates werden vor Planung und Ausführung geprüft.

F. Im noch offenen Sprint-2F-Aktivierungs-PR #42 wird ausschließlich PR #43 allowlisted. Actor, `github.triggering_actor` und PR-Autor sind jeweils exakt `jandddddd`. `repair.enabled: true` und `repair.pilot_enabled: true` werden gesetzt; `repair.auto_merge: false` bleibt bestehen. PR #42 wird nicht allowlisted.

G. Der Aktivierungs-PR durchläuft Review, Conversation Resolution und `CI / verify` und wird erst danach manuell gemergt. Rulesets und Merge-Einstellungen bleiben unverändert.

H. Erst nach dem manuellen Merge von #42 wird für den dann aktuellen vollständigen Head-SHA von PR #43 zunächst der manuelle Repair-Plan-Workflow gestartet und sein erfolgreiches Artefakt geprüft. Danach darf Repair Execution genau einmal manuell per `workflow_dispatch` mit PR-Nummer `43`, vollständigem unverändertem Head-SHA, dieser Plan-Run-ID und der Bestätigung `EXECUTE_REPAIR` gestartet werden. Es gibt keinen automatischen Trigger und keinen Retry.

I. Execution-Audit, Attempt-Tag, Gate-Ergebnisse, Zielbranch und gegebenenfalls der einzelne resultierende Commit werden geprüft. `mergePerformed` muss `false` sein.

J. `CI / verify` des Pilot-PRs wird nach dem Repair-Commit vollständig geprüft. Der Pilot-PR wird nicht automatisch oder im Rahmen dieses Ablaufs gemergt.

K. Unmittelbar danach wird über einen separaten geschützten PR `repair.pilot_enabled: false` und `repair.enabled: false` gesetzt und werden `pilot_allowed_pr_numbers`, `pilot_allowed_actors`, `pilot_allowed_triggering_actors` sowie `pilot_allowed_authors` geleert. `repair.auto_merge` bleibt `false`.

Wildcards, leere aktive Allowlists, allgemeine Freigaben und fremde Repositories sind unzulässig. Main-Ruleset, Required Check, Conversation Resolution und sonstige Schutzregeln bleiben unverändert.

## Ungefährlicher Fixture-Pilot

Pilot-PR #43 ändert ausschließlich `scripts/fixtures/atlas-repair-pilot-fixture.mjs`: Der String `pilot-ready` wurde im Commit `8abcdacf1ba75f10267da4abec2db9af36af8791` durch `pilot-not-ready` ersetzt. Dadurch schlägt ausschließlich die deterministische Assertion in `scripts/atlas-repair-pilot-fixture.test.mjs` fehl. Der PR verändert keine Produktlogik, Workflows, Konfiguration, Secrets oder Daten; er nutzt keine externen Systeme, Migrationen oder Kundendaten.

Repair darf höchstens einen Commit auf denselben, vor jedem Schreibschritt erneut validierten Pilot-PR-Branch pushen. Es entstehen kein neuer Branch, kein neuer PR, kein Merge und kein Retry. Der erwartete Repair stellt ausschließlich den Literalwert `pilot-ready` in der dedizierten Fixture wieder her.

Erwartet werden genau ein Attempt-Tag, ein Codex-Aufruf und ein normaler Commit auf demselben Pilot-PR-Branch. Es entstehen weder neuer Branch noch neuer PR, Push auf `main` oder Merge. `CI / verify` läuft neu; eine frühere Approval wird durch das Main-Ruleset verworfen.

## Auditprüfung

Das Execution-Artefakt muss Repository, Run-ID und URL, Actor und Triggering Actor, PR-Autor und -Nummer, Base-/Head-Branch und Repository, Head-SHA, vertrauenswürdigen Policy-/Workflow-SHA, Plan-Run-ID und SHA-256-Digest, feste Pilot-Gate-Ergebnisse, Attempt-Zustand, `BLOCKED`/`FAILED`/`PUSHED` und gegebenenfalls Commit-SHA enthalten. `mergePerformed` bleibt immer `false`.

Das Artefakt darf keine Prompts, Diagnosetexte, vollständigen Logs, Tokens oder Secrets enthalten.

## Kill-Switches und Abbruch

In dringender Reihenfolge:

1. Environment-Freigabe verweigern.
2. Execute-Workflow in GitHub Actions deaktivieren.
3. Environment-Secret entfernen oder rotieren.
4. Pilot-Label entfernen oder PR schließen.
5. `do-not-merge` setzen oder durch einen neuen Commit SHA und Plan ungültig machen.
6. Über einen geschützten PR `pilot_enabled: false` und `enabled: false` setzen.

Sofort abbrechen bei falschem Pushziel, mehr als einem Versuch pro SHA, fehlendem Audit, sensitiven Auditdaten, Änderungen außerhalb der Planpfade, automatischer Wiederholung oder irgendeinem Mergeversuch.

## Deaktivierung und Rollback

Nach dem Pilot werden beide Enable-Schalter über einen separaten geschützten PR wieder auf `false` gesetzt und die Allowlisten geleert. Der Attempt-Tag bleibt als Auditnachweis bestehen. Ein unerwünschter Repair-Commit wird ausschließlich auf dem PR-Branch durch einen normalen Folgecommit oder einen nachvollziehbaren Revert korrigiert. Main-Schutzregeln werden niemals abgeschwächt.
