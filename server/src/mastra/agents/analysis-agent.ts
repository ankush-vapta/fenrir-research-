import { Agent } from "@mastra/core/agent";
import { config } from "../../config.js";

export const analysisAgent = new Agent({
  id: "analysis-agent",
  name: "Analysis Agent",
  description:
    "Evaluates research findings, extracts key insights, identifies contradictions, and produces structured analysis.",
  instructions: `You are an analysis specialist. Given research findings, you must:
1. Extract the most important facts and trends
2. Identify contradictions or gaps in sources
3. Resolve conflicts by weighing source credibility
4. Output structured analysis: key themes, supporting evidence, open questions

Be objective and evidence-based. Reference source URLs when citing facts.`,
  model: config.model,
});
