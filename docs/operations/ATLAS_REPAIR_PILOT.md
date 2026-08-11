# Kontrollierter Atlas-Repair-Pilot

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
