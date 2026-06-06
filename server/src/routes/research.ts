import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { runResearchPipeline } from "../services/research-pipeline.js";

const router = Router();
const runningSessions = new Set<string>();

const topicSchema = z.object({
  topic: z.string().min(3).max(500),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = topicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const session = await prisma.researchSession.create({
    data: {
      userId: req.user!.id,
      topic: parsed.data.topic,
    },
  });

  runningSessions.add(session.id);
  void runResearchPipeline(session.id, parsed.data.topic).finally(() => {
    runningSessions.delete(session.id);
  });

  return res.status(201).json({ sessionId: session.id, topic: session.topic });
});

router.get("/", requireAuth, async (req, res) => {
  const sessions = await prisma.researchSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      topic: true,
      status: true,
      totalCost: true,
      totalDurationMs: true,
      totalSteps: true,
      startedAt: true,
      completedAt: true,
    },
  });
  return res.json({ sessions });
});

router.get("/:sessionId", requireAuth, async (req, res) => {
  const session = await prisma.researchSession.findFirst({
    where: { id: req.params.sessionId, userId: req.user!.id },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.json({
    session,
    isRunning: runningSessions.has(session.id),
  });
});

router.get("/:sessionId/stream", requireAuth, async (req, res) => {
  const session = await prisma.researchSession.findFirst({
    where: { id: req.params.sessionId, userId: req.user!.id },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let lastEventId: string | null = null;

  const sendEvents = async () => {
    const events = await prisma.feedEvent.findMany({
      where: {
        sessionId: session.id,
        ...(lastEventId ? { id: { gt: lastEventId } } : {}),
      },
      orderBy: { timestamp: "asc" },
      take: 50,
    });

    for (const event of events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      lastEventId = event.id;
    }

    const updated = await prisma.researchSession.findUnique({
      where: { id: session.id },
      select: { status: true, reportMarkdown: true },
    });

    if (updated && updated.status !== "RUNNING") {
      res.write(
        `data: ${JSON.stringify({
          type: "session_end",
          status: updated.status,
          reportMarkdown: updated.reportMarkdown,
        })}\n\n`,
      );
      clearInterval(interval);
      res.end();
    }
  };

  await sendEvents();
  const interval = setInterval(() => {
    void sendEvents();
  }, 1500);

  req.on("close", () => {
    clearInterval(interval);
  });
});

export default router;
