// Local preview: node tools/dev_server.mjs  (then open http://localhost:3000)
// Serves the static files and runs /api/tutor with the same code Vercel runs.
// Without ANTHROPIC_API_KEY set, the tutor uses its built-in hints.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleTutor } from "../lib/server.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const port = Number(process.env.PORT || 3000);

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/tutor" && req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body = null;
    try { body = JSON.parse(raw); } catch {}
    const r = await handleTutor(body, { ip: req.socket.remoteAddress, env: process.env });
    res.writeHead(r.status, { "content-type": "application/json" });
    return res.end(JSON.stringify(r.body));
  }
  const path = normalize(join(root, url.pathname === "/" ? "index.html" : url.pathname));
  if (!path.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}).listen(port, () => console.log(`Rung running at http://localhost:${port}`));
