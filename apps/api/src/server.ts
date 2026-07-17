import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
const { app } = createApp(); const port = Number(process.env.API_PORT ?? 4000); serve({ fetch: app.fetch, port }); console.log(`Replo API listening on http://localhost:${port}`);
