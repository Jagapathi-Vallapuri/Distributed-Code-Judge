import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import {
    clearSubmissionHistory,
    getSubmissionHistory,
} from "./submissionHistory";

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
};

const shortId = (value) => {
    if (!value) return "-";
    return value.length > 10 ? `${value.slice(0, 8)}...` : value;
};

function SubmissionHistoryPage() {
    const [history, setHistory] = useState(() => getSubmissionHistory());

    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => {
            const left = new Date(b.updatedAt || b.submittedAt || 0).getTime();
            const right = new Date(a.updatedAt || a.submittedAt || 0).getTime();
            return left - right;
        });
    }, [history]);

    const handleClear = () => {
        clearSubmissionHistory();
        setHistory([]);
    };

    return (
        <div className="app history-app">
            <header className="app-header">
                <div className="brand">
                    <div className="logo-wrap" aria-hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12L9 6L15 12L9 18L3 12Z" fill="white" />
                            <path d="M15 6L21 12L15 18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="app-title">Submission History</h1>
                        <p className="app-subtitle">Every submission made in this browser session.</p>
                    </div>
                </div>

                <div className="header-stats">
                    <span className="chip">Submissions: {sortedHistory.length}</span>
                </div>

                <div className="auth-bar">
                    <Link className="auth-link" to="/">Back to judge</Link>
                    <button className="auth-cta" type="button" onClick={handleClear} disabled={sortedHistory.length === 0}>
                        Clear history
                    </button>
                </div>
            </header>

            <main className="panel history-panel">
                {sortedHistory.length === 0 ? (
                    <div className="submission-placeholder">
                        <div className="submission-placeholder-mark" aria-hidden>00</div>
                        <h3>No submissions yet</h3>
                        <p>Submit a solution and it will appear here for the rest of this browser session.</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {sortedHistory.map((entry, index) => (
                            <article className="history-card" key={`${entry.id}-${index}`}>
                                <div className="history-card-top">
                                    <div>
                                        <p className="section-eyebrow">{formatDateTime(entry.submittedAt)}</p>
                                        <h2>{entry.problemTitle || `Problem ${entry.problemId ?? "-"}`}</h2>
                                    </div>
                                    <span className="chip history-id">{shortId(entry.id)}</span>
                                </div>

                                <div className="history-meta">
                                    <span className="pill neutral">{entry.language || "unknown"}</span>
                                    {entry.status && <span className={`status-pill ${(entry.status || "").toLowerCase()}`}>{entry.status}</span>}
                                    {entry.verdict && <span className={`verdict ${entry.verdict === "ACCEPTED" ? "ok" : "bad"}`}>{entry.verdict}</span>}
                                </div>

                                <div className="history-grid">
                                    <div><span className="meta-label">Problem ID</span><strong>{entry.problemId ?? "-"}</strong></div>
                                    <div><span className="meta-label">Updated</span><strong>{formatDateTime(entry.updatedAt)}</strong></div>
                                    <div><span className="meta-label">Time</span><strong>{entry.timeTaken != null ? `${entry.timeTaken} ms` : "-"}</strong></div>
                                    <div><span className="meta-label">Memory</span><strong>{entry.memoryUsed != null ? `${entry.memoryUsed} KB` : "-"}</strong></div>
                                </div>

                                {entry.error && (
                                    <div className="history-error">
                                        <span className="meta-label">Error</span>
                                        <pre>{entry.error}</pre>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default SubmissionHistoryPage;
