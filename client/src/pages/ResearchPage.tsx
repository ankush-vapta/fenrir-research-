import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { api, type FeedEvent } from "../api";

export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    if (!sessionId) return;

    const token = localStorage.getItem("token");
    const controller = new AbortController();

    void (async () => {
      const response = await fetch(`/api/research/${sessionId}/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setError("Failed to connect to live feed");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim()) as FeedEvent & {
            type?: string;
            reportMarkdown?: string;
            status?: string;
          };

          if (payload.type === "session_end") {
            setStatus(payload.status ?? "COMPLETED");
            if (payload.reportMarkdown) setReport(payload.reportMarkdown);
            setLoading(false);
            continue;
          }

          setEvents((prev) => {
            if (prev.some((e) => e.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      }
    })();

    return () => controller.abort();
  }, [sessionId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setEvents([]);
    setReport(null);
    setStatus("RUNNING");

    try {
      const { sessionId: id } = await api.startResearch(topic.trim());
      setSessionId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start research");
      setLoading(false);
    }
  };

  return (
    <div className="research-layout">
      <section className="panel">
        <h2>Research Topic</h2>
        <form onSubmit={onSubmit} className="topic-form">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Impact of quantum computing on cryptography in 2026"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !topic.trim()}>
            {loading ? "Researching..." : "Start Research"}
          </button>
        </form>
        {error && <div className="error-box">{error}</div>}
        {sessionId && (
          <p className="meta">
            Session: <code>{sessionId}</code>{" "}
            {status && <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>}
            {status && status !== "RUNNING" && (
              <>
                {" "}
                · <Link to={`/observability/${sessionId}`}>View observability</Link>
              </>
            )}
          </p>
        )}
      </section>

      <section className="panel feed-panel">
        <h2>Live Agent Feed</h2>
        <div className="feed" ref={feedRef}>
          {events.length === 0 && <p className="muted">Agent activity will appear here...</p>}
          {events.map((event) => (
            <article key={event.id} className={`feed-item ${event.eventType}`}>
              <header>
                <strong>{event.agentName}</strong>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </header>
              <p>{event.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel report-panel">
        <h2>Research Report</h2>
        {!report && <p className="muted">Report will appear when the pipeline completes.</p>}
        {report && <div className="markdown-report"><ReactMarkdown>{report}</ReactMarkdown></div>}
      </section>
    </div>
  );
}
