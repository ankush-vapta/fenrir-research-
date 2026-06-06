import express from "express";
import cors from "cors";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import researchRoutes from "./routes/research.js";
import observabilityRoutes from "./routes/observability.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/research", researchRoutes);
  app.use("/api/observability", observabilityRoutes);

  return app;
}
