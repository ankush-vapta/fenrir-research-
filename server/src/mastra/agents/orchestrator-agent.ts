import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { config } from "../../config.js";
import { researchAgent } from "./research-agent.js";
import { analysisAgent } from "./analysis-agent.js";
import { writingAgent } from "./writing-agent.js";

export const orchestratorAgent = new Agent({
  id: "orchestrator-agent",
  name: "Orchestrator Agent",
  description:
    "Coordinates the multi-agent research pipeline: delegates to research, analysis, and writing agents, then synthesizes the final report.",
  instructions: `You are the research orchestrator. For every user topic, follow this pipeline:

1. **Plan**: Break the topic into research sub-tasks.
2. **Research**: Delegate to research-agent to gather web sources and facts.
3. **Analyze**: Delegate to analysis-agent with all research findings to extract insights and resolve contradictions.
4. **Write**: Delegate to writing-agent with the analysis to produce the final markdown report.
5. **Deliver**: Return the complete report from the writing agent as your final answer.

Rules:
- Always delegate in order: research → analysis → writing
- Pass full context between agents
- Do not skip steps
- If research yields thin results, run additional searches before analysis
- Final output must be the complete markdown report`,
  model: config.model,
  agents: {
    researchAgent,
    analysisAgent,
    writingAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      id: "orchestrator-memory",
      url: "file:./mastra-orchestrator.db",
    }),
  }),
  defaultOptions: {
    maxSteps: config.maxAgentSteps,
  },
});
