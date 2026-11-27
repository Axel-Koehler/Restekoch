# Restekoch als App veröffentlichen

Restekoch ist eine installierbare Web-App: Sie läuft auf deiner eigenen Adresse bei Vercel. Auf iPhone und Android legt man sie mit einem Tipp auf den Startbildschirm, danach startet sie wie eine App, im Vollbild und mit eigenem Symbol.

Du brauchst drei kostenlose Konten: **Anthropic** (für die Rezepte), **GitHub** (für die Dateien) und **Vercel** (für die Veröffentlichung). Rechne mit etwa 20 Minuten.

---

## 1. Claude-API-Schlüssel holen

1. Gehe auf **console.anthropic.com** und lege ein Konto an.
2. Unter **Billing** ein kleines Guthaben aufladen, zum Beispiel 5 €.
3. Unter **Limits** ein **monatliches Ausgabenlimit** setzen, zum Beispiel 10 $. Damit kann die App nie mehr kosten als das, auch wenn jemand sie übermäßig benutzt.
4. Unter **API Keys** auf **Create Key** klicken, Namen „Restekoch“ eingeben und den Schlüssel kopieren. Er beginnt mit `sk-ant-` und wird nur einmal angezeigt. Bewahre ihn sicher auf und gib ihn niemandem weiter.

**Kosten:** Mit dem eingestellten Modell (Claude Haiku) kostet ein Rezept nach aktuellen Preisen etwa 0,1 Cent. Mit 5 € kommen also einige tausend Rezepte zusammen.

## 2. Dateien zu GitHub hochladen

1. Lege auf **github.com** ein Konto an.
2. Oben rechts **+** → **New repository**. Name: `restekoch`. Sichtbarkeit: **Private** ist in Ordnung. Auf **Create repository** klicken.
3. Auf der neuen Seite den Link **uploading an existing file** anklicken.
4. Entpacke die ZIP-Datei auf deinem Computer. Öffne den Ordner `restekoch` und ziehe **seinen gesamten Inhalt** (die Ordner `api` und `icons` und alle Dateien) in das Browserfenster. Nicht den Ordner `restekoch` selbst hineinziehen.
5. Unten auf **Commit changes** klicken.

Danach muss in deinem Repository oben direkt `index.html`, `sw.js`, `vercel.json` und der Ordner `api` zu sehen sein.

## 3. Bei Vercel veröffentlichen

1. Gehe auf **vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New…** → **Project** → bei `restekoch` auf **Import**.
3. **Framework Preset:** `Other` lassen. Sonst nichts an den Einstellungen ändern.
4. **Environment Variables** aufklappen und eintragen:
   - Name: `ANTHROPIC_API_KEY`
   - Value: dein Schlüssel aus Schritt 1
5. **Deploy** klicken. Nach etwa einer Minute ist die App unter einer Adresse wie `restekoch.vercel.app` erreichbar.

Öffne die Adresse und probiere **Gericht erfinden** aus. Wenn ein Rezept erscheint, läuft alles.

## 4. Auf dem Handy installieren

- **iPhone / iPad:** Adresse in **Safari** öffnen → unten auf **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**.
- **Android:** Adresse in **Chrome** öffnen → auf **App installieren** tippen (erscheint im grünen Bereich oben) oder Menü **⋮** → **App installieren**.

Das Restekoch-Symbol liegt dann auf dem Startbildschirm. Die App öffnet sich auch ohne Internet; für neue Rezepte braucht sie aber eine Verbindung.

---

## Optionale Einstellungen

In Vercel unter **Project → Settings → Environment Variables**. Nach jeder Änderung unter **Deployments** beim obersten Eintrag **⋯ → Redeploy** wählen, sonst gilt die Änderung noch nicht.

| Name | Wirkung |
|---|---|
| `ACCESS_CODE` | Schützt die App mit einem Code, zum Beispiel `kochen24`. Wer die App nutzt, muss ihn einmal eingeben; danach merkt sich das Gerät den Code. Sinnvoll, wenn nur Familie und Freunde sie nutzen sollen. |
| `RATE_LIMIT` | Höchstzahl an Rezepten pro Stunde und Gerät. Standard: 30. |
| `CLAUDE_MODEL` | Für noch bessere Rezepte `claude-sonnet-5-5` eintragen. Kostet etwa 2 bis 3 Cent pro Rezept und dauert etwas länger. |

## Rezeptfotos (optional)

Restekoch kann zu jedem Rezept ein KI-Foto des fertigen Gerichts zeigen; es erscheint oben in der Rezeptkarte und im PDF.
Die Fotos erzeugt dein **eigener Bildgenerator** (Projekt `bildgenerator`). Er braucht viel Rechenleistung und läuft deshalb
nicht bei Vercel, sondern auf deinem Computer (am besten mit NVIDIA-Grafikkarte) oder einem gemieteten GPU-Server.

1. Auf dem Computer im Ordner `bildgenerator`: `pip install -r requirements.txt`, dann
   `BILD_TOKEN=ein-langes-geheimes-passwort python server.py` starten. Beim ersten Start wird das Modell geladen (ca. 7 GB).
2. Den Server aus dem Internet erreichbar machen, z. B. mit einem kostenlosen Cloudflare-Tunnel:
   `cloudflared tunnel --url http://localhost:8000`. Die angezeigte Adresse (`https://….trycloudflare.com`) kopieren.
3. In Vercel zwei Environment Variables eintragen und neu deployen:
   - `IMAGE_SERVER_URL`: die Adresse aus Schritt 2
   - `IMAGE_SERVER_TOKEN`: dasselbe Passwort wie `BILD_TOKEN`

Ohne `IMAGE_SERVER_URL` funktioniert die App wie bisher, nur ohne Fotos. Ist der Computer aus, erscheint beim Rezept
„Der Bildserver ist gerade nicht erreichbar“, das Rezept selbst klappt trotzdem. Ein Foto dauert ohne Grafikkarte
etwa 20 Sekunden, mit Grafikkarte wenige Sekunden. Eine Trycloudflare-Adresse ändert sich bei jedem Start des Tunnels;
für eine feste Adresse richtest du einen benannten Cloudflare-Tunnel ein.

## Später etwas ändern

1. Die geänderte Datei bei GitHub im Repository öffnen und mit dem Stift-Symbol bearbeiten oder neu hochladen.
2. Vercel veröffentlicht die neue Version automatisch nach etwa einer Minute.
3. Wenn du `index.html` geändert hast: in `sw.js` die Zeile `const VERSION = "restekoch-v1";` auf `v2`, `v3` usw. erhöhen. Sonst sehen installierte Apps die Änderung erst später.

Eine eigene Adresse wie `restekoch.de` kannst du in Vercel unter **Settings → Domains** verbinden.

## Gut zu wissen

- **Vercel kostenlos:** Der kostenlose Hobby-Tarif ist für private, nicht kommerzielle Projekte gedacht. Für Restekoch als privates Projekt reicht er.
- **Impressum und Datenschutz:** Wenn die App öffentlich in Deutschland erreichbar ist, kann eine Impressumspflicht bestehen, und du brauchst in der Regel eine Datenschutzerklärung. Die App schickt die eingegebenen Zutaten an Anthropic und lädt Schriften von Google Fonts. Lass dich dazu im Zweifel beraten; das hier ist keine Rechtsberatung.
- **Dein Schlüssel ist sicher:** Er liegt nur bei Vercel auf dem Server und ist in der App nicht sichtbar.

## Was in welcher Datei steckt

| Datei | Inhalt |
|---|---|
| `index.html` | Die ganze Oberfläche: Zutatenliste, Rezeptkarte, PDF-Export |
| `api/recipe.js` | Server-Teil: fragt Claude nach dem Rezept |
| `api/image.js` | Server-Teil: holt das Rezeptfoto vom eigenen Bildgenerator (optional) |
| `api/_lib.js` | Hilfsfunktionen: Zugangscode, Anfragen-Bremse |
| `manifest.webmanifest` | Name, Farben und Symbol der App |
| `sw.js` | Sorgt dafür, dass die App schnell startet und offline öffnet |
| `icons/` | App-Symbole |
| `og.png` | Vorschaubild, wenn der Link geteilt wird |
| `vercel.json` | Einstellungen für Vercel |
