import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ObservabilitySession, type ResearchSession } from "../api";

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number) {
  return `$${cost.toFixed(4)}`;
}

export default function ObservabilityPage() {
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [detail, setDetail] = useState<ObservabilitySession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listObservabilitySessions()
      .then(({ sessions }) => setSessions(sessions))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setDetail(null);
      return;
    }

    api
      .getObservabilitySession(sessionId)
      .then(({ session }) => setDetail(session))
      .catch((err) => setError(err.message));
  }, [sessionId]);

  return (
    <div className="obs-layout">
      <section className="panel">
        <h2>Observability Dashboard</h2>
        <p>Per-session cost, duration, agent traces, and step-level detail.</p>
        {error && <div className="error-box">{error}</div>}

        <div className="session-list">
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/observability/${session.id}`}
              className={`session-card ${sessionId === session.id ? "active" : ""}`}
            >
              <div>
                <strong>{session.topic}</strong>
                <p>{new Date(session.startedAt).toLocaleString()}</p>
              </div>
              <div className="session-stats">
                <span className={`status-pill ${session.status.toLowerCase()}`}>
                  {session.status}
                </span>
                <span>{formatCost(session.totalCost)}</span>
                <span>{formatDuration(session.totalDurationMs)}</span>
                <span>{session.totalSteps} steps</span>
              </div>
            </Link>
          ))}
          {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
        </div>
      </section>

      {detail && (
        <section className="panel detail-panel">
          <h2>Session Detail</h2>
          <div className="metrics-grid">
            <div className="metric">
              <span>Total Cost</span>
              <strong>{formatCost(detail.totalCost)}</strong>
            </div>
            <div className="metric">
              <span>Duration</span>
              <strong>{formatDuration(detail.totalDurationMs)}</strong>
            </div>
            <div className="metric">
              <span>Steps</span>
              <strong>{detail.totalSteps}</strong>
            </div>
            <div className="metric">
              <span>Status</span>
              <strong>{detail.status}</strong>
            </div>
            <div className="metric">
              <span>Prompt Tokens</span>
              <strong>{detail.promptTokens ?? 0}</strong>
            </div>
            <div className="metric">
              <span>Completion Tokens</span>
              <strong>{detail.completionTokens ?? 0}</strong>
            </div>
          </div>

          {detail.reportJson && (
            <>
              <h3>Structured Report Sections</h3>
              <pre className="report-json">
                {JSON.stringify(detail.reportJson, null, 2)}
              </pre>
            </>
          )}

          <h3>Per Agent Traces</h3>
          <div className="trace-list">
            {detail.agentTraces.map((trace) => (
              <article key={trace.id} className="trace-card">
                <header>
                  <div>
                    <strong>{trace.agentName}</strong>
                    <p>
                      {trace.status} · {formatDuration(trace.durationMs)} ·{" "}
                      {formatCost(trace.estimatedCost)} · {trace.promptTokens + trace.completionTokens}{" "}
                      tokens
                    </p>
                  </div>
                  {trace.error && <span className="error-text">{trace.error}</span>}
                </header>

                <details>
                  <summary>{trace.steps.length} steps</summary>
                  <div className="steps">
                    {trace.steps.map((step) => (
                      <div key={step.id} className="step-row">
                        <div>
                          <strong>
                            #{step.stepIndex} {step.eventType}
                            {step.toolName ? ` · ${step.toolName}` : ""}
                          </strong>
                          <p>{step.message}</p>
                          <small>{new Date(step.timestamp).toLocaleTimeString()}</small>
                        </div>
                        <div className="step-meta">
                          <span>in: {step.promptTokens}</span>
                          <span>out: {step.completionTokens}</span>
                        </div>
                        {(step.toolArgs || step.toolResult) && (
                          <pre>{JSON.stringify({ args: step.toolArgs, result: step.toolResult }, null, 2)}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
