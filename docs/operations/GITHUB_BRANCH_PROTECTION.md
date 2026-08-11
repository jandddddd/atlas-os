# GitHub Branch Protection für `main`

## Zweck und Verantwortlichkeit

Diese Checkliste beschreibt die nach Sprint 2D manuell einzurichtenden GitHub-Regeln für `main`. Repositorycode kann diese Schutzregeln nicht ersetzen. Eine Repository-Administration muss die Einstellungen nach dem Merge von Sprint 2D in GitHub als Branch Protection oder Ruleset aktivieren und mit einem separaten Test-PR verifizieren.

## Vorbereitung

- Sprint 2D ist über einen Pull Request gemergt.
- Der aktualisierte Workflow `CI` ist auf einem PR erfolgreich gelaufen.
- Der bestehende Job heißt weiterhin `verify` und erscheint in GitHub als `CI / verify`.
- Mindestens eine andere Person mit Reviewrechten steht für die vorgeschriebene Freigabe zur Verfügung.
- `repair.enabled` steht weiterhin auf `false`.

## Pull-Request-Regeln

- **Require a pull request before merging:** aktivieren.
- **Required approvals:** `1`.
- **Dismiss stale pull request approvals when new commits are pushed:** aktivieren.
- **Require conversation resolution before merging:** aktivieren.
- **Require review from Code Owners:** nicht aktivieren, solange keine belastbare `CODEOWNERS`-Datei existiert.
- **Require approval of the most recent reviewable push:** für den aktuellen Solo-/Kleinteam-Betrieb nicht aktivieren; vor einer späteren Aktivierung muss sichergestellt sein, dass eine unabhängige Person den letzten Push freigeben kann.

## Required Status Checks

- **Require status checks to pass before merging:** aktivieren.
- **Require branches to be up to date before merging:** aktivieren.
- Als einzigen Required Check den GitHub-Eintrag für Workflow `CI`, Job `verify` auswählen. In der Oberfläche wird er üblicherweise als `CI / verify` angezeigt; der technische Check-Run-Name ist `verify`.
- Den tatsächlich angebotenen Context im GitHub-Auswahldialog nach dem ersten Sprint-2D-CI-Lauf prüfen. Keinen ähnlich benannten fremden Check auswählen.
- `Atlas PR Supervisor / supervise` nicht als Required Check konfigurieren. Der Workflow kann technisch erfolgreich sein, obwohl sein strukturiertes Ergebnis `BLOCKED` lautet.

`POLICY_READY` ist nur eine positive Bewertung der Atlas-Supervisor-Policy. Es ersetzt weder den Required Check noch eine formale Reviewfreigabe oder Branch Protection.

## Push- und Bypass-Schutz

- Änderungen an `main` nur über Pull Requests erlauben.
- **Include administrators** beziehungsweise **Do not allow bypassing the above settings:** aktivieren.
- Keine Benutzer, Teams, Apps oder Administratoren in eine Bypass-Liste aufnehmen.
- Force-Pushes nicht erlauben.
- Löschen von `main` nicht erlauben.
- GitHub Actions keinen direkten Push auf `main` erlauben.
- Repair Execution darf ausschließlich normal auf den bestehenden PR-Branch pushen.

## Weitere Einstellungen

- Auto-Merge: deaktiviert lassen.
- Merge Queue: nicht aktivieren.
- Require deployments before merging: nicht aktivieren, solange kein belastbares Deployment-Gate existiert.
- Require signed commits: in Sprint 2D nicht aktivieren; zunächst die Signierbarkeit lokaler Agenten- und GitHub-Actions-Commits klären.
- Require linear history: nicht aktivieren, da das Repository aktuell Merge-Commits verwendet.
- Lock branch: nicht aktivieren.
- Bestehende Merge-Methoden werden durch Sprint 2D nicht geändert.

## Verifikation nach Aktivierung

Einen kleinen, ungefährlichen Test-PR gegen `main` öffnen und prüfen:

1. Ein direkter Push auf `main` wird abgewiesen.
2. Ein PR kann ohne erfolgreichen `CI / verify`-Check nicht gemergt werden.
3. Ein nicht aktueller PR-Branch muss vor dem Merge aktualisiert werden.
4. Der PR-Autor kann die geforderte fremde Freigabe nicht selbst erteilen.
5. Ein neuer Commit verwirft eine bestehende Freigabe.
6. Eine offene Review-Konversation blockiert den Merge.
7. Administratoren können die Regeln nicht umgehen.
8. Der Supervisor bleibt eine ergänzende Policybewertung und führt keinen Merge aus.
9. `repair.enabled` ist weiterhin `false`; weder Repair Execution noch Auto-Merge werden durch diese Einstellungen aktiviert.

## Notfalländerungen

Schutzregeln nur durch eine Repository-Administration und nachvollziehbar ändern. Für einen blockierten PR keine Required Checks, Reviews oder Bypass-Regeln vorübergehend abschwächen. Stattdessen die Ursache im bestehenden PR beheben oder einen klar dokumentierten separaten Administrationsvorgang verwenden.
