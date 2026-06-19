import express from "express";
import { createServer as createViteServer } from "vite";
import { createApiApp } from "../src/backend/app.js";

const port = Number(process.env.PORT || 5174);
const app = express();
app.disable("x-powered-by");
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa"
});

app.use(createApiApp());
app.use(vite.middlewares);

app.listen(port, "0.0.0.0", () => {
  console.log(`RoomWalk: http://localhost:${port}`);
});
