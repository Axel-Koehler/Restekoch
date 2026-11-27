// POST /api/image — bestellt beim eigenen Bildgenerator ein Foto des Gerichts.
// Optional: Ohne IMAGE_SERVER_URL antwortet die Funktion mit {disabled:true}
// und die App zeigt die Rezepte einfach ohne Foto.
import { send, checkAccess, readJson, clean, rateLimited } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Nur POST erlaubt." });
  const base = (process.env.IMAGE_SERVER_URL || "").replace(/\/+$/, "");
  if (!base) return send(res, 200, { disabled: true });
  if (!checkAccess(req, res)) return;
  if (rateLimited(req, "image")) return send(res, 429, { error: "Gerade zu viele Fotos. Versuch es später noch einmal." });

  let body;
  try { body = await readJson(req); } catch { return send(res, 400, { error: "Ungültige Anfrage." }); }
  const prompt = clean(body.prompt, 500) || clean(body.title, 120);
  if (prompt.length < 3) return send(res, 400, { error: "Keine Bildbeschreibung." });

  try {
    const r = await fetch(base + "/bild", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + (process.env.IMAGE_SERVER_TOKEN || ""),
      },
      body: JSON.stringify({ prompt, stil: "Essen" }),
      signal: AbortSignal.timeout(55_000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || typeof data.bild !== "string" || !data.bild.startsWith("data:image/")) {
      console.error("Bildserver-Fehler", r.status, data?.detail || "");
      const msg = r.status === 401 ? "Der Bildserver lehnt den Token ab (IMAGE_SERVER_TOKEN prüfen)."
        : r.status === 503 ? "Der Bildgenerator ist gerade ausgelastet."
        : "Das Foto konnte nicht erstellt werden.";
      return send(res, 502, { error: msg });
    }
    return send(res, 200, { image: data.bild });
  } catch (e) {
    console.error("Bildserver nicht erreichbar", e?.name, e?.message);
    const msg = e?.name === "TimeoutError" ? "Das Foto hat zu lange gedauert." : "Der Bildserver ist gerade nicht erreichbar.";
    return send(res, 502, { error: msg });
  }
}
