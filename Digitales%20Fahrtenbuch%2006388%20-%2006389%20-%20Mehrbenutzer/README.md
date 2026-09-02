# Digitales Fahrtenbuch 06388 - 06389 – Mehrbenutzer

Diese Version ist für den gemeinsamen Zugriff von Verkauf und Werkstatt gedacht.

## Eigenschaften
- Keine Mitarbeiter-Anmeldung.
- Gemeinsamer zentraler Datenstand für HA-06388 und HA-06389.
- Nummerierung beginnt bei 2 und endet bei 22.
- Wiederkehrende FIN behält dieselbe Nummer.
- Gleichzeitige Einträge sind durch Datenbank-Lock geschützt.
- Adminfunktionen sind serverseitig durch `BOB2026!?` geschützt.
- Bearbeiten/Löschen nur im Adminmodus.
- Buchabschluss erst bei 21 belegten Nummern.
- Archivierte Bücher bleiben zentral gespeichert.
- Nach Abschluss kann ein neues Buch geöffnet werden und beginnt wieder bei Nr. 2.
- Automatische Aktualisierung alle 15 Sekunden.

## Einmalige Einrichtung
1. Neues Supabase-Projekt anlegen.
2. Im SQL Editor den Inhalt von `supabase/setup.sql` ausführen.
3. Das Projekt auf Vercel deployen.
4. In Vercel drei Environment Variables setzen:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD=BOB2026!?`
5. Deployment neu starten.

Danach gibt es genau einen Link für Verkauf und Werkstatt.

## Datenschutz
Die Service-Role-ID bleibt nur serverseitig in Vercel. Im Browser werden keine Supabase-Schlüssel oder das Admin-Passwort ausgeliefert.
