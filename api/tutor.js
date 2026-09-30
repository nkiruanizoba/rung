// Vercel serverless function: POST /api/tutor
// The Anthropic API key lives only in Vercel's environment variables.

import { handleTutor } from "../lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const result = await handleTutor(body, { ip, env: process.env });
  res.setHeader("Cache-Control", "no-store");
  return res.status(result.status).json(result.body);
}
