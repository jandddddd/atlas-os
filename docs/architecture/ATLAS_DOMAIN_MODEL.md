# Atlas Domain Model

## Zweck

Dieses Dokument beschreibt das fachliche Domain Model von Atlas OS. Es schafft eine gemeinsame Sprache für Produkt, Design und Entwicklung und erklärt die zentralen Begriffe, ihre Bedeutung und ihre Beziehungen im Arbeitsalltag eines Handwerksbetriebs.

Das Modell beschreibt keine technische Umsetzung. Es definiert keine Datenbankstruktur, keine APIs, keine TypeScript-Typen, keine Klassen und keine Benutzeroberflächen. Es beschreibt ausschließlich, wie Atlas OS die fachliche Welt eines Betriebs versteht.

## Leitbild der Domäne

Atlas OS verwaltet keine isolierten Datensätze. Atlas verbindet Kunden, Projekte, Vorgänge, Kommunikation, Dokumentation, Aufgaben, Entscheidungen und Freigaben zu einem verständlichen Arbeitskontext.

Das Projekt ist der zentrale operative Kontext. Es bündelt die Informationen, die im Betrieb benötigt werden, um eine Anfrage, eine Baustelle, eine Leistung oder einen laufenden Kundenauftrag nachvollziehbar zu planen, auszuführen und abzuschließen.

Die tägliche Arbeit entsteht nicht nur aus Listen, sondern aus Handlungsbedarf: Aufgaben müssen erledigt, Entscheidungen getroffen, Freigaben erteilt, Rückfragen geklärt und Ereignisse nachvollziehbar dokumentiert werden. Atlas unterstützt diese Arbeit, indem es Informationen ordnet, Zusammenhänge erkennt, nächste Schritte vorbereitet und menschliche Verantwortung sichtbar respektiert.

## Zentrale Domänenobjekte

### Kunde

Ein Kunde ist die fachliche Einheit, mit der der Betrieb eine Geschäftsbeziehung führt. Das kann eine Privatperson, eine Familie, eine Hausverwaltung, ein Unternehmen oder eine andere Organisation sein.

Typische Informationen zu einem Kunden sind:

- Name oder Bezeichnung
- Rechnungs- und Kontaktadresse
- Kontaktdaten
- bevorzugte Kommunikationswege
- allgemeine Hinweise zur Zusammenarbeit
- bisherige Projekte, Angebote, Rechnungen und Kommunikation
- wiederkehrende Präferenzen oder Besonderheiten, soweit sie fachlich relevant sind

Ein Kunde kann einen oder mehrere Ansprechpartner haben. Bei Privatkunden kann Kunde und Ansprechpartner im Alltag identisch wirken. Fachlich bleiben sie dennoch unterscheidbar: Der Kunde ist die Geschäftsbeziehung, der Ansprechpartner ist die konkrete Person, mit der kommuniziert oder abgestimmt wird.

Ein Kunde kann mehrere Projekte haben. Ein Projekt gehört in der Regel zu genau einem Kunden. Ausnahmen sind möglich, etwa wenn eine Hausverwaltung für mehrere Eigentümer handelt oder ein Projekt zunächst aus einer anonymen Anfrage entsteht. Solche Ausnahmen sollten fachlich klar markiert werden, damit Verantwortlichkeiten nicht verwischt werden.

### Ansprechpartner

Ein Ansprechpartner ist eine konkrete Person, mit der der Betrieb kommuniziert oder Abstimmungen trifft. Er kann zu einem Kunden gehören, einem Projekt zugeordnet sein oder für einen bestimmten Vorgang zuständig sein.

Typische Informationen zu einem Ansprechpartner sind:

- Name
- Rolle oder Funktion
- Telefonnummer, E-Mail-Adresse oder sonstiger Kommunikationsweg
- Zugehörigkeit zu Kunde, Projekt oder externer Organisation
- Zuständigkeit für bestimmte Themen
- Erreichbarkeit oder bevorzugte Kontaktart

Ansprechpartner können unterschiedliche Zuständigkeiten haben. Eine Person kann zum Beispiel den Termin koordinieren, während eine andere Person Angebote freigibt oder Rechnungen erhält. Atlas darf diese Rollen nicht stillschweigend gleichsetzen.

Ein Ansprechpartner ist nicht automatisch der Kunde. Besonders bei Hausverwaltungen, Unternehmen, Vermietern, Mietern, Architekten oder Bauleitungen ist die Unterscheidung wichtig, weil Kommunikation, fachliche Abstimmung, Zahlungspflicht und Freigabe nicht bei derselben Person liegen müssen.

### Projekt

Ein Projekt ist der zentrale Arbeitskontext in Atlas OS. Es bündelt alle Informationen, die für einen konkreten Vorgang im Betrieb operativ relevant sind: von der Anfrage über Angebot, Planung und Ausführung bis zur Dokumentation, Abrechnung und Nachbereitung.

Ein Projekt kann enthalten:

- Kunde
- einen oder mehrere Ansprechpartner
- Adresse oder Einsatzort
- fachlichen Status
- Termine und Zeiträume
- Aufgaben
- Angebote
- Rechnungen
- Nachträge
- Dokumente
- Fotos
- Kommunikation
- Materialbedarf
- Entscheidungen
- Freigaben
- Ereignisse

Das Projekt beantwortet fachlich die Frage: „Worum geht es in diesem Arbeitszusammenhang, wer ist beteiligt, was ist vereinbart, was ist offen und was ist zuletzt passiert?“

Nicht direkt zum Projekt gehören allgemeine Betriebsstammdaten, personenbezogene Informationen ohne Bezug zum Vorgang, allgemeine Lieferantenkataloge, interne Unternehmenskennzahlen ohne Projektbezug, Buchhaltungsdetails, Lohnabrechnung und technische Systeminformationen. Solche Informationen können einen Projektbezug haben, sind aber nicht Teil des operativen Projektkontexts selbst.

Ein Projekt muss nicht erst mit einem bestätigten Auftrag beginnen. Es kann bereits aus einer qualifizierten Anfrage, einer Besichtigung oder einem Angebotsvorgang entstehen, wenn genügend Kontext vorhanden ist, um Informationen sinnvoll zusammenzuhalten.

### Aufgabe

Eine Aufgabe ist eine konkrete auszuführende Arbeit. Sie beschreibt, was getan werden soll, wer verantwortlich ist, bis wann es erledigt sein soll und in welchem Status sie sich befindet.

Typische Informationen zu einer Aufgabe sind:

- konkrete Handlung
- Verantwortliche Person oder Rolle
- Fälligkeit oder gewünschter Zeitpunkt
- Priorität, falls fachlich relevant
- Status
- Bezug zu Projekt, Kunde, Angebot, Termin oder Kommunikation
- Herkunft, etwa aus einer Nachricht, Entscheidung oder Freigabe

Eine Aufgabe kann zu einem Projekt gehören. Sie kann außerdem aus einer Entscheidung entstehen oder zur Vorbereitung einer Entscheidung dienen. Beispiel: „Fehlende Wandhöhe beim Kunden erfragen“ ist eine Aufgabe, wenn klar ist, was zu tun ist.

Eine Aufgabe ist nicht dasselbe wie eine Entscheidung. Eine Aufgabe verlangt Ausführung; eine Entscheidung verlangt eine Auswahl zwischen Handlungsoptionen. „Kundenantwort senden“ ist eine Aufgabe, wenn Inhalt und Freigabe geklärt sind. „Soll diese Kundenantwort so versendet werden?“ ist eine Entscheidung.

### Entscheidung

Eine Entscheidung ist ein Vorgang, bei dem zwischen Handlungsoptionen gewählt werden muss. Atlas kann eine Entscheidung vorbereiten, aber die fachliche Verantwortung bleibt beim Menschen, wenn der Schritt verbindlich, unsicher oder nach außen wirksam ist.

Eine Entscheidung umfasst fachlich:

- betroffenen Kontext, meist Projekt, Kunde, Angebot, Termin oder Kommunikation
- konkrete Entscheidungsfrage
- mögliche Handlungsoptionen
- Vorschlag von Atlas
- Begründung des Vorschlags
- sichtbare Unsicherheit oder fehlende Angaben
- benötigte Freigabe, falls erforderlich
- Ergebnis der menschlichen Entscheidung
- Lernsignal für zukünftige Vorschläge

Entscheidungen sind besonders wichtig, weil Atlas OS nicht nur Arbeit sammelt, sondern Arbeit vorbereitet. Eine Entscheidung macht sichtbar, wo der Betrieb bewusst handeln muss.

Eine Entscheidung ist nicht automatisch eine Aufgabe. Aus einer Entscheidung können Aufgaben entstehen, aber die Entscheidung selbst ist die Auswahl: freigeben, ändern, ablehnen, zurückstellen oder Rückfrage stellen.

### Freigabe

Eine Freigabe ist die bewusste Bestätigung durch einen verantwortlichen Menschen. Sie macht einen vorbereiteten Vorschlag, Entwurf oder Vorgang verbindlich genug, um den nächsten Schritt auszulösen.

Mögliche Ergebnisse einer Freigabe sind:

- Freigabe ohne Änderung: Der Vorschlag passt und darf umgesetzt werden.
- Freigabe mit Änderung: Der Vorschlag ist grundsätzlich brauchbar, wird aber vor Umsetzung angepasst.
- Ablehnung: Der Vorschlag wird nicht umgesetzt.
- Rückfrage: Die Entscheidung ist noch nicht reif; es müssen Informationen geklärt werden.

Eine Freigabe bezieht sich immer auf eine konkrete Entscheidung oder einen konkreten Vorgang, zum Beispiel ein Angebot, eine Kundenantwort, eine Terminbestätigung, einen Nachtrag oder eine Bestellung.

Freigabe und Entscheidung sind nicht dasselbe. Die Entscheidung ist die fachliche Auswahl zwischen Optionen. Die Freigabe ist die verantwortliche Bestätigung, dass ein bestimmter nächster Schritt ausgeführt werden darf.

### Angebot

Ein Angebot ist ein fachlicher Vorschlag des Betriebs an den Kunden, welche Leistungen zu welchen Bedingungen erbracht werden sollen. Es ist eng mit Kunde und Projekt verbunden und kann aus einer Anfrage, Besichtigung, Kommunikation oder vorhandenen Projektinformationen entstehen.

Ein Angebot kann Versionen und Änderungen haben. Fachlich relevant ist, welche Version aktuell geprüft wird, welche Annahmen enthalten sind, welche Angaben fehlen und welche Änderungen gegenüber früheren Versionen vorgenommen wurden.

Typische Zustände eines Angebots sind Entwurf, in Prüfung, freigegeben, versendet, angenommen, abgelehnt, überarbeitet oder abgelaufen. Vor dem Versand benötigt ein Angebot eine menschliche Freigabe, weil Preise, Leistungsumfang, Annahmen und Außenwirkung verbindlich sein können.

Ein angenommenes Angebot kann zur Grundlage eines Projekts werden oder ein bestehendes Projekt in einen beauftragten Zustand führen. Das Angebot bleibt dabei als fachlicher Nachweis des vereinbarten Leistungsumfangs relevant.

### Auftrag

Atlas OS behandelt den Auftrag fachlich nicht als vollständig eigenes Domänenobjekt, sondern als bestätigte Grundlage beziehungsweise Zustand eines Projekts.

Begründung: In einem kleinen oder mittleren Handwerksbetrieb wird der operative Alltag meist über Baustellen und Projekte gesteuert. Sobald ein Angebot angenommen oder eine Leistung verbindlich beauftragt wurde, ändert sich vor allem der Projektkontext: aus Vorbereitung wird Ausführung, Termine werden verbindlicher, Materialbedarf wird konkreter, Aufgaben werden operativ und spätere Nachträge beziehen sich auf den ursprünglichen Leistungsumfang.

Ein separates Objekt „Auftrag“ würde im frühen Produkt unnötig zwischen Angebot und Projekt vermitteln und könnte die zentrale Rolle des Projekts schwächen. Fachlich entscheidend ist nicht eine weitere Verwaltungseinheit, sondern die klare Kennzeichnung, dass ein Projekt auf einer bestätigten Beauftragung beruht.

Daher gilt:

- Ein Projekt kann vor Beauftragung bestehen.
- Ein Projekt kann durch Annahme eines Angebots oder eine andere bestätigte Beauftragung beauftragt werden.
- Die beauftragte Grundlage bestimmt den ursprünglichen Leistungsumfang.
- Nachträge verändern oder ergänzen diese Grundlage.

Sollten spätere gewerke- oder betriebsbezogene Anforderungen eine tiefere Auftragsverwaltung verlangen, kann diese fachliche Entscheidung überprüft werden. Für Atlas OS bleibt zunächst das Projekt der operative Kern.

### Rechnung

Eine Rechnung beschreibt die Abrechnung erbrachter oder vereinbarter Leistungen gegenüber einem Kunden. Sie bezieht sich fachlich auf ein Projekt, den Kunden und den relevanten Leistungsumfang.

Atlas betrachtet Rechnungen auf operativer Ebene, nicht als Buchhaltungssystem. Relevant sind:

- Bezug zu Projekt und Kunde
- abgerechnete Leistungen oder Teilbereiche
- Entwurf
- Prüfung
- Freigabe
- Versand
- Zahlungsstatus
- offene Rückfragen oder Korrekturen

Eine Rechnung kann aus Projektinformationen vorbereitet werden, muss aber vor Versand geprüft und freigegeben werden. Buchhaltungsdetails, Steuerberatung, Kontierung und rechtsverbindliche Finanzprozesse gehören nicht zum Domain Model von Atlas OS.

### Nachtrag

Ein Nachtrag beschreibt eine zusätzliche oder geänderte Leistung gegenüber dem ursprünglich vereinbarten Leistungsumfang. Er entsteht typischerweise durch neue Kundenwünsche, zusätzliche Schäden, geänderte Bedingungen vor Ort oder fachlich notwendige Anpassungen.

Ein Nachtrag gehört zu einem Projekt und bezieht sich auf die ursprüngliche Projekt- oder Angebotsgrundlage. Er kann Auswirkungen auf Preis, Termine, Materialbedarf, Aufgaben und Kommunikation haben.

Ein Nachtrag benötigt vor verbindlicher Kommunikation oder Ausführung eine Freigabe. Atlas muss klar machen, welche Änderung vorgeschlagen wird, warum sie entstanden ist, welche Annahmen bestehen und welche Auswirkungen auf Kosten oder Termine möglich sind. Unsichere Werte dürfen nicht scheinpräzise dargestellt werden.

### Termin

Ein Termin beschreibt einen Zeitpunkt oder Zeitraum, an dem eine Abstimmung, Besichtigung, Ausführung, Lieferung oder andere projektbezogene Aktivität stattfinden soll.

Typische Informationen zu einem Termin sind:

- Zeitpunkt oder Zeitraum
- Beteiligte
- Ort oder Einsatzort
- Projekt- oder Kundenbezug
- Zweck des Termins
- Bestätigung
- Konflikte, Abhängigkeiten und Änderungen

Ein Termin kann vorgeschlagen, angefragt, bestätigt, verschoben, abgesagt oder erledigt sein. Änderungen an Terminen sind fachlich relevante Ereignisse, weil sie Auswirkungen auf Kunden, Mitarbeitende, Material und andere Projekte haben können.

Ein Termin ist nicht dasselbe wie eine Aufgabe. Ein Termin reserviert Zeit und Ort. Eine Aufgabe beschreibt eine zu erledigende Handlung. „Besichtigung am Dienstag um 10 Uhr“ ist ein Termin. „Besichtigung vorbereiten“ ist eine Aufgabe.

### Kommunikation

Kommunikation umfasst fachliche Nachrichten und Gesprächsinhalte, die für Kunden, Projekte oder andere Vorgänge relevant sind. Dazu gehören E-Mails, Nachrichten, Telefonnotizen und Gesprächszusammenfassungen.

Kommunikation soll nicht isoliert abgelegt werden. Sie muss einem fachlichen Kontext zugeordnet werden können, zum Beispiel:

- Kunde
- Projekt
- Angebot
- Entscheidung
- Freigabe
- Termin
- Nachtrag
- Rechnung

Kommunikation kann neue Informationen liefern, Entscheidungen auslösen, Aufgaben erzeugen, Freigaben vorbereiten oder Ereignisse dokumentieren. Atlas soll Kommunikation zusammenfassen und einordnen, darf aber verbindliche externe Kommunikation nur nach angemessener Freigabe versenden.

### Dokument

Ein Dokument ist eine fachliche Datei oder Unterlage, die für einen Kunden, ein Projekt oder einen Vorgang relevant ist. Beispiele sind Angebotsunterlagen, Pläne, Leistungsbeschreibungen, Freigaben, Protokolle, Rechnungsunterlagen oder sonstige Nachweise.

Typische Informationen zu einem Dokument sind:

- fachlicher Typ
- Herkunft, etwa Kunde, Betrieb, Lieferant oder Atlas-Entwurf
- Bezug zu Kunde, Projekt oder Vorgang
- Version oder Stand
- Freigabestatus, falls relevant
- kurze fachliche Einordnung

Dokumente unterstützen Nachvollziehbarkeit. Sie ersetzen nicht die Entscheidung oder Freigabe selbst, können aber deren Grundlage oder Nachweis sein.

### Foto

Atlas OS behandelt Fotos fachlich als eigenes Domänenobjekt mit enger Beziehung zu Dokumenten.

Begründung: Fotos sind zwar Dateien, haben im Handwerksalltag aber eine besondere Bedeutung. Sie dokumentieren Zustände vor Ort, Schäden, Vorher-/Nachher-Situationen, Arbeitsfortschritt, Ausführungsdetails und Leistungsnachweise. Ihr Wert entsteht oft aus zeitlicher und örtlicher Einordnung, nicht nur aus dem Dateiinhalt.

Ein Foto kann zusätzlich als Dokument abgelegt oder in einer Dokumentensammlung erscheinen. Fachlich muss es jedoch gesondert verstanden werden, weil folgende Informationen zentral sind:

- Projekt- oder Einsatzortbezug
- Aufnahmezeitpunkt
- aufgenommenes Objekt oder Bereich
- Anlass, etwa Schaden, Vorher-Zustand, Nachher-Zustand oder Nachweis
- Bezug zu Aufgabe, Nachtrag, Rechnung, Kommunikation oder Entscheidung
- fachliche Einordnung und Unsicherheit, falls der Bildinhalt nicht eindeutig ist

Atlas darf aus Fotos Hinweise ableiten, soll aber keine belastbaren Maße, Mengen, Schäden oder Leistungsbewertungen erfinden. Bei unklarer Grundlage braucht es menschliche Prüfung.

### Materialbedarf

Materialbedarf beschreibt, welches Material für ein Projekt voraussichtlich benötigt wird. Er ist eine fachliche Planungs- und Klärungsgröße, noch keine verbindliche Beschaffung.

Typische Informationen zu Materialbedarf sind:

- benötigtes Material
- Menge oder Mengenspanne, soweit belastbar bekannt
- Projektbezug
- gewünschter Termin oder Einsatzzeitpunkt
- Lieferantenvorschlag oder bevorzugte Bezugsquelle
- offener Klärungsbedarf
- Bestellstatus
- benötigte Freigabe

Materialbedarf kann aus Angebot, Projektplanung, Fotos, Notizen oder Kommunikation entstehen. Unsichere Mengen oder Annahmen müssen als solche erkennbar bleiben.

Materialbedarf ist nicht dasselbe wie eine Bestellung. Materialbedarf beschreibt, was benötigt wird. Eine Bestellung ist die verbindliche Beschaffung bei einem Lieferanten.

### Bestellung

Eine Bestellung ist eine verbindliche Beschaffung von Material oder Leistungen bei einem Lieferanten. Sie bezieht sich in der Regel auf einen oder mehrere Materialbedarfe und auf ein Projekt.

Typische Informationen zu einer Bestellung sind:

- zugehöriger Materialbedarf
- Lieferant
- bestellte Positionen
- Kosten oder Kostenrahmen, soweit bekannt
- Liefertermin oder gewünschter Lieferzeitpunkt
- Lieferadresse oder Abholort
- Freigabe
- Status

Eine Bestellung kann vorbereitet werden, benötigt aber vor verbindlicher Auslösung eine Freigabe, wenn finanzielle Verpflichtungen, Liefertermine oder projektkritische Auswirkungen entstehen. Atlas darf Lieferantenvorschläge oder Bestellentwürfe vorbereiten, aber keine finanziell verbindliche Beschaffung ohne angemessene menschliche Kontrolle auslösen.

### Ereignis

Ein Ereignis ist eine fachlich relevante Veränderung oder Aktivität. Ereignisse bilden die nachvollziehbare Historie eines Projekts und anderer Vorgänge.

Beispiele für Ereignisse sind:

- Angebot erstellt
- Angebot freigegeben
- Termin verschoben
- Freigabe erteilt
- Freigabe abgelehnt
- Dokument hochgeladen
- Foto hinzugefügt
- Kundenantwort eingegangen
- Aufgabe erledigt
- Nachtrag angelegt
- Bestellung versendet
- Rechnung freigegeben

Ereignisse erklären, was passiert ist, wann es passiert ist, worauf es sich bezieht und welche fachliche Bedeutung es hat. Ein Ereignis ist keine aktuelle Eigenschaft, sondern ein historischer Nachweis. Zusammen ergeben Ereignisse den Verlauf eines Projekts.

## Beziehungen der Domäne

Die wichtigsten Beziehungen sind:

- Ein Kunde kann mehrere Projekte haben.
- Ein Projekt gehört in der Regel zu einem Kunden.
- Ein Projekt kann mehrere Ansprechpartner haben.
- Ein Ansprechpartner kann allgemeiner Kundenkontakt oder projektspezifisch zuständig sein.
- Aufgaben können zu einem Projekt gehören und aus Kommunikation, Entscheidungen oder Freigaben entstehen.
- Aufgaben können eine Entscheidung vorbereiten oder das Ergebnis einer Entscheidung ausführen.
- Entscheidungen können Freigaben erfordern.
- Eine Freigabe bezieht sich auf eine konkrete Entscheidung oder einen konkreten Vorgang.
- Angebote, Rechnungen, Nachträge, Termine, Dokumente, Fotos, Materialbedarf, Bestellungen und Kommunikation können einem Projekt zugeordnet sein.
- Ein Angebot kann zur beauftragten Grundlage eines Projekts werden.
- Ein Nachtrag bezieht sich auf den ursprünglichen Leistungsumfang eines beauftragten Projekts.
- Eine Bestellung bezieht sich in der Regel auf einen Materialbedarf.
- Ereignisse dokumentieren relevante Änderungen an diesen Objekten.
- Lernsignale entstehen aus menschlichen Entscheidungen, Änderungen, Freigaben, Ablehnungen und Rückfragen.

Sinnvolle Ausnahmen sind möglich. Eine Kommunikation kann zunächst ohne Projektbezug eingehen und erst später zugeordnet werden. Ein Projekt kann vorübergehend ohne vollständig geklärten Kunden bestehen, wenn eine Anfrage noch unvollständig ist. Ein Ansprechpartner kann mehreren Projekten desselben Kunden zugeordnet sein. Solche Ausnahmen sollen die Arbeit erleichtern, dürfen aber Verantwortlichkeiten und fachliche Zusammenhänge nicht dauerhaft unklar lassen.

## Lebenszyklen

Die folgenden Zustände sind fachliche Orientierungspunkte. Sie sind keine technischen Statuscodes.

### Projekt

Typische Projektzustände:

- Anfrage oder Eingang wird geprüft
- Projekt wird vorbereitet
- Angebot wird erstellt oder geprüft
- beauftragt
- geplant
- in Ausführung
- blockiert oder wartet auf Rückmeldung
- abgeschlossen
- nachbereitet oder abgerechnet
- archiviert

### Aufgabe

Typische Aufgabenzustände:

- vorgeschlagen
- offen
- in Bearbeitung
- wartet auf Rückmeldung
- erledigt
- verworfen
- überfällig

### Entscheidung

Typische Entscheidungszustände:

- erkannt
- vorbereitet
- prüfbereit
- wartet auf Freigabe
- entschieden
- zurückgestellt
- durch Rückfrage blockiert
- überholt

### Freigabe

Typische Freigabezustände:

- angefordert
- in Prüfung
- ohne Änderung erteilt
- mit Änderung erteilt
- abgelehnt
- Rückfrage erforderlich
- zurückgezogen oder nicht mehr relevant

### Angebot

Typische Angebotszustände:

- in Vorbereitung
- Entwurf
- in Prüfung
- freigegeben
- versendet
- vom Kunden angenommen
- vom Kunden abgelehnt
- überarbeitet
- abgelaufen

### Rechnung

Typische Rechnungszustände:

- vorbereitet
- Entwurf
- in Prüfung
- freigegeben
- versendet
- offen
- teilweise bezahlt
- bezahlt
- Klärung erforderlich
- storniert oder ersetzt

### Nachtrag

Typische Nachtragszustände:

- erkannt
- in Klärung
- Entwurf
- in Prüfung
- freigegeben
- dem Kunden vorgelegt
- angenommen
- abgelehnt
- umgesetzt

### Materialbedarf

Typische Materialbedarfszustände:

- erkannt
- in Klärung
- geplant
- zur Bestellung vorgeschlagen
- freigegeben zur Beschaffung
- bestellt
- teilweise gedeckt
- gedeckt
- nicht mehr benötigt

### Bestellung

Typische Bestellzustände:

- vorbereitet
- in Prüfung
- freigegeben
- versendet
- bestätigt
- unterwegs oder abholbereit
- teilweise geliefert
- geliefert
- geändert
- storniert
- Klärung erforderlich

## Fachliche Abgrenzungen

### Kunde vs. Ansprechpartner

Der Kunde ist die Geschäftsbeziehung. Der Ansprechpartner ist die konkrete Person, mit der gesprochen oder abgestimmt wird. Ein Kunde kann mehrere Ansprechpartner haben, und ein Ansprechpartner muss nicht zahlungspflichtig oder freigabeberechtigt sein.

### Projekt vs. Auftrag

Das Projekt ist der operative Arbeitskontext. Der Auftrag ist in Atlas OS zunächst kein eigenes Domänenobjekt, sondern die bestätigte Grundlage oder der beauftragte Zustand eines Projekts. Dadurch bleibt der Arbeitsalltag um Projekte und Baustellen organisiert, ohne eine zusätzliche Verwaltungsebene einzuführen.

### Aufgabe vs. Entscheidung

Eine Aufgabe beschreibt eine auszuführende Handlung. Eine Entscheidung beschreibt eine notwendige Auswahl zwischen Optionen. Aus einer Entscheidung kann eine Aufgabe entstehen, aber eine Aufgabe ersetzt nicht die Entscheidung.

### Entscheidung vs. Freigabe

Die Entscheidung ist der fachliche Wahlvorgang. Die Freigabe ist die bewusste menschliche Bestätigung, dass ein bestimmter Vorschlag oder nächster Schritt umgesetzt werden darf.

### Materialbedarf vs. Bestellung

Materialbedarf beschreibt, was voraussichtlich benötigt wird. Eine Bestellung ist die verbindliche Beschaffung bei einem Lieferanten. Bedarf kann unsicher oder in Klärung sein; Bestellung erzeugt eine externe Verpflichtung.

### Termin vs. Aufgabe

Ein Termin beschreibt Zeit, Ort und Beteiligte. Eine Aufgabe beschreibt, was getan werden muss. Termine können Aufgaben auslösen, und Aufgaben können Termine vorbereiten, aber sie sind fachlich verschieden.

### Dokument vs. Foto

Ein Dokument ist eine fachliche Unterlage oder Datei. Ein Foto ist fachlich ein eigenes Objekt, weil es Zustände vor Ort dokumentiert und zeitlich, örtlich und inhaltlich eingeordnet werden muss. Fotos können zusätzlich wie Dokumente abgelegt werden, dürfen aber nicht auf „Datei“ reduziert werden.

### Angebot vs. Nachtrag

Ein Angebot beschreibt den vorgeschlagenen ursprünglichen Leistungsumfang oder eine Angebotsversion vor Beauftragung. Ein Nachtrag beschreibt zusätzliche oder geänderte Leistungen gegenüber einer bereits vereinbarten Grundlage.

### Status vs. Ereignis

Ein Status beschreibt den aktuellen fachlichen Zustand eines Objekts. Ein Ereignis beschreibt, was zu einem bestimmten Zeitpunkt passiert ist. Der Status ist Momentaufnahme; Ereignisse sind Historie.

## Atlas und die Domäne

Atlas arbeitet mit den Domänenobjekten als fachlichem Kontext, nicht als Selbstzweck.

Atlas sammelt Informationen aus Kommunikation, Dokumenten, Fotos, Projekten, Angeboten, Terminen und Aufgaben. Es ordnet diese Informationen Kunden, Projekten und Vorgängen zu und erkennt Zusammenhänge, Abhängigkeiten, Lücken und Widersprüche.

Atlas bereitet Entscheidungen vor, indem es Vorschläge formuliert, Begründungen liefert, Unsicherheiten sichtbar macht und klare nächste Schritte anbietet. Wenn ein Schritt verbindlich, extern wirksam, fachlich unsicher oder schwer rückgängig zu machen ist, fordert Atlas eine Freigabe an.

Atlas kann Aufgaben oder nächste Schritte vorschlagen und freigegebene Routinevorgänge ausführen, sofern der Mensch die Kontrolle behält und die Ausführung fachlich erwartbar ist. Nach relevanten Aktivitäten dokumentiert Atlas Ereignisse, damit der Verlauf eines Projekts nachvollziehbar bleibt.

Atlas lernt aus menschlichen Änderungen, Freigaben, Ablehnungen und Rückfragen. Diese Lernsignale helfen, zukünftige Vorschläge besser vorzubereiten. Lernen bedeutet jedoch nicht, dass Atlas die fachliche Verantwortung übernimmt.

Atlas bleibt Assistent. Die Verantwortung für verbindliche fachliche, finanzielle, terminliche und externe Entscheidungen bleibt beim Betriebsinhaber oder einer anderen verantwortlichen Person im Betrieb.

## Nicht-Ziele

Dieses Dokument definiert nicht:

- technische Speicherung
- Datenbankstruktur
- APIs
- Benutzeroberflächen
- konkrete KI-Modelle
- Buchhaltung oder Steuerrecht
- vollständige ERP-Funktionalität
- Implementierungsdetails oder technische Architektur

## Erfolgskriterien

Das Domain Model ist erfolgreich, wenn:

- dieselben Begriffe im gesamten Produkt einheitlich verwendet werden
- neue Features eindeutig einem fachlichen Kontext zugeordnet werden können
- Aufgabe, Entscheidung und Freigabe nicht verwechselt werden
- das Projekt als zentraler Arbeitskontext verständlich ist
- Kunden, Ansprechpartner, Angebote, Nachträge, Materialbedarf und Bestellungen fachlich sauber abgegrenzt sind
- spätere technische Modelle aus der fachlichen Beschreibung abgeleitet werden können, ohne dass dieses Dokument selbst technisch wird
