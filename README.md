# Fenrir Deep Research

Multi-agent deep research system — TypeScript, React, Node.js, Mastra, PostgreSQL.

User submits a topic → 4 AI agents research autonomously → live feed + structured report + observability dashboard.

---

## Prerequisites

Install these **before** cloning:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | 20 or 22 | https://nodejs.org |
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop/ |

> **Docker must be running** (open Docker Desktop, wait until it says "Running").

Optional: `nvm` to manage Node version (`nvm use 20`).

---

## Quick Start (3 commands)

```bash
git clone <your-repo-url>
cd fenrir-research
```

**One-time:** open `server/.env` and add your API keys (file auto-created on setup if missing).

```bash
npm install
npm run setup
npm run dev
```

That's it. Docker database starts automatically inside `npm run setup` — no pgAdmin, no manual DB creation.

Open **http://localhost:5173**

| | |
|---|---|
| **Login email** | `demo@fenrir.local` |
| **Login password** | `demo1234` |
| **API health check** | http://localhost:4000/health |

---

## API Keys (required)

Edit `server/.env` and replace placeholder values:

```env
DEEPINFRA_API_KEY="your-key-here"
TAVILY_API_KEY="your-key-here"
```

| Key | Get it from | Notes |
|-----|-------------|-------|
| `DEEPINFRA_API_KEY` | https://deepinfra.com/dash/api_keys | **Account balance required** → https://deepinfra.com/dash/billing |
| `TAVILY_API_KEY` | https://app.tavily.com/ | Free tier: 1000 searches/month |

### Do NOT change these (defaults work with Docker)

```env
DATABASE_URL="postgresql://fenrir:fenrir_secret@localhost:5433/fenrir_research"
MASTRA_MODEL="deepinfra/deepseek-ai/DeepSeek-V3.2"
PORT=4000
CLIENT_URL="http://localhost:5173"
```

> `.env` is gitignored — you must create it from `.env.example` after cloning.

---

## What `npm run setup` does

Runs automatically on first setup:

1. **`docker compose up -d`** — starts PostgreSQL container (`fenrir-postgres` on port **5433**)
2. **`prisma migrate deploy`** — creates all database tables
3. **`prisma db seed`** — creates demo user (`demo@fenrir.local` / `demo1234`)

No pgAdmin or manual database creation needed.

---

## Verify everything is working

### 1. Database running

```bash
docker ps
```

Expected output includes:

```
fenrir-postgres   ...   Up   0.0.0.0:5433->5432/tcp
```

### 2. API running

```bash
curl http://localhost:4000/health
```

Expected: `{"ok":true}`

### 3. Login works

Open http://localhost:5173 → login with demo credentials.

### 4. Research works

Submit a topic → live agent feed should update → report appears when done.

> If research fails with `Payment Required (402)` → add balance on DeepInfra billing page. This is **not** a database issue.

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Start Docker DB + migrate + seed (**run once after clone**) |
| `npm run dev` | Start API server (:4000) + React UI (:5173) |
| `npm run build` | Production build (server + client) |
| `npm run db:up` | Start PostgreSQL container only |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:seed` | Re-create demo user |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:push` | Push schema directly (fallback if migrate fails) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot connect to database` | Open Docker Desktop → run `npm run db:up` or `npm run setup` |
| `permission denied to create database` | Don't use local PostgreSQL — use Docker (`npm run setup`) |
| `Port 5433 already in use` | Run `npm run db:down`, then `npm run setup` again |
| `Port 4000 already in use` | Kill other process: `lsof -i :4000` then `kill <PID>` |
| `Port 5173 already in use` | Kill other process: `lsof -i :5173` then `kill <PID>` |
| `Payment Required` / 402 error | Add balance at https://deepinfra.com/dash/billing |
| `ECONNREFUSED 127.0.0.1:4000` on page load | Wait 2 seconds, refresh browser — API starts slightly after UI |
| Login fails | Run `npm run db:seed` to recreate demo user |
| `npm run setup` fails on migrate | Try `npm run db:push` then `npm run db:seed` |

---

## Project Structure

```
fenrir-research/
├── client/                 # React + Vite frontend
│   └── src/pages/
│       ├── LoginPage.tsx
│       ├── ResearchPage.tsx
│       └── ObservabilityPage.tsx
├── server/                 # Node.js + Express + Mastra
│   ├── .env.example        # Copy to .env and add keys
│   ├── prisma/             # Database schema + migrations
│   └── src/
│       ├── mastra/agents/  # Orchestrator, Research, Analysis, Writing
│       ├── mastra/tools/   # Tavily web search tool
│       ├── routes/         # Auth, research, observability APIs
│       └── services/       # Pipeline + observability logging
├── docker-compose.yml      # PostgreSQL (auto-created on setup)
└── package.json            # Root scripts
```

---

## Architecture

```
User → React UI → Express API → Mastra Orchestrator (Supervisor)
                                    ├── Research Agent  → Tavily web search
                                    ├── Analysis Agent  → evaluate findings
                                    └── Writing Agent   → structured report
                                         ↓
                              PostgreSQL (sessions, traces, steps)
```

### Agent roles

| Agent | Responsibility |
|-------|----------------|
| **Orchestrator** | Breaks topic into sub-tasks, delegates, synthesizes output |
| **Research** | Web search via Tavily, gathers sources with URLs |
| **Analysis** | Extracts key findings, resolves contradictions |
| **Writing** | Markdown report: executive summary, findings, sources, conclusion |

### How Mastra is used

- **Supervisor pattern:** Orchestrator registers sub-agents via `agents: { researchAgent, analysisAgent, writingAgent }`
- **Delegation:** Native Mastra supervisor primitives — `orchestratorAgent.stream()` with `maxSteps: 50`
- **Tools:** Research agent uses `createTool()` for Tavily web search
- **Memory:** LibSQL store on orchestrator for session context
- **Inter-agent communication:** Mastra native primitives only (no custom message bus)

### Observability (custom built)

Dashboard accessible from main app nav. All data persisted in PostgreSQL:

| View | What's shown |
|------|--------------|
| **Per session** | Total cost, wall-clock duration, step count, status (completed / failed / max steps) |
| **Per agent trace** | Inputs, outputs, tools called, token usage, estimated cost, duration, errors |
| **Per step** | Tool call args + return values, token counts, timestamps |

---

## Database (Docker)

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `5433` |
| Database | `fenrir_research` |
| User | `fenrir` |
| Password | `fenrir_secret` |

Tables: `User`, `ResearchSession`, `AgentTrace`, `StepDetail`, `FeedEvent`

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (Docker default — do not change) |
| `DEEPINFRA_API_KEY` | Yes | LLM API key (DeepInfra) |
| `TAVILY_API_KEY` | Yes | Web search API key |
| `MASTRA_MODEL` | No | Default: `deepinfra/deepseek-ai/DeepSeek-V3.2` |
| `JWT_SECRET` | No | Auth token secret (change in production) |
| `PORT` | No | API port (default: 4000) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
