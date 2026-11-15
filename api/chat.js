
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Digite uma mensagem." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Chave Gemini não configurada." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Você é OZEN, uma IA pessoal inteligente. Fale português brasileiro. Seja amigável, prestativa e objetiva."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message.trim() }]
          }]
        }),
        signal: controller.signal
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini status:", response.status, data);

      return res.status(response.status === 503 ? 503 : 502).json({
        error: response.status === 503
          ? "O Gemini está temporariamente ocupado. Tente novamente."
          : "Falha na conexão com o Gemini.",
        detail: data.error?.message || "Erro desconhecido."
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "")
      .join("");

    if (!answer) {
      return res.status(502).json({
        error: "O Gemini não retornou uma resposta."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Erro OZEN:", error);

    return res.status(504).json({
      error: "A conexão demorou demais. Tente novamente."
    });
  } finally {
    clearTimeout(timeout);
  }
}
