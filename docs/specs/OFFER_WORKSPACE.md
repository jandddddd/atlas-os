# Angebotsübersicht – Sprint 4a

## Ziel

Atlas führt aus Inbox-Anfragen erzeugte Angebotsentwürfe in einer gemeinsamen
Übersicht zusammen. Ein Entwurf bleibt ein unverbindlicher Arbeitsstand und
wird niemals automatisch freigegeben oder versendet.

## Erster Produktschnitt

- Jeder neue Inbox-Workflow erhält weiterhin seine eindeutige `workflowId`.
- Beim Erzeugen oder Speichern eines Entwurfs wird zusätzlich ein Eintrag im
  versionierten Angebotsarchiv gespeichert.
- Der bestehende Einzelentwurf unter `atlas-editable-offer` und seine Bindung
  bleiben unverändert erhalten.
- Die Angebotsübersicht zeigt mehrere Vorgänge mit Kunde, Titel,
  Aktualisierungszeitpunkt, Prüfstatus und der Anzahl noch fehlender Angaben.
- Eine erfolgreiche menschliche Vormerkung in Today setzt den zugehörigen
  Angebotsvorgang auf `Geprüft`.
- Nur der aktuell in der Inbox geladene Vorgang kann von der Übersicht direkt
  zur vorhandenen Bearbeitungsansicht geöffnet werden.
- Jeder archivierte Vorgang besitzt eine Detailansicht unter seiner eindeutigen
  Workflow-ID. Historische Entwürfe können dort überarbeitet werden; jede
  Änderung setzt ihren Prüfstatus wieder auf `Prüfung offen`.
- Die Übersicht kann nach Kunde, Titel oder Projektinhalt durchsucht und nach
  offenem beziehungsweise geprüftem Status gefiltert werden. Ein zusätzlicher
  Filter trennt Vorgänge mit fehlenden Angaben von bereits vollständigen
  Arbeitsständen.

## Persistenzvertrag

Das neue Archiv verwendet `atlas-offer-workspace` mit Version 1. Ungültige oder
unbekannte Versionen werden sicher ignoriert. Die bestehenden Schlüssel und
Datenformate bleiben rückwärtskompatibel.

## Nicht Bestandteil dieses Schnitts

- Preise, Kalkulationen oder Versand
- automatische fachliche Freigaben
- serverseitige oder geräteübergreifende Synchronisierung
