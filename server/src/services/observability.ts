import type { SessionStatus } from "@prisma/client";
import { estimateCost } from "../lib/cost.js";
import { prisma } from "../lib/prisma.js";

const AGENT_LABELS: Record<string, string> = {
  "orchestrator-agent": "Orchestrator Agent",
  "research-agent": "Research Agent",
  "analysis-agent": "Analysis Agent",
  "writing-agent": "Writing Agent",
};

export class ObservabilityService {
  private sessionId: string;
  private activeTraces = new Map<string, string>();
  private stepCounters = new Map<string, number>();
  private sessionPromptTokens = 0;
  private sessionCompletionTokens = 0;
  private sessionSteps = 0;
  private startedAt = Date.now();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private agentLabel(agentId: string) {
    return AGENT_LABELS[agentId] ?? agentId;
  }

  async emitFeed(agentId: string, eventType: string, message: string, payload?: unknown) {
    await prisma.feedEvent.create({
      data: {
        sessionId: this.sessionId,
        agentId,
        agentName: this.agentLabel(agentId),
        eventType,
        message,
        payload: payload ? (payload as object) : undefined,
      },
    });
  }

  async startAgentTrace(agentId: string, input?: unknown) {
    const trace = await prisma.agentTrace.create({
      data: {
        sessionId: this.sessionId,
        agentId,
        agentName: this.agentLabel(agentId),
        status: "running",
        input: input ? (input as object) : undefined,
      },
    });
    this.activeTraces.set(agentId, trace.id);
    this.stepCounters.set(agentId, 0);
    await this.emitFeed(agentId, "agent_start", `${this.agentLabel(agentId)} started`);
    return trace.id;
  }

  async completeAgentTrace(agentId: string, output?: unknown, error?: string) {
    const traceId = this.activeTraces.get(agentId);
    if (!traceId) return;

    const trace = await prisma.agentTrace.findUnique({ where: { id: traceId } });
    if (!trace) return;

    const durationMs = Date.now() - trace.startedAt.getTime();
    const cost = estimateCost(trace.promptTokens, trace.completionTokens);

    await prisma.agentTrace.update({
      where: { id: traceId },
      data: {
        status: error ? "failed" : "completed",
        output: output ? (output as object) : undefined,
        error,
        durationMs,
        estimatedCost: cost,
        completedAt: new Date(),
      },
    });

    await this.emitFeed(
      agentId,
      error ? "agent_error" : "agent_complete",
      error
        ? `${this.agentLabel(agentId)} failed: ${error}`
        : `${this.agentLabel(agentId)} completed (${(durationMs / 1000).toFixed(1)}s)`,
    );
  }

  async recordStep(
    agentId: string,
    eventType: string,
    details: {
      toolName?: string;
      toolArgs?: unknown;
      toolResult?: unknown;
      promptTokens?: number;
      completionTokens?: number;
      message?: string;
    },
  ) {
    const traceId = this.activeTraces.get(agentId);
    if (!traceId) return;

    const stepIndex = (this.stepCounters.get(agentId) ?? 0) + 1;
    this.stepCounters.set(agentId, stepIndex);
    this.sessionSteps += 1;

    const promptTokens = details.promptTokens ?? 0;
    const completionTokens = details.completionTokens ?? 0;
    this.sessionPromptTokens += promptTokens;
    this.sessionCompletionTokens += completionTokens;

    await prisma.stepDetail.create({
      data: {
        agentTraceId: traceId,
        stepIndex,
        eventType,
        toolName: details.toolName,
        toolArgs: details.toolArgs ? (details.toolArgs as object) : undefined,
        toolResult: details.toolResult ? (details.toolResult as object) : undefined,
        promptTokens,
        completionTokens,
        message: details.message,
      },
    });

    const updatedTrace = await prisma.agentTrace.update({
      where: { id: traceId },
      data: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
      },
    });

    await prisma.agentTrace.update({
      where: { id: traceId },
      data: {
        estimatedCost: estimateCost(updatedTrace.promptTokens, updatedTrace.completionTokens),
      },
    });

    if (details.toolName) {
      await this.emitFeed(
        agentId,
        "tool_call",
        `${this.agentLabel(agentId)} called ${details.toolName}`,
        { args: details.toolArgs },
      );
    } else if (details.message) {
      await this.emitFeed(agentId, eventType, details.message);
    }
  }

  async finalize(
    status: SessionStatus,
    reportMarkdown?: string,
    reportJson?: object,
    errorMessage?: string,
  ) {
    const totalDurationMs = Date.now() - this.startedAt;
    const totalCost = estimateCost(this.sessionPromptTokens, this.sessionCompletionTokens);

    await prisma.researchSession.update({
      where: { id: this.sessionId },
      data: {
        status,
        reportMarkdown,
        reportJson,
        totalCost,
        totalDurationMs,
        totalSteps: this.sessionSteps,
        promptTokens: this.sessionPromptTokens,
        completionTokens: this.sessionCompletionTokens,
        errorMessage,
        completedAt: new Date(),
      },
    });

    await this.emitFeed(
      "orchestrator-agent",
      "session_complete",
      `Session ${status.toLowerCase().replace(/_/g, " ")} in ${(totalDurationMs / 1000).toFixed(1)}s — $${totalCost.toFixed(4)}`,
    );
  }
}
