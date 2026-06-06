import { createTool } from "@mastra/core/tools";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { config } from "../../config.js";

async function runTavilySearch(query: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.tavilyApiKey) {
    headers.Authorization = `Bearer ${config.tavilyApiKey}`;
  } else if (config.tavilyKeyless) {
    headers["X-Tavily-Access-Mode"] = "keyless";
  } else {
    throw new Error("Set TAVILY_API_KEY or TAVILY_KEYLESS=true in .env");
  }

  if (config.tavilyApiKey) {
    const client = tavily({ apiKey: config.tavilyApiKey });
    const response = await client.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      includeAnswer: true,
    });
    return response;
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily search failed: ${response.status} ${text}`);
  }

  return response.json();
}

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Search the web for up-to-date information on a topic. Returns ranked results with titles, URLs, and content snippets.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  outputSchema: z.object({
    answer: z.string().optional(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    const data = (await runTavilySearch(query)) as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string }>;
    };

    return {
      answer: data.answer,
      results: (data.results ?? []).map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
      })),
    };
  },
});
