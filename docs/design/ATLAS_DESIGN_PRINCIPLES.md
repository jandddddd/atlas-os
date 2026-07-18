# Atlas Design Principles

## Zweck

Diese Spezifikation beschreibt die Design- und UX-Philosophie von Atlas OS. Sie definiert, wie Atlas wirken, führen und Vertrauen schaffen soll. Sie beschreibt keine React-Komponenten, keine CSS-Regeln und keine technische Implementierung.

Atlas OS ist ein ruhiger Arbeitsraum für Handwerksbetriebe. Das Design reduziert Bürokomplexität, macht Entscheidungen verständlich und lässt die Kontrolle sichtbar beim Menschen.

## Designphilosophie

Atlas vermittelt:

- Ruhe
- Vertrauen
- Klarheit
- Fokus
- Kompetenz

Atlas wirkt wie ein vorbereitender, verlässlicher Assistent. Die Oberfläche zeigt nicht, was technisch möglich ist, sondern was dem Betrieb jetzt hilft. Sie nimmt Informationsdruck heraus, ordnet Inhalte und führt zu den wenigen Entscheidungen, die menschliche Aufmerksamkeit benötigen.

Atlas vermeidet:

- Hektik
- Informationsüberflutung
- Komplexität
- technische Sprache

Designentscheidungen müssen immer beantworten können, welchen konkreten Beitrag sie zu Orientierung, Entscheidungssicherheit oder Entlastung leisten. Alles, was nur Eindruck, Dichte oder dekorative Aktivität erzeugt, gehört nicht in Atlas.

## Informationshierarchie

Atlas zeigt Informationen in einer festen Reihenfolge: erst Entscheidung, dann Kontext, dann Details.

### Was immer zuerst steht

Zuerst erscheinen Informationen, die unmittelbar für Orientierung und Entscheidung notwendig sind:

- die wichtigste anstehende Aufgabe oder Entscheidung
- der betroffene Kunde, Vorgang, Termin oder Arbeitsbereich
- eine kurze Zusammenfassung des Sachverhalts
- der Grund, warum dieser Punkt jetzt relevant ist
- offene Unsicherheiten oder fehlende Angaben, wenn sie die Entscheidung beeinflussen
- die empfohlene nächste Handlung

Der Nutzer soll auf der ersten Ebene verstehen, worum es geht, warum es wichtig ist und was als Nächstes möglich ist.

### Was erst auf Nachfrage erscheint

Details erscheinen erst, wenn der Nutzer sie bewusst öffnen möchte. Dazu gehören:

- längere Begründungen
- ursprüngliche Nachrichten und Verläufe
- zusätzliche Dokumente, Bilder oder Anhänge
- alternative Formulierungen oder Optionen
- fachliche Hinweise und Annahmen
- Auswirkungen auf verbundene Vorgänge
- vollständige Historien und Hintergrundinformationen

Diese zweite Ebene dient der Prüfung. Sie darf die erste Orientierung nicht verdrängen.

### Was bewusst ausgeblendet wird

Atlas blendet Informationen aus, wenn sie keine unmittelbare Entscheidung verbessern. Dazu gehören:

- vollständige Modulübersichten an Stellen, an denen eine Entscheidung im Mittelpunkt steht
- Kennzahlen ohne klare Handlungsrelevanz
- technische Statusmeldungen
- interne Systemlogik
- doppelte oder bereits bekannte Informationen
- Detailtiefe, die nur Vollständigkeit erzeugt

Ausblenden bedeutet nicht Verstecken. Relevante Informationen bleiben auffindbar, treten aber erst dann hervor, wenn sie gebraucht werden.

## Layoutprinzipien

Jeder Bildschirm hat eine erkennbare Hauptaufgabe. Atlas konkurriert nicht um Aufmerksamkeit, sondern führt ruhig durch den nächsten sinnvollen Schritt.

Verbindliche Layoutprinzipien:

- eine Hauptaufgabe pro Bildschirm
- großzügige Abstände
- Karten statt Tabellen, wenn Entscheidungen im Mittelpunkt stehen
- progressive Offenlegung von Details
- klare Trennung zwischen Orientierung, Prüfung und Handlung
- wenige konkurrierende Aktionsmöglichkeiten
- ruhige Abschlusszustände statt endloser Listen

Karten eignen sich für Entscheidungen, weil sie einen Vorgang verständlich zusammenfassen und eine klare Handlung anbieten können. Tabellen sind nur sinnvoll, wenn Vergleichen, Sortieren oder strukturierte Verwaltung im Vordergrund steht. Sobald menschliche Prüfung, Freigabe oder Priorisierung im Mittelpunkt steht, bevorzugt Atlas eine ruhige, erklärende Darstellung.

Großzügige Abstände sind kein dekorativer Luxus. Sie schaffen Lesbarkeit, reduzieren Druck und helfen dem Nutzer, Wichtiges von Nebensächlichem zu unterscheiden.

## Farben

Farben haben in Atlas immer eine Funktion. Sie dürfen niemals rein dekorativ eingesetzt werden.

Jede Farbe muss eine klare Bedeutung tragen, zum Beispiel:

- Handlungsbedarf
- Priorität
- Unsicherheit
- Bestätigung
- Warnung
- neutraler Kontext
- abgeschlossener Zustand

Farben sollen sparsam eingesetzt werden. Eine farbliche Hervorhebung ist nur gerechtfertigt, wenn sie die Entscheidung schneller, sicherer oder verständlicher macht. Wenn Farbe lediglich Aufmerksamkeit erzeugt, ohne den Inhalt zu klären, wird sie nicht verwendet.

Farben ersetzen niemals Text. Wichtige Zustände müssen auch sprachlich verständlich sein, damit Bedeutung nicht allein über visuelle Signale entsteht.

## Typografie

Typografie schafft Hierarchie und Ruhe. Sie hilft dem Nutzer, Inhalte schnell zu erfassen, ohne sich durch lange Texte arbeiten zu müssen.

Die typografische Hierarchie folgt der fachlichen Bedeutung:

- Hauptüberschriften benennen den aktuellen Fokus.
- Entscheidungstitel sind kurz, konkret und handlungsnah.
- Zusammenfassungen erklären den Sachverhalt in wenigen Sätzen.
- Zusatzinformationen treten visuell und sprachlich zurück.
- Hinweise zu Unsicherheit oder Prüfung sind klar erkennbar, aber nicht alarmistisch.

Texte in Atlas sind kurz genug, um im Arbeitsalltag gelesen zu werden. Lange Absätze werden vermieden. Wenn ein Inhalt mehr Erklärung braucht, wird er gegliedert und erst nach Bedarf gezeigt.

Lesbarkeit ist wichtiger als Dichte. Atlas bevorzugt klare Sätze, vertraute Begriffe und eindeutige Aussagen gegenüber kompakten Fachkürzeln oder technischen Bezeichnungen.

## Icons

Icons werden nur verwendet, wenn sie Bedeutung schneller erfassbar machen oder wiederkehrende Zustände verlässlich unterstützen.

Geeignete Einsätze sind:

- Status und Priorität
- Unsicherheit oder Prüfbedarf
- abgeschlossene Schritte
- eindeutige Aktionsgruppen
- wiedererkennbare Bereiche, wenn der Kontext bereits klar ist

Icons werden bewusst nicht verwendet, wenn sie nur dekorieren, Inhalte ersetzen oder mehrere Deutungen zulassen. Ein Icon darf nie die einzige Erklärung einer wichtigen Information sein. Wenn ein Zustand entscheidungsrelevant ist, braucht er eine verständliche sprachliche Begleitung.

Atlas vermeidet Icon-Fülle. Zu viele Symbole erzeugen visuelle Unruhe und lassen die Oberfläche technischer wirken, als sie sein soll.

## Animationen

Animationen sind in Atlas ausschließlich funktional. Sie unterstützen Orientierung, Rückmeldung oder Zustandswechsel.

Zulässige Funktionen sind:

- zeigen, dass eine Aktion abgeschlossen wurde
- verdeutlichen, dass Details geöffnet oder geschlossen wurden
- den Übergang zur nächsten Entscheidung verständlich machen
- verhindern, dass Inhalte sprunghaft oder irritierend wechseln

Nicht zulässig sind dekorative Effekte, verspielt wirkende Bewegungen oder Animationen, die Aufmerksamkeit binden, ohne den Arbeitsfluss zu verbessern. Atlas bewegt sich ruhig, kurz und zweckgebunden.

## Sprache

Atlas spricht:

- ruhig
- respektvoll
- verständlich
- präzise

Die Sprache ist nah am Arbeitsalltag des Handwerks. Atlas formuliert so, dass Betriebsinhaber, Büro und Team schnell verstehen, was gemeint ist. Aussagen sind konkret, handlungsorientiert und frei von technischer Selbstdarstellung.

Atlas verwendet keine technischen Begriffe, wenn eine alltagsnahe Formulierung möglich ist. Begriffe wie Validierung, Konfidenz, Datensatz, Modell, Workflow-Engine oder Systemfehler gehören nicht in die Nutzerführung.

Atlas drängt nicht und übertreibt nicht. Die Oberfläche soll weder alarmistisch noch werblich klingen. Sie macht klar, was ansteht, was vorbereitet wurde, wo Unsicherheit besteht und welche Entscheidung benötigt wird.

## Vertrauen

Design schafft Vertrauen, indem Atlas nachvollziehbar, ehrlich und kontrollierbar bleibt.

Vertrauen entsteht durch:

- klare Begründungen für Vorschläge
- sichtbare Unsicherheiten statt versteckter Lücken
- eindeutige nächste Schritte
- verständliche Konsequenzen vor verbindlichen Aktionen
- ruhige Bestätigung nach erledigten Entscheidungen
- sparsame Hervorhebung von Risiken und Prioritäten
- erkennbare menschliche Kontrolle bei Freigaben und externer Kommunikation

Atlas darf nicht so wirken, als wisse es alles oder entscheide allein. Wenn Informationen fehlen, sagt Atlas das klar. Wenn eine Annahme nötig ist, wird sie als Annahme erkennbar. Wenn ein Schritt verbindlich ist, muss die Handlung bewusst bestätigt werden.

Vertrauen entsteht auch durch Zurückhaltung. Atlas zeigt nicht alles, nur weil es vorhanden ist. Die Oberfläche beweist Kompetenz, indem sie Wichtiges auswählt, Nebensächliches zurückstellt und den Nutzer nicht mit Systemwissen belastet.

## Nicht-Ziele

Atlas soll sich niemals anfühlen wie:

- ein ERP
- ein CRM
- ein Dashboard
- ein Analysewerkzeug

Atlas ist keine Verwaltungszentrale voller Tabellen, Kennzahlen und Modulnavigation. Atlas ist kein Kontrollraum und kein Reporting-System. Atlas soll den Betrieb nicht dazu bringen, mehr Software zu bedienen, sondern weniger Reibung im Alltag zu spüren.

Das Design darf deshalb nicht auf Vollständigkeit, Datenfülle oder technische Mächtigkeit optimieren. Es muss auf Ruhe, Entscheidungsfähigkeit und Vertrauen optimieren.
