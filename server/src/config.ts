import "./lib/env.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  databaseUrl: required("DATABASE_URL"),
  deepinfraApiKey: required("DEEPINFRA_API_KEY"),
  model: process.env.MASTRA_MODEL ?? "deepinfra/deepseek-ai/DeepSeek-V3.2",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  tavilyKeyless: process.env.TAVILY_KEYLESS === "true",
  maxAgentSteps: 50,
};
