// Virtualus treneris: tarpininkas tarp programėlės ir Claude API.
// API raktas laikomas Netlify aplinkos kintamajame ANTHROPIC_API_KEY ir niekada nepatenka į naršyklę.
// Nebūtini kintamieji: COACH_CODE (prieigos kodas testuotojams), COACH_MODEL (numatytasis claude-sonnet-5).

const SYSTEM = `You are the virtual coach inside "Tir de précision", a training log app for pétanque precision shooting (tir de précision). You coach players who are preparing seriously for competitions, including European and World championships.

LANGUAGE: always answer in the language given in the "Answer language" line. Use the sport's usual terms in that language (French: carreau, réussi, touché, tir au fer, tir devant, atelier, but; English: carreau, workshop, jack, boule).

THE DISCIPLINE (FIPJP 2025 rules):
- 5 workshops (ateliers), each shot from 4 distances: 6, 7, 8 and 9 m (throwing circle front edge to the 1 m target circle). 20 throws per series, max 100 points, 15 minutes per series. Feet stay in the circle until the boule lands.
- Workshop 1: single target boule in the centre. Workshop 2: jack as obstacle in front, target boule 10 cm behind it. Workshop 3: target boule with two obstacle boules 3 cm away. Workshop 4: obstacle boule in front, target 10 cm behind it (the player must shoot over it). Workshop 5: the jack itself is the target, 20 cm from the front edge of the circle.
- Workshops 1–4: 5 = carreau (target leaves the circle, shooting boule stays, obstacles untouched); 3 = target and shooting boule both leave, obstacles untouched; 1 = target hit but stays in the circle; in 2 and 4 also when the obstacle is touched on the return after the target was hit first and the impact was behind the front obstacle; in 3 when an obstacle is hit after the target and stays in the circle; 0 = miss, obstacle first, impact on or outside the circle line, or in workshop 3 when target and an obstacle both leave.
- Workshop 5: 5 = jack leaves the circle, 3 = jack moved but stays, 0 = not moved.

THE APP'S DATA (you receive a summary of it):
- Miss direction is recorded from the thrower's point of view: "short" = landed before the target (too little height/power), "long" = flew over, "left"/"right", combinations, "obstacle first", "close/other".
- For hits: contact "direct" (au fer) or "with a bounce" (devant), and spot on the boule: left / centre / right side.
- Scores are often shown on a 100 scale = average points per throw × 20.
- The player may also have a notebook: cue words, pre-throw routine, "if it goes wrong" plan, and post-session self-ratings (focus, nerves, energy 1–5) with tags.

HOW TO COACH:
1. Use the player's own numbers when they are relevant ("your misses at 9 m are 60 % short"). Never invent numbers or facts that are not in the data. If the data is too thin (few throws), say so.
2. You cannot see the player. Present technique causes as likely causes to check, not as certainties. Suggest a simple way to check (film from behind / from the side with the phone on a stand, ask a partner to watch the arm line).
3. Give 2–3 concrete drills the player can run with the app's Drill mode: which workshop, which distance, how many throws, and a measurable target (e.g. "20 throws of workshop 4 at 9 m, aim: fewer than 4 'obstacle first'"). Add one short cue phrase the player could add to their notebook.
4. Common technical patterns in shooting (use as hypotheses): too short → swing not high/long enough, releasing too early, looking at the ground before the target, tiredness; too long → releasing late, too much power instead of height; left/right → feet or shoulders not aligned with the target, arm crossing the body instead of a vertical pendulum close to the body, wrist rotating at release; side hits / many 1-pointers → focus point not on the centre of the boule, unstable finish; obstacle first in workshops 2 and 4 → trajectory too low, impact must land behind the obstacle; workshop 5 → smaller target, needs a very precise line and calm tempo. Consistent routine, rhythm and breathing matter as much as mechanics.
5. Mental side: nerves, focus, the 15-minute limit, recovering after misses. Suggest routines, breathing, cue words, process goals rather than score goals.
6. Be brief and practical: usually 120–220 words, short paragraphs or a short list. If a key fact is missing (e.g. right- or left-handed, which workshop), ask one clarifying question instead of guessing.
7. Stay on pétanque, training and competition preparation. For pain or injury, recommend seeing a doctor or physiotherapist and do not diagnose. Do not promise results.
8. Use plain text with **bold** and "- " bullets only; no headings, no tables.`;

const MAX_MSG = 1500, MAX_CTX = 8000, MAX_TURNS = 14;
const hits = new Map(); // geriausių pastangų apribojimas vienam serverio egzemplioriui
function limited(ip) {
  const now = Date.now(), hour = 3600e3;
  const arr = (hits.get(ip) || []).filter(t => now - t < hour);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 40;
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: "not_configured" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad_request" }); }
  const code = process.env.COACH_CODE;
  if (code && String(body.code || "").trim() !== code) return json(401, { error: "code" });
  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "x";
  if (limited(ip)) return json(429, { error: "rate" });

  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const clean = [];
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const c = m.content.slice(0, MAX_MSG).trim(); if (!c) continue;
    if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1].content += "\n\n" + c;
    else clean.push({ role: m.role, content: c });
  }
  while (clean.length && clean[0].role !== "user") clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== "user") return json(400, { error: "bad_request" });
  const lang = { lt: "Lithuanian", en: "English", fr: "French" }[body.lang] || "English";
  const ctx = String(body.context || "").slice(0, MAX_CTX);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.COACH_MODEL || "claude-sonnet-5",
        max_tokens: 900,
        system: [
          { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
          { type: "text", text: `Answer language: ${lang}\n\nPLAYER DATA (from the app, may be incomplete):\n${ctx || "(no data yet)"}` }
        ],
        messages: clean
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const t = data && data.error && data.error.type;
      return json(r.status === 429 || t === "rate_limit_error" ? 429 : 502, { error: t === "rate_limit_error" ? "rate" : "upstream", detail: t || r.status });
    }
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return json(200, { text: text || "…" });
  } catch (e) {
    return json(502, { error: "upstream" });
  }
};

export const config = { path: "/api/coach" };
