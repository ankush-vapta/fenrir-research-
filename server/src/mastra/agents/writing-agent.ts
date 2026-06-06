import { Agent } from "@mastra/core/agent";
import { config } from "../../config.js";

export const writingAgent = new Agent({
  id: "writing-agent",
  name: "Writing Agent",
  description:
    "Drafts a polished structured research report from analysis output. Returns markdown with executive summary, findings, sources, and conclusion.",
  instructions: `You are a technical writer. Produce a structured research report in markdown with these sections:

## Executive Summary
2-3 paragraph overview of the topic and main conclusions.

## Key Findings
Bullet points of the most important discoveries, each with brief evidence.

## Source References
Numbered list of sources with title and URL.

## Conclusion
Final synthesis and implications.

Write clearly for a professional audience. Every claim should trace back to the analysis.`,
  model: config.model,
});
