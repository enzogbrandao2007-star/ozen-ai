
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

function sign(value) {
  return createHmac("sha256", process.env.OZEN_SESSION_SECRET)
    .update(value)
    .digest("base64url");
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const configuredPin = process.env.OZEN_PIN;
  const secret = process.env.OZEN_SESSION_SECRET;
  const pin = String(req.body?.pin || "");

  if (!configuredPin || !secret) {
    return res.status(500).json({ error: "Acesso não configurado." });
  }

  if (!/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "Digite os 6 números." });
  }

  const a = Buffer.from(pin);
  const b = Buffer.from(configuredPin);

  const valid = a.length === b.length && timingSafeEqual(a, b);

  if (!valid) {
    return res.status(401).json({ error: "PIN incorreto." });
  }

  const expires = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({
      expires,
      nonce: randomBytes(16).toString("hex")
    })
  ).toString("base64url");

  const token = payload + "." + sign(payload);

  res.setHeader("Set-Cookie",
    `ozen_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  );

  return res.status(200).json({
    success: true,
    message: "Bem-vindo à OZEN, Enzo!"
  });
}
