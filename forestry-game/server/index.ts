import { allowedOrigin } from "./origins";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { RoomStore, RoomError } from "./rooms";
const store = new RoomStore(
  resolve(process.env.FOREST_ROOM_DIR ?? ".forest-rooms"),
);
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    // Cross-origin classroom access requires an exact configured frontend origin.
    const origin = req.headers.origin;
    if (!allowedOrigin(origin, req.headers.host, process.env.FOREST_ALLOWED_ORIGINS))
      throw new RoomError("Origin is not allowed", 403);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path === "/api/health") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 5_000_000)
        throw new RoomError("Request too large", 413);
    }
    const data = body ? JSON.parse(body) : {};
    if (path === "/api/rooms" && req.method === "POST") {
      const admin = process.env.FOREST_ADMIN_TOKEN;
      if (admin ? req.headers.authorization !== `Bearer ${admin}` : process.env.FOREST_ALLOW_LOCAL_CREATE !== "1") throw new RoomError("Room creation requires the configured administrator credential.", 403);
      res.statusCode = 201;
      res.end(JSON.stringify(store.create(data.region)));
      return;
    }
    const recovery = path.match(/^\/api\/rooms\/([a-f0-9]{16})\/recover$/);
    if (recovery && req.method === "POST") {
      const credential = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      res.end(JSON.stringify(store.recover(recovery[1], credential)));
      return;
    }
    const summary = path.match(/^\/api\/rooms\/([a-f0-9]{16})\/summary$/);
    if (summary && req.method === "GET") {
      const credential = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      res.end(JSON.stringify(store.summary(summary[1], credential)));
      return;
    }
    const match = path.match(/^\/api\/rooms\/([a-f0-9]{16})$/);
    if (!match) throw new RoomError("Not found", 404);
    const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    if (req.method === "GET")
      res.end(JSON.stringify(store.view(match[1], token)));
    else if (req.method === "POST")
      res.end(
        JSON.stringify(
          store.mutate(
            match[1],
            token,
            data.revision,
            data.action,
            data.payload,
          ),
        ),
      );
    else throw new RoomError("Method not allowed", 405);
  } catch (e) {
    res.statusCode = e instanceof RoomError ? e.status : 400;
    res.end(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Request failed",
      }),
    );
  }
});
server.requestTimeout = 15_000;
server.listen(
  Number(process.env.FOREST_ROOM_PORT ?? 3001),
  process.env.FOREST_ROOM_HOST ?? "127.0.0.1",
  () =>
    console.log(
      "Forest classroom server ready on port " +
        (process.env.FOREST_ROOM_PORT ?? 3001),
    ),
);
