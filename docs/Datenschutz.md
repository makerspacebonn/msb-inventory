# Personenbezogene Daten im MSB Inventar

Stand: 8. November 2026. Grundlage für die Datenschutzerklärung des MakerSpace Bonn e.V. (DSGVO): welche personenbezogenen Daten die Inventar-App speichert, wozu, wer sie sieht und wie lange sie bleiben. Abschnitt 5 nennt, was der Verein noch entscheiden oder ergänzen muss; Abschnitt 6 ist ein Textvorschlag zum Übernehmen.

Diese Übersicht beschreibt die App selbst. Was der Server, auf dem sie läuft, darüber hinaus protokolliert (z.B. Zugriffsprotokolle eines Reverse Proxys), ist hier nicht erfasst.

## 1. Übersicht

| Daten | Wozu | Wer sieht sie | Wie lange |
|---|---|---|---|
| Konto: Name, E-Mail-Adresse, Link zum Profilbild, Rolle (Benutzer/Admin), Zeitpunkt der Anlage | Anmelden, Rechte, Anzeige, wer etwas geändert hat | Admins in der Datenbank; der Name erscheint im Änderungsprotokoll | Bis zur Löschung von Hand (siehe 5.1) |
| Anmeldesitzungen: IP-Adresse, Browser-Kennung, Ablaufzeit | Angemeldet bleiben, Missbrauch erkennen | Nur in der Datenbank | 7 Tage nach der letzten Nutzung abgelaufen, bleiben aber gespeichert (siehe 5.2) |
| Verknüpfung mit dem Login-Dienst (Kanidm): Konto-Kennung, Zugangs- und Identitäts-Token | Anmeldung über den Login-Dienst des Vereins | Nur in der Datenbank | Solange das Konto besteht |
| Passwort (nur für Konten mit Passwort statt Login-Dienst) | Anmeldung | Niemand: nur als Hash gespeichert | Solange das Konto besteht |
| Änderungsprotokoll: wer wann welches Item oder welche Location angelegt, geändert oder gelöscht hat, mit den Werten davor und danach | Nachvollziehen und Rückgängigmachen von Änderungen | Angemeldete Mitglieder | Unbegrenzt |
| Statistik „Änderungen pro Person“ | Überblick, wer sich am Inventar beteiligt | Angemeldete Mitglieder | Berechnet aus dem Änderungsprotokoll, keine eigenen Daten |
| Fotos von Items und Locations | Gegenstände und Orte wiedererkennen | Alle, die die App aufrufen | Bis sie in der App ersetzt oder gelöscht werden; auch danach bleiben die Dateien erhalten, damit Änderungen rückgängig gemacht werden können |
| Backups: Konten, Änderungsprotokoll, Inventar, Statistik und alle Fotos als ZIP-Datei | Wiederherstellung nach Datenverlust | Admins | Bis ein Admin sie löscht |

Fotos zeigen Gegenstände und Orte. Personen sind darauf nicht beabsichtigt, können aber zufällig zu sehen sein.

## 2. Weitergabe an andere

- **Google (Gemini):** Für die KI-Beschreibung eines Items und für die Suche per Foto wird das Foto an Google gesendet und dort ausgewertet. Mitgeschickt werden nur das Foto und die Liste der Kategorien und häufigen Schlagworte, keine Angaben zu Personen. Die Fotos der Suche per Foto werden von der App nicht gespeichert.
- **Login-Dienst des Vereins (Kanidm):** Bei der Anmeldung übermittelt er Name, E-Mail-Adresse, Profilbild und Gruppen an die App. Die Gruppen entscheiden, ob jemand Admin ist; sie werden nicht gespeichert, nur die Rolle.
- **Etikettendrucker:** Druckaufträge enthalten Name und QR-Code eines Items oder einer Location, keine Angaben zu Personen.

## 3. Cookies und Speicher im Browser

- **Anmelde-Cookies** (`better-auth.session_token` und, für 5 Minuten zwischengespeichert, `better-auth.session_data` mit Name und E-Mail-Adresse): nur nach der Anmeldung, technisch nötig, um angemeldet zu bleiben. Signiert, damit sie nicht gefälscht werden können.
- **Lokaler Speicher des Browsers:** zuletzt benutzte Locations und die Auswahl für den Etikettendruck. Bleibt auf dem Gerät, enthält keine Angaben zu Personen.
- Keine Tracking- oder Werbe-Cookies, keine Analyse-Dienste, keine eingebundenen Inhalte anderer Anbieter (Schriften, Skripte, Karten).
- Einzige Ausnahme: Das Profilbild angemeldeter Mitglieder lädt der Browser von der Adresse, die der Login-Dienst angibt (normalerweise der Login-Dienst des Vereins selbst).

## 4. Bewusst nicht gespeichert

- **Aufrufe von Item-Seiten** werden nur als Anzahl pro Item und Tag gezählt. Damit jemand pro Stunde nur einmal zählt, merkt sich der Server eine Stunde lang im Arbeitsspeicher, wer ein Item gesehen hat: bei Angemeldeten die Konto-Kennung, sonst einen Hash aus IP-Adresse und Browser, der jeden Tag und bei jedem Neustart anders ist. Nichts davon wird in der Datenbank gespeichert; die IP-Adresse selbst wird nirgends abgelegt.
- **Suchen** werden nur als Anzahl pro Tag gezählt, ohne Suchbegriff und ohne Person.
- **Protokolle der App** enthalten keine Datenbankinhalte und keine Anmeldedaten. (Bis zu dieser Version wurden alle Datenbankabfragen mit ihren Werten protokolliert und bei der Anmeldung die Angaben des Login-Dienstes ausgegeben; beides ist abgeschaltet. Ältere Protokolle des Servers können diese Daten noch enthalten, siehe 5.4.)

## 5. Offene Punkte für den Verein

In Klammern: der passende Eintrag im [Backlog](./Backlog.md).

1. **Konten löschen (PRIV-002):** Die App hat keine Funktion, ein Konto zu löschen; das geht nur direkt in der Datenbank. Für Auskunfts- und Löschanfragen (Art. 15 und 17 DSGVO) braucht es einen Ablauf. Nach dem Löschen eines Kontos zeigt das Änderungsprotokoll „Gelöschter Benutzer“; die Änderungen selbst bleiben.
2. **Abgelaufene Sitzungen (PRIV-003):** Sie bleiben mit IP-Adresse und Browser in der Datenbank. Sie sollten regelmäßig gelöscht werden, z.B. nach 30 Tagen.
3. **Google Gemini (PRIV-004):** Prüfen, mit welchem Konto und zu welchen Bedingungen die App Gemini nutzt (bei kostenlosen Zugängen kann Google eingesandte Daten zur Verbesserung seiner Dienste verwenden), ob ein Auftragsverarbeitungsvertrag nötig ist, und ob die Übermittlung in Länder außerhalb der EU in der Datenschutzerklärung genannt werden muss.
4. **Server-Protokolle (PRIV-005):** Klären, wie lange der Server die Ausgaben der App und Zugriffsprotokolle aufbewahrt. Protokolle aus der Zeit vor dieser Version sollten gelöscht werden (siehe 4).
5. **Backups (PRIV-006):** Festlegen, wie lange Backups aufbewahrt werden. Sie enthalten Konten und das Änderungsprotokoll; eine Löschung eines Kontos erreicht ältere Backups nicht. Wird ein älteres Backup wiederhergestellt, kommen darin enthaltene, inzwischen gelöschte Konten zurück (die Wiederherstellung fügt Konten nur hinzu) und müssten erneut gelöscht werden.
6. **Rechtsgrundlage und Aufbewahrung des Änderungsprotokolls (PRIV-007):** Festlegen, auf welcher Grundlage die Namen im Änderungsprotokoll gespeichert und Mitgliedern gezeigt werden (z.B. berechtigtes Interesse an einem nachvollziehbaren Inventar), und ob Einträge nach einer bestimmten Zeit gelöscht werden.

## 6. Textvorschlag für die Datenschutzerklärung

> **Inventar-App**
>
> Für die Verwaltung unseres Inventars betreiben wir eine eigene Web-App. Wer sie ohne Anmeldung nutzt, hinterlässt dort keine personenbezogenen Daten; Aufrufe und Suchen werden nur als Anzahl gezählt, ohne IP-Adresse oder Suchbegriff zu speichern.
>
> Mitglieder melden sich über unseren Login-Dienst an. Dabei speichern wir Name, E-Mail-Adresse, Profilbild und die Rolle in der App, außerdem für die Dauer der Anmeldung die IP-Adresse und den verwendeten Browser. Wenn Mitglieder Gegenstände oder Orte anlegen, ändern oder löschen, speichern wir, wer die Änderung wann vorgenommen hat, damit Änderungen nachvollzogen und rückgängig gemacht werden können. Diese Angaben sehen angemeldete Mitglieder.
>
> Fotos von Gegenständen können zur automatischen Beschreibung und für die Suche per Foto an Google (Gemini) übermittelt werden. Dabei werden keine Angaben zu Personen übermittelt.
>
> Die App setzt nur technisch notwendige Cookies für die Anmeldung, keine Tracking-Cookies. Zur Sicherung erstellen wir Backups, die auch die genannten Kontodaten enthalten.
>
> *[Speicherdauer, Rechtsgrundlage und Ansprechpartner ergänzen, siehe Abschnitt 5.]*
