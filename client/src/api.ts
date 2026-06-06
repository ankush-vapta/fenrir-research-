const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>("/auth/me"),

  startResearch: (topic: string) =>
    request<{ sessionId: string; topic: string }>("/research", {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),

  getSession: (sessionId: string) =>
    request<{ session: ResearchSession; isRunning: boolean }>(`/research/${sessionId}`),

  listSessions: () => request<{ sessions: ResearchSession[] }>("/research"),

  getObservabilitySession: (sessionId: string) =>
    request<{ session: ObservabilitySession }>(`/observability/sessions/${sessionId}`),

  listObservabilitySessions: () =>
    request<{ sessions: ResearchSession[] }>("/observability/sessions"),
};

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: "RUNNING" | "COMPLETED" | "MAX_STEPS_REACHED" | "FAILED";
  totalCost: number;
  totalDurationMs: number;
  totalSteps: number;
  promptTokens?: number;
  completionTokens?: number;
  reportMarkdown?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface FeedEvent {
  id: string;
  agentId: string;
  agentName: string;
  eventType: string;
  message: string;
  timestamp: string;
  payload?: unknown;
}

export interface StepDetail {
  id: string;
  stepIndex: number;
  eventType: string;
  toolName?: string | null;
  toolArgs?: unknown;
  toolResult?: unknown;
  promptTokens: number;
  completionTokens: number;
  message?: string | null;
  timestamp: string;
}

export interface AgentTrace {
  id: string;
  agentId: string;
  agentName: string;
  status: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  durationMs: number;
  error?: string | null;
  retries: number;
  steps: StepDetail[];
}

export interface ObservabilitySession extends ResearchSession {
  reportJson?: {
    executiveSummary: string;
    keyFindings: string[];
    sourceReferences: Array<{ title: string; url: string }>;
    conclusion: string;
  } | null;
  agentTraces: AgentTrace[];
  feedEvents: FeedEvent[];
}
