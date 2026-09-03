# Textprobe

Lern-App für Bühnenrollen: Szene als Markdown einlesen, eigene Rolle wählen und
den Text abfragen lassen. Die eigenen Repliken bleiben verdeckt, lassen sich
stufenweise andeuten und werden mit **Gewusst** / **Vergessen** bewertet – die
App merkt sich, welche Stellen wackeln.

Statische Single-Page-App (React + Vite), Backend ist Supabase.

## Markdown-Format

Es gilt das Format des `theater-scene-epub`-Skills:

```markdown
# Szene 3 – Im Kontor

**SCROOGE:** Was wollen Sie zu dieser Stunde?

*Er zeigt auf das Namensschild an der Tür.*

**HARTY & JOLLYGOODE:** Wir sammeln für die Armen, Sir.
```

* **Fette Sprechernamen** vor dem Doppelpunkt sind die Protagonisten.
  Mehrfachsprecher (`&`, `/`, `und`) werden in einzelne Rollen aufgeteilt.
* *Kursive Absätze* sind Handlung/Regieanweisung und werden beim Lernen immer
  angezeigt.
* Absätze ohne Sprecher gehören zur vorherigen Replik.

## Ablauf in der App

1. **Einlesen** – Markdown einfügen oder `.md`-Datei wählen; Rollen und Handlung
   werden sofort in der Vorschau erkannt.
2. **Rolle wählen** – pro Rolle: Anzahl Repliken, Wörter und Lernstand.
3. **Lernen** – die Szene läuft von oben durch. Fremde Repliken und
   Regieanweisungen stehen da, die eigenen sind verdeckt:
   * **Tipp** deckt stufenweise auf (erstes Wort → Anfangsbuchstaben → erste Hälfte),
   * **Aufdecken** zeigt den Text,
   * **Gewusst** / **Vergessen** bewertet die Stelle.
4. **Spulen** – Pfeiltasten, die Buttons ◀ ▶ oder der Regler springen zwischen
   den eigenen Repliken vor und zurück. Die Position wird gespeichert.
5. **Schwierige Stellen** – eigener Modus, der nur die wackeligen und noch
   ungeübten Repliken abfragt, die schwersten zuerst.

Tastatur: `←`/`→` spulen, `Leertaste` aufdecken, `H` Tipp, `G` gewusst, `V` vergessen.

## Einrichtung

```bash
npm install
cp .env.example .env    # URL + anon key eintragen
npm run dev
```

### Supabase

1. Projekt anlegen, unter *Settings → API* `URL` und `anon key` kopieren.
2. `supabase/migrations/0001_init.sql` im SQL-Editor ausführen. Das legt an:
   * `scenes` – Titel und Markdown,
   * `line_stats` – gewusst/vergessen/Serie je Replik und Rolle,
   * `study_sessions` – zuletzt geübte Position,
   * RLS-Policies (alles strikt an `auth.uid()` gebunden) und die Funktion
     `record_line_result`, die eine Bewertung in einem Schritt verbucht.
3. Unter *Authentication → URL Configuration* die Redirect-URLs eintragen:
   `http://localhost:5173/` und `https://<user>.github.io/Textprobe/`.

Der Lernfortschritt hängt an einem Hash über Sprecher + Text der Replik, nicht
an der Zeilennummer – eine umsortierte oder ergänzte Szene verliert ihn also nicht.

### Deployment auf GitHub Pages

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und veröffentlicht
nach GitHub Pages (*Settings → Pages → Source: GitHub Actions*). Vorher als
Repository-Secrets hinterlegen:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`

Der anon key ist öffentlich gedacht – geschützt wird über RLS, nicht über den
Schlüssel. Trotzdem liegt er nur in `.env` (gitignored) bzw. in den Secrets und
nicht im Repository.

Läuft die App nicht unter `/Textprobe/`, den Basispfad beim Build setzen:
`VITE_BASE=/ npm run build`.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server |
| `npm test` | Tests für Parser, Tipp-Stufen und Schwierigkeitsbewertung |
| `npm run build` | Produktionsbuild nach `dist/` |
