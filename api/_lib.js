// Gemeinsame Helfer für die Server-Funktionen.

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

// Optionaler Zugangscode: Ist ACCESS_CODE in Vercel gesetzt, muss jede Anfrage ihn mitschicken.
export function checkAccess(req, res) {
  const code = process.env.ACCESS_CODE;
  if (!code) return true;
  if (req.headers["x-access-code"] === code) return true;
  send(res, 401, { error: "Zugangscode fehlt oder ist falsch." });
  return false;
}

// Einfache Bremse gegen Missbrauch: höchstens RATE_LIMIT Rezepte pro Stunde und Gerät.
// Sie gilt pro Server-Instanz und ist kein vollständiger Schutz; dafür ist das
// Ausgabenlimit in der Anthropic Console da.
// Mit `bucket` lassen sich getrennte Zähler führen (z. B. "image" für Rezeptfotos).
const hits = new Map();
export function rateLimited(req, bucket = "recipe") {
  const limit = parseInt(process.env.RATE_LIMIT || "30", 10);
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const key = bucket + ":" + ip;
  const now = Date.now(), hour = 3600_000;
  const list = (hits.get(key) || []).filter(t => now - t < hour);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > limit;
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length > 20000) throw new Error("Anfrage zu groß");
  return raw ? JSON.parse(raw) : {};
}

// Kürzt Texte und entfernt Steuerzeichen.
export const clean = (v, max = 80) =>
  String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
