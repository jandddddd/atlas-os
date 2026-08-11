# Kontrollierter Atlas-Repair-Pilot

## Sprint-2F-Aktivierungsentwurf (noch deaktiviert)

Der Sprint-2F-PR bereitet die Aktivierung vor, aktiviert sie aber ohne existierenden Pilot-PR ausdrücklich nicht. Auf dem Branch müssen bis zur Erstellung des echten Pilot-PRs gelten:

```yaml
repair:
  enabled: false
  pilot_enabled: false
  auto_merge: false
```

Der Execute-Workflow besitzt ausschließlich `workflow_dispatch`. Er startet keinen Repair automatisch und besitzt keinen Mergepfad.

Bereits konkret eingetragen sind `jandddddd` als einziger erlaubter `actor`, einziger erlaubter `triggering_actor` und einziger erlaubter PR-Autor, das enge Präfix `pilot/atlas-repair-` und das Label `atlas-repair-pilot`. Vor der Aktivierung muss die Repository-Administration diese drei Accountwerte gegen den tatsächlich angemeldeten Dispatcher und den Autor des Pilot-PRs prüfen. Abweichungen werden auf die jeweils exakt benötigten Accounts korrigiert; es werden keine zusätzlichen Accounts vorsorglich freigegeben.

Absichtlich offen bleibt `pilot_allowed_pr_numbers`. Erst nach Erstellung des Pilot-PRs wird genau dessen echte positive PR-Nummer eingetragen. Im selben letzten Update dieses PRs werden `repair.enabled` und `repair.pilot_enabled` auf `true` gesetzt. `repair.auto_merge` bleibt unverändert `false`.

## Verbindliche Reihenfolge bis zum ersten Pilotlauf

A. Eine Repository-Administration legt das GitHub Environment `atlas-repair-pilot` manuell an. Dieser PR nimmt keine GitHub-Administration vor.

B. Wenn GitHub im aktuellen Tarif und Solo-Setup einen wirksamen Required Reviewer zulässt, wird genau dieser Schutz eingerichtet und Self-Review ausgeschlossen. Ist das technisch nicht möglich, wird keine versteckte Bypass-Regel ergänzt: Die sichere Solo-Alternative ist ein dokumentierter manueller Halt. Der Operator prüft unmittelbar vor dem Dispatch Environment, Secret, Pilot-PR, aktuellen Head-SHA, Plan-Artefakt und alle Allowlist-Werte und protokolliert diese Freigabe im Aktivierungs- oder Pilot-PR. Kann diese bewusste Einzel-Freigabe nicht gewährleistet werden, findet kein Pilotlauf statt.

C. `OPENAI_API_KEY` wird ausschließlich als Environment Secret in `atlas-repair-pilot` hinterlegt, niemals als Repository Secret, Variable, Datei, Log oder PR-Inhalt.

D. Das Label `atlas-repair-pilot` wird manuell angelegt.

E. Von dem vorgesehenen Autor wird ein ungefährlicher Fixture-Pilot-PR gegen `main` erstellt. Sein Branch beginnt exakt mit `pilot/atlas-repair-`; zusätzlich trägt der PR die Labels `atlas-repair` und `atlas-repair-pilot`.

F. Im noch offenen Sprint-2F-Aktivierungs-PR wird `pilot_allowed_pr_numbers` auf eine Liste mit exakt der echten Pilot-PR-Nummer gesetzt. `pilot_allowed_actors`, `pilot_allowed_triggering_actors` und `pilot_allowed_authors` werden gegen Dispatcher, `github.triggering_actor` und PR-Autor geprüft und enthalten jeweils ausschließlich die benötigten Accounts. Dann werden `repair.enabled: true` und `repair.pilot_enabled: true` gesetzt; `repair.auto_merge: false` bleibt bestehen.

G. Der Aktivierungs-PR durchläuft Review, Conversation Resolution und `CI / verify` und wird erst danach manuell gemergt. Rulesets und Merge-Einstellungen bleiben unverändert.

H. Für den aktuellen vollständigen Head-SHA des Pilot-PRs wird zunächst der manuelle Repair-Plan-Workflow gestartet und sein erfolgreiches Artefakt geprüft. Danach wird Repair Execution genau einmal manuell per `workflow_dispatch` mit echter PR-Nummer, vollständigem unverändertem Head-SHA, dieser Plan-Run-ID und der Bestätigung `EXECUTE_REPAIR` gestartet. Es gibt keinen automatischen Trigger und keinen Retry.

I. Execution-Audit, Attempt-Tag, Gate-Ergebnisse, Zielbranch und gegebenenfalls der einzelne resultierende Commit werden geprüft. `mergePerformed` muss `false` sein.

J. `CI / verify` des Pilot-PRs wird nach dem Repair-Commit vollständig geprüft. Der Pilot-PR wird nicht automatisch oder im Rahmen dieses Ablaufs gemergt.

K. Unmittelbar danach wird über einen separaten geschützten PR `repair.pilot_enabled: false` und `repair.enabled: false` gesetzt und werden `pilot_allowed_pr_numbers`, `pilot_allowed_actors`, `pilot_allowed_triggering_actors` sowie `pilot_allowed_authors` geleert. `repair.auto_merge` bleibt `false`.

Wildcards, leere aktive Allowlists, allgemeine Freigaben und fremde Repositories sind unzulässig. Main-Ruleset, Required Check, Conversation Resolution und sonstige Schutzregeln bleiben unverändert.

## Ungefährlicher Fixture-Pilot

Der Pilot-PR ändert ausschließlich `scripts/fixtures/atlas-repair-pilot-fixture.mjs`: Der String `pilot-ready` wird einmalig durch einen anderen harmlosen Literalwert ersetzt. Dadurch schlägt ausschließlich die deterministische Assertion in `scripts/atlas-repair-pilot-fixture.test.mjs` fehl. Der PR verändert keine Produktlogik, Workflows, Konfiguration, Secrets oder Daten; er nutzt keine externen Systeme, Migrationen oder Kundendaten.

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
