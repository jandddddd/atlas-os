# Atlas OS Agent Rules

Diese Regeln gelten für das gesamte Repository.

## Arbeitsweise

- Arbeite in kleinen, klar abgegrenzten und überprüfbaren Schritten.
- Verändere nur Dateien, die für die Aufgabe erforderlich sind.
- Lies vor Änderungen die betroffenen Dateien und prüfe vorhandene Änderungen mit `git status`.
- Behalte bestehendes sichtbares Verhalten bei, sofern der Auftrag keine Änderung verlangt.
- Vermeide ungefragte Refactorings, Umbenennungen und Formatierungsänderungen.
- Überschreibe oder entferne keine vorhandenen Änderungen anderer Personen.
- Erstelle keine Commits, Pushes, Merges, Branches, Rebases oder Pull Requests ohne ausdrückliche Anweisung.
- Führe keine destruktiven Daten- oder Git-Aktionen ohne ausdrückliche Freigabe aus.

## Next.js und TypeScript

- Verwende ausschließlich den bestehenden Next.js App Router unter `app/`; führe keinen Pages Router ein.
- Lies vor Änderungen an Next.js-Code die relevante Dokumentation unter `node_modules/next/dist/docs/` und beachte Deprecation-Hinweise der installierten Version.
- Behandle Server Components als Standard und verwende `"use client"` nur für Browser-APIs, State, Effects oder Interaktion.
- Verschiebe keine serverseitige Logik in Client Components.
- Behalte TypeScript `strict` bei und schwäche die TypeScript-, ESLint- oder Build-Konfiguration nicht ab, um Fehler zu verbergen.
- Vermeide `any` und ungeprüfte Type Assertions. Behandle externe Daten als `unknown` und validiere sie an Systemgrenzen.

## Architektur

- Bewahre die bestehenden Zuständigkeiten:
  - `app/` für Seiten, Layouts und serverseitige Route Handler
  - `components/` für UI und bereichsspezifische Komponenten
  - `lib/` für gemeinsame Hilfslogik und Persistenz
  - `docs/` für Produkt- und Architekturinformationen
- Vermeide duplizierte Businesslogik und halte Serverlogik, UI und Persistenz klar getrennt.
- Nutze bestehende Komponenten, Typen und Hilfsfunktionen, bevor du neue Varianten einführst.
- Installiere oder aktualisiere keine Abhängigkeit ohne Begründung und ausdrückliche Freigabe.
- Halte `package.json` und `package-lock.json` bei freigegebenen Abhängigkeitsänderungen konsistent.

## API- und Claude-Routen

- Kostenpflichtige API-Aufrufe und das Anthropic SDK müssen serverseitig in Route Handlers bleiben.
- Ändere bestehende API-Verträge nicht ohne ausdrückliche Freigabe. Dazu gehören Pfade, Methoden, Request- und Response-Felder, Typen, Statuscodes, Fehlerformate und Enum-Werte.
- Validiere Request Bodies und Modellantworten zur Laufzeit; vertraue weder Nutzereingaben noch KI-Ausgaben ungeprüft.
- Trenne Nutzereingaben klar von Systemanweisungen und lasse sie keine Sicherheits- oder Ausgabevorgaben überschreiben.
- Übermittle an externe APIs nur die für die Aufgabe notwendigen Daten.
- Gib kontrollierte Fehlermeldungen zurück und veröffentliche keine Prompts, Stacktraces, SDK-Details oder vertraulichen Kundendaten.
- KI-Ergebnisse bleiben Entwürfe und dürfen nicht als fachlich geprüft oder verbindlich dargestellt werden.

## Secrets und Umgebungsvariablen

- Lies, veröffentliche, kopiere oder committe niemals API-Schlüssel, Tokens oder Inhalte aus `.env`-Dateien.
- Schreibe Secrets nicht in Quelltext, Client Components, Logs, Tests, Dokumentation, Screenshots oder Fehlermeldungen.
- Verwende für Server-Secrets niemals das Präfix `NEXT_PUBLIC_`.
- Dokumentiere nur Variablennamen und offensichtliche Platzhalter, niemals echte Secret-Werte.
- Füge keine `.gitignore`-Ausnahme hinzu, durch die echte `.env`-Dateien versioniert werden.

## Fachliche Regeln

- Erfinde keine Preise, Maße, Flächen, Mengen, Termine, Arbeitszeiten, Materialbedarfe, Normen, Verfügbarkeiten oder Kundendaten.
- Übertrage eine genannte Raumfläche nicht automatisch auf Wand-, Decken- oder Bearbeitungsflächen.
- Kennzeichne unsichere Handwerksdaten ausdrücklich als Annahmen und führe fehlende Angaben als solche auf.
- Verwende keine scheinpräzisen Werte, wenn die Eingangsdaten sie nicht stützen.
- Weise auf notwendige Besichtigung, Bilder, Maße oder fachliche Prüfung hin, wenn keine belastbare Aussage möglich ist.
- Erhalte die menschliche Freigabe für Angebotsentwürfe.

## UI-Verhalten

- Verändere Navigation, Beschriftungen, Lade-, Fehler- und Leerzustände, Speichern, Verwerfen, Zurücksetzen, Fokusführung, Tastaturbedienung oder responsive Darstellung nicht unbeabsichtigt.
- Erhalte semantisches HTML und Barrierefreiheit.
- Prüfe wahrnehmbare UI-Änderungen im Browser und erstelle einen Screenshot.

## Persistenz

- Bewahre die bestehenden `localStorage`-Schlüssel `atlas-inquiry-analysis` und `atlas-editable-offer` sowie ihre Datenformate.
- Benenne Schlüssel nicht um, verwende sie nicht für andere Daten und ändere persistierte Felder oder ihre Semantik nicht inkompatibel, sofern keine Migration beauftragt wurde.
- Schwäche die Laufzeitvalidierung gespeicherter Daten nicht ab.
- Implementiere bei einer freigegebenen Vertragsänderung eine versionierte, rückwärtskompatible und getestete Migration mit sicherem Fallback.
- Greife nur in Client-Code und bevorzugt über das bestehende Storage-Modul auf `localStorage` zu.

## Qualitätssicherung

Führe nach Änderungen mindestens aus:

- `npm run lint`
- `npm run build`
- `git diff --check`

Zusätzlich:

- Führe vorhandene, für die Änderung relevante Tests aus.
- Prüfe bei UI-, API- oder Persistenzänderungen die betroffenen Erfolgs- und Fehlerfälle.
- Behebe nur Fehler, die durch die aktuelle Aufgabe verursacht wurden; dokumentiere andere Fehler und Umgebungseinschränkungen.
- Behaupte nie, eine Prüfung sei erfolgreich gewesen, wenn sie nicht ausgeführt wurde.
- Prüfe vor Abschluss `git status` und den vollständigen Diff auf unbeabsichtigte Änderungen.

## Abschlussbericht

Nenne am Ende:

- geänderte und neu erstellte Dateien
- umgesetzte Änderungen
- Ergebnisse von Lint, Build, Tests und `git diff --check`
- bekannte Einschränkungen oder offene Risiken
