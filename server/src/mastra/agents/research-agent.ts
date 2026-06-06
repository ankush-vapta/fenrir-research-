import { Agent } from "@mastra/core/agent";
import { config } from "../../config.js";
import { webSearchTool } from "../tools/web-search.js";

export const researchAgent = new Agent({
  id: "research-agent",
  name: "Research Agent",
  description:
    "Performs web searches and gathers source material. Returns structured findings with URLs, titles, and excerpts.",
  instructions: `You are a research specialist. Your job is to:
1. Break the topic into focused search queries
2. Use the web-search tool to find credible, recent sources
3. Return structured findings: source title, URL, key facts, and relevance

Always cite URLs. Prefer authoritative sources. Be thorough but concise.`,
  model: config.model,
  tools: { webSearchTool },
});
