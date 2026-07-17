import { handle } from "@hono/node-server/vercel";
import { createApp } from "../src/app.js";
export const config = { runtime: "nodejs" };
export default handle(createApp().app);
