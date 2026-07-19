# Today Decision Priority Engine

## Zweck

Die Decision Engine ist der zentrale Einstiegspunkt für die fachliche
Reihenfolge der Entscheidungen auf Today. Sie erzeugt für jede aus dem
Repository gelieferte Entscheidung einen numerischen Priority Score, eine
strukturierte Explainability und gibt die Entscheidungen danach sortiert zurück.

## Explainability

Jedes priorisierte Ergebnis enthält neben der Entscheidung die `priority` mit
`score` und einer Liste von `reasons`. Der aktuelle Grund verwendet den Code
`source-order` und beschreibt ausschließlich den bestehenden Prioritätsvertrag.
So kann Atlas nachvollziehbar erklären, warum eine Entscheidung in der
Grundreihenfolge steht, ohne diese Reihenfolge zu verändern.

Die Approval Card zeigt diese von der Engine gelieferten Gründe. Sie erzeugt
keine eigenen Priorisierungsbegründungen, damit Anzeige und fachliche
Priorisierung nicht auseinanderlaufen.

Wenn der TodayDecisionState eine Entscheidung manuell für „Heute zuerst“
einordnet, verwendet er ebenfalls die von der Engine bereitgestellte
Explainability mit dem Code `manual-priority`. Der numerische Basisscore und
die `source-order`-Explainability aller nicht manuell umsortierten
Entscheidungen bleiben erhalten.

## Aktueller Score

Die aktuelle Reihenfolge der Fixture-Entscheidungen ist bereits der bestehende
Prioritätsvertrag. Deshalb erhält eine Entscheidung den Score
`Anzahl der Entscheidungen - Quellindex`: Die erste Entscheidung erhält den
höchsten Score. Der Quellindex ist zugleich ein stabiler Tie-Breaker.

Damit bleibt die sichtbare Standardreihenfolge unverändert. Manuelle
Priorisierung und Zurückstellung bleiben weiterhin im bestehenden
TodayDecisionStateStore und werden erst nach der zentralen Grundreihenfolge
angewendet.

## Erweiterung

Neue Faktoren wie Risiko, Dringlichkeit, wirtschaftlicher Wert, Fälligkeit
oder KI-Empfehlungen werden nicht in UI-Komponenten oder Stores ergänzt.
Stattdessen werden sie als weitere, dokumentierte Score-Komponenten in
`calculateTodayDecisionPriority` aufgenommen und erhalten jeweils einen
zusätzlichen strukturierten Grund in `priority.reasons`. Dabei müssen ihre
Eingabedaten zur Laufzeit an der jeweiligen Systemgrenze validiert werden und
bestehende Prioritäten durch passende Unit-Tests abgesichert bleiben.
