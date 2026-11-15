
import { createHmac, timingSafeEqual } from "node:crypto";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const cookie = req.headers.cookie || "";
    const token = cookie
      .split("; ")
      .find(item => item.startsWith("ozen_session="))
      ?.slice("ozen_session=".length);

    if (!token || !process.env.OZEN_SESSION_SECRET) {
      return res.status(401).json({ authenticated: false });
    }

    const [payload, signature] = token.split(".");
    if (!payload || !signature) {
      return res.status(401).json({ authenticated: false });
    }

    const expected = createHmac(
      "sha256",
      process.env.OZEN_SESSION_SECRET
    ).update(payload).digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ authenticated: false });
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    if (!data.expires || data.expires <= Date.now()) {
      return res.status(401).json({ authenticated: false });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ authenticated: true });

  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
