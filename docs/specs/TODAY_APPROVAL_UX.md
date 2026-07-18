# Today Approval UX

## Zweck dieser Spezifikation

Diese Spezifikation beschreibt ausschließlich die Benutzererfahrung der Today-Seite. Sie definiert, wie sich Today anfühlen, verhalten und sprachlich führen soll. Sie beschreibt keine technische Umsetzung, keine Komponenten, kein Markup, keine Datenmodelle und keine Implementierungsdetails.

Today ist der morgendliche Einstieg in Atlas OS. Die Seite soll nicht wie ein Dashboard, ERP oder CRM wirken. Sie soll sich anfühlen, als hätte Atlas vor Arbeitsbeginn bereits sortiert, vorbereitet und auf das Wesentliche reduziert.

## UX-Ziel

Der Meister soll morgens innerhalb von zwei bis fünf Minuten wissen:

- was heute wichtig ist
- welche Entscheidungen jetzt anstehen
- was Atlas bereits vorbereitet oder erledigt hat
- wo Atlas Hilfe, Prüfung oder Freigabe benötigt

Danach soll der Meister seinen Arbeitstag beginnen können, ohne vorher E-Mails, Kalender, Nachrichten, Projektlisten oder Angebotsstände durchsuchen zu müssen.

Today beantwortet nicht die Frage: „Was gibt es alles im Betrieb?“

Today beantwortet die Frage: „Was muss ich jetzt entscheiden, damit der Tag weiterlaufen kann?“

## Grundgefühl

Today fühlt sich wie ein ruhiger, kompetenter Assistent an.

Atlas tritt nicht als System, Tabelle oder Kontrollzentrum auf. Atlas tritt als vorbereitende Instanz auf, die Arbeit abnimmt und nur die Punkte zeigt, bei denen menschliche Entscheidung nötig ist.

Der Nutzer soll spüren:

- Atlas hat bereits gelesen, sortiert und priorisiert.
- Atlas zeigt nicht alles, sondern nur das Relevante.
- Atlas erklärt genug, aber nicht zu viel.
- Atlas drängt nicht, sondern führt ruhig zur nächsten Entscheidung.
- Atlas bleibt transparent, wenn etwas unsicher ist.
- Der Mensch behält die Kontrolle.

## Der perfekte Morgen

Der ideale Ablauf ist kurz, konzentriert und abschließbar.

1. Der Meister öffnet Atlas.
2. Today erscheint als erste und wichtigste Ansicht des Tages.
3. Atlas begrüßt nicht ausführlich, sondern zeigt sofort die wichtigste Entscheidung.
4. Der Meister erkennt auf einen Blick, worum es geht und warum dieser Punkt oben steht.
5. Er öffnet die erste Freigabe oder sieht sie bereits fokussiert vor sich.
6. Atlas fasst knapp zusammen:
   - welcher Vorgang betroffen ist
   - was vorbereitet wurde
   - warum jetzt eine Entscheidung sinnvoll ist
   - ob Atlas sicher ist oder noch Prüfung braucht
7. Der Meister prüft zuerst die Kurzfassung.
8. Wenn alles klar ist, gibt er frei.
9. Wenn etwas unklar ist, öffnet er gezielt Details, Begründung oder offene Punkte.
10. Nach der Entscheidung zeigt Atlas unmittelbar die nächste wichtigste Entscheidung.
11. Jede erledigte Entscheidung verschwindet aus dem Fokus und wird ruhig als erledigt bestätigt.
12. Atlas wiederholt den Ablauf, bis keine wichtigen Entscheidungen mehr offen sind.
13. Am Ende zeigt Today eine klare Abschlussbotschaft:

> Für heute ist alles erledigt.

Diese Abschlussbotschaft ist ein wichtiger Teil der Erfahrung. Sie gibt dem Meister das Gefühl, den Bürostart abgeschlossen zu haben. Today endet nicht in einer endlosen Liste, sondern in einem klaren Zustand von Ruhe und Handlungsfähigkeit.

## Interaktionsprinzipien

### Eine Entscheidung gleichzeitig

Today führt den Nutzer immer zu genau einer Hauptentscheidung. Weitere offene Punkte dürfen sichtbar sein, aber sie treten zurück. Der Meister soll nicht mehrere Entscheidungen parallel abwägen müssen.

### Eine klare Primäraktion

Jede Freigabe hat eine eindeutig erkennbare empfohlene Hauptaktion. Der Nutzer soll nie raten müssen, welcher nächste Schritt sinnvoll ist.

Gute Primäraktionen sind klar und verbindlich formuliert, zum Beispiel:

- Freigeben
- Termin bestätigen
- Antwort freigeben
- Rückfrage senden
- Später entscheiden

Die Aktion beschreibt immer, was für den Nutzer geschieht. Sie darf nicht abstrakt, technisch oder missverständlich wirken.

### Details erst auf Wunsch

Today zeigt zuerst nur das, was für die Entscheidung nötig ist. Hintergrundinformationen, ursprüngliche Nachrichten, Verlauf, Annahmen oder Begründungen erscheinen erst, wenn der Nutzer sie bewusst öffnet.

Die Grundregel lautet: erst Orientierung, dann Prüfung, dann Details.

### Atlas erklärt nur das Nötigste

Atlas schreibt kurz. Jede Erklärung muss dem Nutzer helfen, sicherer oder schneller zu entscheiden. Texte, die lediglich Vollständigkeit erzeugen, gehören nicht auf die erste Ebene.

### Keine Informationsflut

Today ist kein Ort für vollständige Listen, Metriken, Auswertungen oder Modulübersichten. Wenn viele Dinge offen sind, reduziert Atlas sie auf die nächste sinnvolle Entscheidung und eine knappe Einordnung der verbleibenden Punkte.

### Keine unnötigen Unterbrechungen

Popups, Warnungen und Zwischenfragen sind nur gerechtfertigt, wenn ohne sie eine falsche oder schwer rückgängig zu machende Entscheidung wahrscheinlich wäre. In allen anderen Fällen bleibt die Interaktion im ruhigen Entscheidungsfluss.

### Keine Ablenkung

Today vermeidet alles, was Aufmerksamkeit bindet, ohne die Entscheidung zu verbessern. Dazu gehören dekorative Animationen, visuelle Effekte, unnötige Farben, konkurrierende Aktionsflächen und ständig wechselnde Inhalte.

## Freigaben

### Wie sich eine Freigabe anfühlt

Eine Freigabe fühlt sich wie ein vorbereiteter Vorschlag an, nicht wie ein Formular. Atlas legt dem Meister eine Entscheidung vor und macht deutlich: „Ich habe das vorbereitet. Bitte prüfe und entscheide.“

Die Freigabe soll Sicherheit geben, ohne den Nutzer zu entmündigen. Sie ist schnell prüfbar, nachvollziehbar und kontrollierbar.

### Was zuerst erscheint

Auf der ersten Ebene erscheinen nur die entscheidungsrelevanten Informationen:

- die konkrete Entscheidung
- der betroffene Kunde, Vorgang oder Termin
- eine sehr kurze Zusammenfassung des Vorschlags
- der Grund, warum dieser Punkt jetzt wichtig ist
- der Sicherheitsgrad in verständlicher Sprache
- eine klare Primäraktion
- wenige reduzierte Alternativen

Der Nutzer soll eine Standardfreigabe allein mit diesen Informationen verstehen können.

### Was erst nach Klick erscheint

Erweiterte Informationen erscheinen erst auf Wunsch, zum Beispiel:

- ursprüngliche Nachricht oder Kundenformulierung
- längere Begründung von Atlas
- bisheriger Verlauf im Vorgang
- erkannte Annahmen
- fehlende Angaben
- alternative Formulierungen
- fachliche Prüfhinweise
- Auswirkungen auf weitere Vorgänge

Diese Details dienen der Prüfung, nicht der ersten Orientierung.

### Klicktiefe einer Standardfreigabe

Eine einfache, eindeutige Freigabe sollte mit einem einzigen bewussten Klick abgeschlossen werden können, sobald der Nutzer die Kurzfassung geprüft hat.

Eine normale Freigabe mit kurzer Detailprüfung sollte in zwei bis drei Klicks abgeschlossen sein:

1. Freigabe ansehen
2. optional Details öffnen oder Vorschlag prüfen
3. freigeben, ändern oder zurückstellen

Wenn eine Freigabe deutlich mehr Schritte braucht, ist sie wahrscheinlich zu komplex für Today und muss entweder stärker zusammengefasst oder in einen Detailbereich ausgelagert werden.

### Änderung statt Abbruch

Wenn der Vorschlag fast passt, soll der Nutzer ihn ändern können, ohne den gesamten Ablauf zu verlassen. Änderungen fühlen sich wie Korrekturen an Atlas an, nicht wie ein Neustart der Aufgabe.

### Ablehnung ohne Rechtfertigungsdruck

Der Nutzer darf Vorschläge ablehnen, ohne lange Begründungen eingeben zu müssen. Atlas kann optional eine kurze Rückfrage anbieten, aber niemals so, dass der Meister sich aufgehalten oder kontrolliert fühlt.

## Unsicherheit

### Grundhaltung

Unsicherheit ist kein Fehlerzustand. Unsicherheit ist ein ehrlicher Hinweis von Atlas, dass menschliche Einschätzung nötig ist.

Atlas sagt nicht: „Fehler“.

Atlas sagt sinngemäß:

- „Ich bin mir hier nicht sicher.“
- „Mir fehlt eine Angabe.“
- „Diese Information passt nicht eindeutig zusammen.“
- „Bitte prüfe diesen Punkt kurz.“

### Wirkung auf Vertrauen

Atlas gewinnt Vertrauen, indem es Unsicherheit früh und ruhig sichtbar macht. Der Nutzer soll nicht das Gefühl haben, Atlas verstecke Lücken oder tue so, als sei alles eindeutig.

Unsicherheit muss immer konkret sein. Der Nutzer soll verstehen, woran die Unsicherheit liegt, zum Beispiel:

- eine Kundenangabe fehlt
- zwei Informationen widersprechen sich
- eine Fläche wurde genannt, ist aber nicht als Bearbeitungsfläche gesichert
- ein Terminwunsch kollidiert möglicherweise mit einem anderen Vorgang
- eine Formulierung könnte vor dem Versand fachlich geprüft werden müssen

### Sprache für Unsicherheit

Unsicherheit wird freundlich, knapp und handlungsorientiert formuliert.

Geeignete Formulierungen:

- „Ich bin mir bei der Fläche nicht sicher.“
- „Die Kundennachricht lässt zwei Deutungen zu.“
- „Für eine sichere Einschätzung fehlt noch ein Maß.“
- „Ich würde diesen Punkt vor dem Versand prüfen lassen.“

Ungeeignete Formulierungen:

- „Fehlerhafte Daten“
- „Validierung fehlgeschlagen“
- „Konfidenz niedrig“
- „Unvollständiger Datensatz“
- „System konnte nicht entscheiden“

### Handlung bei Unsicherheit

Jede Unsicherheit braucht einen nächsten sinnvollen Schritt. Atlas darf Unsicherheit nicht nur anzeigen, sondern muss helfen, sie aufzulösen.

Mögliche nächste Schritte sind:

- Angabe ergänzen
- Kundenrückfrage vorbereiten
- Vorschlag ändern
- Vorgang später prüfen
- Detailbereich öffnen
- Entscheidung trotzdem bewusst freigeben

## Lernen

### Wie Lernen sichtbar wird

Atlas soll zeigen, dass Entscheidungen den zukünftigen Arbeitsfluss verbessern. Dieses Lernen wird nicht technisch erklärt. Der Nutzer muss keine Begriffe wie Modell, Training, Algorithmus oder Datenpipeline sehen.

Atlas spricht stattdessen alltagsnah:

- „Ich merke mir diese Korrektur für ähnliche Fälle.“
- „Beim nächsten Angebot dieser Art achte ich darauf.“
- „Ich berücksichtige künftig diese Formulierung.“
- „Verstanden. Solche Termine schlage ich künftig vorsichtiger vor.“

### Wann Lernen gezeigt wird

Lernhinweise erscheinen sparsam. Sie sollen Bestätigung geben, aber nicht jede Aktion kommentieren. Besonders sinnvoll sind sie nach:

- wiederholten Änderungen ähnlicher Vorschläge
- Korrekturen an Formulierungen
- Ablehnungen bestimmter Vorschlagsarten
- Freigaben trotz markierter Unsicherheit
- Entscheidungen, die eine betriebliche Vorliebe erkennen lassen

### Lernen ohne Kontrollverlust

Atlas darf nie den Eindruck erwecken, künftig ohne Freigabe verbindlich zu handeln. Lernen bedeutet bessere Vorbereitung, nicht automatische Entscheidung.

Die richtige Botschaft lautet: „Atlas versteht den Betrieb besser.“

Nicht: „Atlas entscheidet künftig allein.“

## Minimalismus: verbindliche UX-Regeln

Today folgt strengen Regeln, damit die Seite ruhig und fokussiert bleibt.

- Es gibt immer nur eine dominante Hauptaufgabe im Fokus.
- Pro Bildschirm gibt es nur wenige primäre Handlungsangebote.
- Jede Ansicht hat eine klare visuelle Hierarchie.
- Texte sind kurz, konkret und entscheidungsnah.
- Große Weißräume sind gewünscht und kein verlorener Platz.
- Typografie bleibt ruhig, lesbar und unaufgeregt.
- Farben werden sparsam eingesetzt und haben immer Bedeutung.
- Keine Farbe dient nur der Dekoration.
- Keine dekorativen Animationen.
- Keine komplexen Dashboards.
- Keine Diagramme oder Kennzahlen ohne direkten Entscheidungsnutzen.
- Keine vollständigen Modulansichten innerhalb von Today.
- Keine langen Tabellen als erste Ebene.
- Keine konkurrierenden Hauptaktionen.
- Keine technischen Statusbegriffe.
- Keine automatisch aufklappenden Detailbereiche ohne Anlass.
- Keine dauerhaften Hinweise, die nach Erledigung weiter Aufmerksamkeit ziehen.

Minimalismus bedeutet nicht Informationsarmut. Es bedeutet, dass Atlas die Reihenfolge und Menge der Informationen für den Moment richtig dosiert.

## Tonalität

Atlas spricht ruhig, kompetent und freundlich.

Atlas ist:

- unterstützend
- knapp
- verständlich
- ehrlich bei Unsicherheit
- respektvoll gegenüber der Entscheidung des Meisters

Atlas ist niemals:

- belehrend
- hektisch
- technisch
- anbiedernd
- dramatisch
- rechthaberisch
- übermäßig selbstbewusst

Atlas dominiert den Arbeitstag nicht. Atlas bereitet vor, ordnet ein und übergibt dem Menschen die Entscheidung.

### Gute Tonalität

- „Ich habe einen Angebotsentwurf vorbereitet. Bitte prüfe noch die Fläche im Flur.“
- „Dieser Termin passt wahrscheinlich. Eine Rückmeldung der Kundin fehlt noch.“
- „Die Antwort ist versandbereit.“
- „Für heute ist alles erledigt.“

### Schlechte Tonalität

- „Dringend handeln!“
- „Systemfehler in Vorgang 482.“
- „Automatische Optimierung abgeschlossen.“
- „Du solltest diesen Vorschlag übernehmen.“
- „Konfidenz 62 Prozent.“

## Erfolgskriterien aus Nutzersicht

Today ist erfolgreich, wenn der Meister nach wenigen Minuten sagen kann:

- „Ich weiß, was heute wichtig ist.“
- „Ich habe die offenen Entscheidungen erledigt.“
- „Ich musste nichts suchen.“
- „Atlas hat mir die Arbeit vorsortiert.“
- „Ich verstehe, warum Atlas diese Vorschläge gemacht hat.“
- „Ich sehe, wo noch Angaben fehlen.“
- „Ich habe weiterhin die Kontrolle.“
- „Ich kann jetzt raus in den Arbeitstag.“

Today ist nicht erfolgreich, wenn der Nutzer das Gefühl hat:

- eine weitere Verwaltungsseite pflegen zu müssen
- in Listen und Details suchen zu müssen
- von Meldungen, Zahlen oder Farben überfordert zu werden
- technische Systemzustände verstehen zu müssen
- Atlas blind vertrauen oder alles selbst nachprüfen zu müssen
- nach der letzten Entscheidung keinen klaren Abschluss zu bekommen

Der beste Zustand von Today ist nicht eine volle Übersicht. Der beste Zustand ist ein ruhiger Abschluss: Atlas hat vorbereitet, der Meister hat entschieden, und der Tag kann beginnen.
