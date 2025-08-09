export default async function handler(req, res) {
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
    const suspectName    = body.suspectName || "Suspect";
    const playerQuestion = body.playerQuestion || "";

    // Return a simple fake reply first (we can re-enable OpenAI after it works)
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      reply: `(${suspectName}) Dummy reply to: "${playerQuestion}"`,
      trust: 50,
      appendHistory: [
        { role: "user", content: playerQuestion },
        { role: "npc",  content: `(${suspectName}) Dummy reply…` }
      ]
    });
  } catch (e) {
    console.error(e);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ reply: "…not talking right now." });
  }
}

