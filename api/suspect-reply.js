// api/suspect-reply.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { suspectName, playerQuestion } = req.body;

    if (!suspectName || !playerQuestion) {
      return res.status(400).json({ error: 'Missing suspectName or playerQuestion' });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // cheaper, faster option
        messages: [
          {
            role: "system",
            content: `You are roleplaying as ${suspectName} in a murder mystery game.
                      Answer the player's questions in a realistic, short, and in-character way.
                      Never break character or reveal the murderer unless they guess correctly.`
          },
          {
            role: "user",
            content: playerQuestion
          }
        ],
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I have nothing to say about that.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
Added AI suspect reply endpoint
