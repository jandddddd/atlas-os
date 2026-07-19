# Today Decision Priority Engine

## Zweck

Die Decision Engine ist der zentrale Einstiegspunkt für die fachliche
Reihenfolge der Entscheidungen auf Today. Sie erzeugt für jede aus dem
Repository gelieferte Entscheidung einen numerischen Priority Score, eine
strukturierte Explainability und gibt die Entscheidungen danach sortiert zurück.

## Explainability

Jedes priorisierte Ergebnis enthält neben der Entscheidung die `priority` mit
`score` und einer Liste von `reasons`. Die Engine erzeugt für jeden verwendeten
Faktor einen strukturierten Grund: `urgency` für die Dringlichkeit und
`economic-impact` für die wirtschaftliche Auswirkung. So kann Atlas die
automatische Reihenfolge nachvollziehbar erklären, ohne dass UI-Komponenten
eigene Priorisierungsgründe erzeugen.

Die Approval Card zeigt diese von der Engine gelieferten Gründe. Sie erzeugt
keine eigenen Priorisierungsbegründungen, damit Anzeige und fachliche
Priorisierung nicht auseinanderlaufen.

Wenn der TodayDecisionState eine Entscheidung manuell für „Heute zuerst“
einordnet, verwendet er ebenfalls die von der Engine bereitgestellte
Explainability mit dem Code `manual-priority`. Der numerische Basisscore und
die faktorbasierte Explainability aller nicht manuell umsortierten
Entscheidungen bleiben erhalten. Die manuell priorisierte Entscheidung erhält
keine automatischen Faktorgründe, damit nicht der Eindruck entsteht, die Engine
habe sie automatisch an Position eins gesetzt.

## Score

Die Engine verwendet zwei feste, begrenzte Skalen mit den Werten `low`,
`medium` und `high`. Der Score ist deterministisch und wird zentral berechnet:

`Score = Dringlichkeit + wirtschaftliche Auswirkung + Freischalten - unerfüllte Voraussetzung`

| Faktor | low | medium | high |
| --- | ---: | ---: | ---: |
| Dringlichkeit | 0 | 30 | 60 |
| Wirtschaftliche Auswirkung | 0 | 10 | 20 |
| Freischalten von Folgearbeit | 25 | – | – |
| Unerfüllte Voraussetzung | -105 | – | – |

Dringlichkeit hat damit das dreifache Gewicht der wirtschaftlichen Auswirkung.
Eine offene Entscheidung, die mindestens eine Folgeentscheidung blockiert,
erhält einmalig 25 Punkte. Eine Entscheidung mit mindestens einer noch offenen
Voraussetzung verliert 105 Punkte. Die Strafe ist größer als der maximale
Basisscore inklusive Freischaltbonus (80 + 25), sodass eine wartende
Entscheidung keinen künstlich hohen Score erhalten kann. Mehrere Dependencies
verändern den Bonus oder die Strafe in dieser ersten Version nicht weiter.
Bei gleichem Score entscheidet der Quellindex aufsteigend; Entscheidungen
bleiben also in ihrer gelieferten Reihenfolge. Dieser Tie-Breaker ist stabil
und keine zusätzliche fachliche Score-Komponente.

Manuelle Priorisierung und Zurückstellung bleiben weiterhin im bestehenden
TodayDecisionStateStore und werden erst nach der zentralen Grundreihenfolge
angewendet. Eine Entscheidung, die manuell für „Heute zuerst“ gesetzt wurde,
bleibt deshalb unabhängig von ihrem Score an erster Stelle.

## Dependencies

Eine Entscheidung kann optional `dependsOn: string[]` enthalten. Die Einträge
sind IDs anderer Entscheidungen und bilden die fachliche Voraussetzung ab.
`dependsOn` ist das kanonische Modell; welche Entscheidungen eine Entscheidung
blockiert, leitet die Engine aus den umgekehrten Referenzen der offenen
Entscheidungsmenge ab. Dadurch können Abhängigkeiten an genau einer Stelle
gepflegt werden.

Die Engine bewertet ausschließlich die ihr übergebenen offenen Entscheidungen:
Eine Dependency, deren ID nicht in dieser Menge vorkommt, gilt als erfüllt. Ist
sie noch enthalten, wartet die Folgeentscheidung und erhält die beschriebene
Score-Strafe. Die vorausgehende Entscheidung erhält den Freischaltbonus.
Selbstreferenzen werden ignoriert. Die Reihenfolge bleibt bei gleichen Scores
über den Quellindex stabil.

Die Explainability stammt vollständig aus der Engine. Bei einem Freischalter
liefert sie `blocks-follow-up-work` mit „Blockiert weitere Arbeiten:
Voraussetzung für Folgeentscheidung.“. Bei einer wartenden Entscheidung liefert
sie `waiting-for-prerequisite` mit „Wartet auf vorherige Entscheidung.“.
UI-Komponenten erzeugen keine Dependency-Texte.

## Erweiterung

Für spätere Erweiterungen können Dependency-Metadaten (etwa ein fachlicher
Grund oder eine Blockierungsart) am `dependsOn`-Modell ergänzt werden. Die
Engine muss dafür weiterhin die offene Menge, die Score-Auswirkung und den
strukturierten Explainability-Grund zentral auswerten und mit Unit-Tests
absichern.

Neue Faktoren wie Risiko, Fälligkeit oder KI-Empfehlungen werden nicht in
UI-Komponenten oder Stores ergänzt. Stattdessen erhalten sie in
`calculateTodayDecisionPriority` eine feste, dokumentierte Skala, eine
Score-Komponente und einen zusätzlichen strukturierten Grund in
`priority.reasons`. Ihre Eingabedaten müssen an der jeweiligen Systemgrenze
zur Laufzeit validiert werden. Vor dem Aktivieren eines weiteren Faktors sind
die Gewichtung, der Einfluss auf bestehende Prioritäten und die Explainability
durch Unit-Tests abzusichern.
