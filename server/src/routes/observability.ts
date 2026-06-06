import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await prisma.researchSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { agentTraces: true, feedEvents: true } },
    },
  });
  return res.json({ sessions });
});

router.get("/sessions/:sessionId", requireAuth, async (req, res) => {
  const session = await prisma.researchSession.findFirst({
    where: { id: req.params.sessionId, userId: req.user!.id },
    include: {
      agentTraces: {
        orderBy: { startedAt: "asc" },
        include: {
          steps: { orderBy: { stepIndex: "asc" } },
        },
      },
      feedEvents: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.json({ session });
});

export default router;
