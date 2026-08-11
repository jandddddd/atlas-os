# Kontrollierter Atlas-Repair-Pilot

## Nicht aktivierter Ausgangszustand

Der Sprint-2E-Implementierungs-PR bereitet den Pilot nur vor. Nach seinem Merge müssen weiterhin gelten:

```yaml
repair:
  enabled: false
  pilot_enabled: false
  auto_merge: false
```

Der Execute-Workflow besitzt ausschließlich `workflow_dispatch`. Er startet keinen Repair automatisch und besitzt keinen Mergepfad.

## Administrative Vorbereitung

Eine Repository-Administration richtet nach dem Merge manuell ein:

1. Label `atlas-repair-pilot`.
2. GitHub Environment `atlas-repair-pilot` mit einem Required Reviewer. Self-Approval soll, soweit verfügbar, ausgeschlossen sein.
3. Einen dedizierten `OPENAI_API_KEY` ausschließlich als Secret dieses Environments.
4. Einen ungefährlichen Pilot-PR von einem bekannten Autor auf `pilot/atlas-repair-<id>` gegen `main`.

Main-Ruleset, Required Check, Approvalpflicht und Conversation Resolution bleiben unverändert.

## Aktivierung

Die Aktivierung erfolgt über einen separaten, normal geschützten PR. Er setzt beide Schalter bewusst auf `true` und trägt ausschließlich konkrete Werte ein:

- exakt eine Pilot-PR-Nummer
- konkrete erlaubte Dispatcher
- konkrete erlaubte PR-Autoren
- Präfix `pilot/atlas-repair-`

Wildcards, leere aktive Allowlisten und fremde Repositories sind unzulässig. Auf dem Pilot-PR müssen `atlas-repair` und `atlas-repair-pilot` gesetzt sein. Danach muss für den aktuellen vollständigen Head-SHA ein neuer Repair-Plan erzeugt werden; ein bei deaktivierter Policy erstellter Plan ist nicht ausführbar.

## Ungefährlicher Fixture-Pilot

Der Pilot-PR ändert ausschließlich `scripts/fixtures/atlas-repair-pilot-fixture.mjs`, sodass der deterministische Test `scripts/atlas-repair-pilot-fixture.test.mjs` genau einmal fehlschlägt. Nach Prüfung des Plan-Artefakts wird Execute manuell mit PR-Nummer, vollständigem SHA, Plan-Run-ID und `EXECUTE_REPAIR` gestartet. Ein Required Reviewer genehmigt anschließend das Environment.

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
