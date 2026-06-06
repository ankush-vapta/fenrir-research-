import { Mastra } from "@mastra/core";
import { orchestratorAgent } from "./agents/orchestrator-agent.js";
import { researchAgent } from "./agents/research-agent.js";
import { analysisAgent } from "./agents/analysis-agent.js";
import { writingAgent } from "./agents/writing-agent.js";

export const mastra = new Mastra({
  agents: {
    orchestratorAgent,
    researchAgent,
    analysisAgent,
    writingAgent,
  },
});

export { orchestratorAgent, researchAgent, analysisAgent, writingAgent };
