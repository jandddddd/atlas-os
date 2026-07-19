# Today Decision Priority Engine

## Zweck

Die Decision Engine ist der zentrale Einstiegspunkt für die fachliche
Reihenfolge der Entscheidungen auf Today. Sie erzeugt für jede aus dem
Repository gelieferte Entscheidung einen numerischen Priority Score und gibt
die Entscheidungen danach sortiert zurück.

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
`calculateTodayDecisionPriority` aufgenommen. Dabei müssen ihre Eingabedaten
zur Laufzeit an der jeweiligen Systemgrenze validiert werden und bestehende
Prioritäten durch passende Unit-Tests abgesichert bleiben.
