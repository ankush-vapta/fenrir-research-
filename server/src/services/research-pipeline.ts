import type { SessionStatus } from "@prisma/client";
import { orchestratorAgent } from "../mastra/index.js";
import { parseReportMarkdown } from "../lib/report-parser.js";
import { ObservabilityService } from "./observability.js";

type Usage = {
  promptTokens?: number;
  completionTokens?: number;
};

function extractUsage(chunk: Record<string, unknown>): Usage {
  const usage = chunk.usage as Usage | undefined;
  if (usage) return usage;

  const payload = chunk.payload as Record<string, unknown> | undefined;
  if (payload?.usage) return payload.usage as Usage;

  return {};
}

function detectAgentId(chunk: Record<string, unknown>): string {
  const agentId =
    (chunk.agentId as string) ??
    (chunk.agentName as string) ??
    (chunk.from as string) ??
    "orchestrator-agent";

  const normalized = agentId.toLowerCase();
  if (normalized.includes("research")) return "research-agent";
  if (normalized.includes("analysis")) return "analysis-agent";
  if (normalized.includes("writing")) return "writing-agent";
  if (normalized.includes("orchestrator") || normalized === "agent") return "orchestrator-agent";
  return agentId;
}

function extractText(chunk: Record<string, unknown>): string {
  if (typeof chunk.text === "string") return chunk.text;
  if (typeof chunk.delta === "string") return chunk.delta;

  const payload = chunk.payload as Record<string, unknown> | undefined;
  if (typeof payload?.text === "string") return payload.text;
  if (typeof payload?.textDelta === "string") return payload.textDelta;

  return "";
}

export async function runResearchPipeline(sessionId: string, topic: string) {
  const observer = new ObservabilityService(sessionId);
  let finalText = "";
  let lastError = "";
  let currentAgent = "orchestrator-agent";
  const startedAgents = new Set<string>();

  try {
    await observer.emitFeed(
      "orchestrator-agent",
      "pipeline_start",
      `Starting research on: "${topic}"`,
    );
    await observer.startAgentTrace("orchestrator-agent", { topic });

    const stream = await orchestratorAgent.stream(
      `Research this topic thoroughly and produce a full structured report:\n\n${topic}`,
      { maxSteps: 50 },
    );

    for await (const chunk of stream.fullStream) {
      const event = chunk as Record<string, unknown>;
      const type = String(event.type ?? "unknown");
      const agentId = detectAgentId(event);

      if (agentId !== currentAgent) {
        if (startedAgents.has(currentAgent)) {
          await observer.completeAgentTrace(currentAgent);
        }
        currentAgent = agentId;
        if (!startedAgents.has(agentId)) {
          await observer.startAgentTrace(agentId, { delegatedFrom: "orchestrator-agent" });
          startedAgents.add(agentId);
        }
      }

      const usage = extractUsage(event);
      const text = extractText(event);
      if (text) finalText += text;

      if (type.includes("tool-call") || type === "tool-call") {
        const toolName = String(event.toolName ?? event.name ?? "tool");
        await observer.recordStep(agentId, "tool_call", {
          toolName,
          toolArgs: event.args ?? event.input,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          message: `Tool call: ${toolName}`,
        });
      } else if (type.includes("tool-result") || type === "tool-result") {
        await observer.recordStep(agentId, "tool_result", {
          toolName: String(event.toolName ?? event.name ?? "tool"),
          toolResult: event.result ?? event.output,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
      } else if (type.includes("text") || type === "text-delta") {
        await observer.recordStep(agentId, "text_delta", {
          message: text.slice(0, 200) || "Generating response...",
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
      } else if (type.includes("delegat")) {
        await observer.recordStep(agentId, "delegation", {
          message: `Delegating to ${agentId}`,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
      } else if (type.includes("error")) {
        const errorMessage = String(
          event.error ??
            (event.payload as Record<string, unknown> | undefined)?.error ??
            event.message ??
            "Unknown error",
        );
        lastError = errorMessage;
        await observer.recordStep(agentId, "error", {
          message: errorMessage,
        });
      } else if (type.includes("step") || type === "step-finish") {
        await observer.recordStep(agentId, "step_finish", {
          message: `Step completed`,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
      }
    }

    for (const agentId of startedAgents) {
      await observer.completeAgentTrace(agentId, { summary: "Finished" });
    }

    if (!finalText.trim()) {
      const message =
        lastError ||
        "Research pipeline finished without a report. Check DeepInfra balance and API keys.";
      await observer.completeAgentTrace("orchestrator-agent", undefined, message);
      await observer.finalize("FAILED", undefined, undefined, message);
      return { status: "FAILED" as SessionStatus, report: "", error: message };
    }

    const status: SessionStatus = "COMPLETED";
    const reportJson = parseReportMarkdown(finalText);
    await observer.completeAgentTrace("orchestrator-agent", { reportLength: finalText.length });
    await observer.finalize(status, finalText, reportJson);
    return { status, report: finalText };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pipeline error";
    const isMaxSteps = message.toLowerCase().includes("max") && message.toLowerCase().includes("step");
    const status: SessionStatus = isMaxSteps ? "MAX_STEPS_REACHED" : "FAILED";
    const reportJson = finalText ? parseReportMarkdown(finalText) : undefined;

    await observer.completeAgentTrace(currentAgent, undefined, message);
    await observer.finalize(status, finalText || undefined, reportJson, message);
    return { status, report: finalText, error: message };
  }
}
