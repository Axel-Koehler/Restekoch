// POST /api/recipe — erfindet mit Claude ein Gericht aus den vorhandenen Zutaten.
import { send, checkAccess, readJson, clean, rateLimited } from "./_lib.js";

// Haiku ist schnell und günstig und reicht für Rezepte gut aus.
// Für noch bessere Rezepte in Vercel CLAUDE_MODEL=claude-sonnet-5-5 setzen.
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Nur POST erlaubt." });
  if (!checkAccess(req, res)) return;
  if (rateLimited(req)) return send(res, 429, { error: "Gerade zu viele Anfragen. Versuch es in ein paar Minuten noch einmal." });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 500, { error: "Der Server ist noch nicht eingerichtet (ANTHROPIC_API_KEY fehlt)." });

  let body;
  try { body = await readJson(req); } catch { return send(res, 400, { error: "Ungültige Anfrage." }); }

  const items = (Array.isArray(body.items) ? body.items : [])
    .slice(0, 30)
    .map(i => ({ name: clean(i.name, 60), amount: clean(i.amount, 10), unit: clean(i.unit, 10) }))
    .filter(i => i.name);
  if (!items.length) return send(res, 400, { error: "Trag mindestens eine Zutat ein." });

  const servings = Math.min(12, Math.max(1, parseInt(body.servings, 10) || 2));
  const minutes = [20, 40, 90].includes(Number(body.minutes)) ? Number(body.minutes) : 40;
  const diet = ["alles", "vegetarisch", "vegan"].includes(body.diet) ? body.diet : "alles";
  const pantry = body.pantry !== false;
  const another = body.another === true;

  const prompt = `Du bist ein erfahrener Koch. Erfinde EIN leckeres, realistisches Gericht aus diesen vorhandenen Zutaten (Mengen = maximal verfügbar):
${items.map(i => `- ${i.name}: ${i.amount || "?"} ${i.unit}`).join("\n")}

Regeln:
- Portionen: ${servings}
- Gesamtzeit höchstens ${minutes} Minuten
- Ernährung: ${diet}
- ${pantry ? "Salz, Pfeffer, Speiseöl und Wasser sind zusätzlich vorhanden." : "Nur die genannten Zutaten verwenden, nicht einmal Salz oder Öl."}
- Keine anderen Zutaten. Nie mehr als die verfügbare Menge. Nicht alles muss verwendet werden.
- Auf Deutsch.${another ? "\n- Schlage ein ANDERES, weniger naheliegendes Gericht vor." : ""}

Antworte NUR mit einem JSON-Objekt, ohne weiteren Text:
{"title":"Name","description":"1-2 Sätze","servings":2,"minutes":30,"difficulty":"einfach|mittel|anspruchsvoll","ingredients":[{"name":"Kartoffeln","amount":"500","unit":"g","pantry":false}],"steps":["..."],"leftovers":"was übrig bleibt oder leer","tip":"kurzer Tipp","image_prompt":"ENGLISH, max 40 words: what the finished, plated dish looks like (food, plate or bowl, garnish, setting) for a food photo; no people, no text"}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Claude-Fehler", r.status, JSON.stringify(data));
      const msg = r.status === 429 || r.status === 529
        ? "Der Koch ist gerade sehr beschäftigt. Versuch es in einer Minute noch einmal."
        : "Das Rezept konnte gerade nicht erstellt werden.";
      return send(res, 502, { error: msg });
    }
    const recipe = parseRecipe(data);
    if (!recipe) return send(res, 502, { error: "Die Antwort war unvollständig. Bitte versuch es noch einmal." });
    return send(res, 200, recipe);
  } catch (e) {
    console.error(e);
    return send(res, 502, { error: "Das Rezept konnte gerade nicht erstellt werden." });
  }
}

// Holt das JSON aus Claudes Antwort und lässt nur die erwarteten Felder durch.
export function parseRecipe(data) {
  const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let r;
  try { r = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  if (!r || typeof r.title !== "string" || !r.title.trim()) return null;
  const str = (v, n) => (v == null ? "" : String(v).slice(0, n));
  return {
    title: str(r.title, 120),
    description: str(r.description, 400),
    servings: str(r.servings, 6),
    minutes: str(r.minutes, 6),
    difficulty: str(r.difficulty, 20),
    ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).slice(0, 30).map(i => ({
      name: str(i?.name, 80), amount: str(i?.amount, 12), unit: str(i?.unit, 12), pantry: i?.pantry === true,
    })).filter(i => i.name),
    steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 20).map(s => str(s, 600)).filter(Boolean),
    leftovers: str(r.leftovers, 300),
    tip: str(r.tip, 300),
    image_prompt: str(r.image_prompt, 400),
  };
}
