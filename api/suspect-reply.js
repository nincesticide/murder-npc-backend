// api/suspect-reply.js
// Roblox server -> Vercel -> OpenAI -> reply back
// Expects POST JSON:
// {
//   suspectName: "Suspect",
//   playerQuestion: "Where were you?",
//   case: { victim, weapon, location:{x,y,z}, suspects:[] },
//   memory: { trust: 0..100 },
//   history: [ {role:"user", content:"..."}, {role:"npc", content:"..."} ... ]
// }
// Returns: { reply, trust, appendHistory:[{role,content}...] }

export default async function handler(req, res) {
  // CORS preflight (harmless even if not needed)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({ reply: "Server missing OPENAI_API_KEY." });
    }

    const body = req.body || {};
    const suspectName    = body.suspectName || body.target || "Suspect";
    const playerQuestion = body.playerQuestion || body.text || "";
    const caseData       = body.case || {};
    const memory         = body.memory || {};
    const history        = Array.isArray(body.history) ? body.history : [];

    // System rules + case context
    const systemRules = [
      "You are an NPC in a multiplayer murder-mystery Roblox game.",
      `You are roleplaying as ${suspectName}. You may be evasive and only subtly helpful.`,
      "Keep replies short (1–2 sentences). Stay in-world. Never mention being an AI.",
      "Hint at real clues sparingly. Do not outright confess unless extremely pressured.",
      "If the player repeats the same question, get slightly irritated."
    ].join(" ");

    const caseSummary = `Case: victim=${caseData.victim ?? "Unknown"}, weapon=${caseData.weapon ?? "Unknown"}, location=${JSON.stringify(caseData.location ?? {})}, suspects=${(caseData.suspects ?? []).join(", ")}`;
    const trustLine   = `Player trust level: ${typeof memory.trust === "number" ? memory.trust : 50}.`;

    // Convert short history to OpenAI messages
    const historyMsgs = history
      .map(turn => {
        if (!turn || typeof turn !== "object") return null;
        if (turn.role === "user") return { role: "user", content: turn.content };
        if (turn.role === "npc")  return { role: "assistant", content: turn.content };
        return null;
      })
      .filter(Boolean);

    const messages = [
      { role: "system", content: systemRules },
      { role: "system", content: caseSummary },
      { role: "system", content: trustLine },
      ...historyMsgs,
      { role: "user", content: playerQuestion || "" }
    ];

    // Call OpenAI via REST (keeps deps minimal)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 140
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("OpenAI error:", resp.status, txt);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(502).json({ reply: "…not talking right now." });
    }

    const data = await resp.json();
    const reply = (data?.choices?.[0]?.message?.content || "…").trim();

    // Optional tiny trust tweak
    let trust = typeof memory.trust === "number" ? memory.trust : 50;
    if (/please|help/i.test(playerQuestion)) trust = Math.min(100, trust + 1);
    if (/confess|liar|admit/i.test(playerQuestion)) trust = Math.max(0, trust - 1);

    const appendHistory = [
      { role: "user", content: playerQuestion },
      { role: "npc",  content: reply }
    ];

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ reply, trust, appendHistory });
  } catch (e) {
    console.error(e);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ reply: "…not talking right now." });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" }
  }
};
