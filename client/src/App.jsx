import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
    getProblems,
    getProblemDetails,
    getSubmissionStatus,
    logoutUser,
    submitCode,
} from "./api";
import "./App.css";
import { clearStoredAuth, getStoredAuth } from "./auth";
import { upsertSubmissionHistoryEntry } from "./submissionHistory";

const templates = {
    cpp: `#include <bits/stdc++.h>\n\nint main() {\n    int x;\n    std::cin >> x;\n    std::cout << x + 1;\n    return 0;\n}`,
    python: `x = int(input())\nprint(x + 1)`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNextInt()) {\n            int x = scanner.nextInt();\n            System.out.println(x + 1);\n        }\n        scanner.close();\n    }\n}`
};

const monacoLanguageMap = {
    cpp: "cpp",
    python: "python",
    java: "java",
};

const statusVisuals = {
    PENDING: { label: "Queued", tone: "queued" },
    RUNNING: { label: "Running", tone: "running" },
    COMPLETED: { label: "Completed", tone: "done" },
    FAILED: { label: "Failed", tone: "failed" },
};

const basicRefactor = (sourceCode) => {
    const normalized = sourceCode
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[\t ]+$/g, ""))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");

    return normalized.trimEnd();
};

function App() {
    const [language, setLanguage] = useState("cpp");
    const [code, setCode] = useState(templates.cpp);
    const [problems, setProblems] = useState([]);
    const [selectedProblemId, setSelectedProblemId] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [problemsError, setProblemsError] = useState("");
    const [submissionState, setSubmissionState] = useState({
        id: null,
        status: "",
        verdict: "",
        loading: false,
        error: "",
        timeTaken: null,
        memoryUsed: null,
        historyContext: null,
    });
    const [auth, setAuth] = useState(() => getStoredAuth());
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [problemBriefOpen, setProblemBriefOpen] = useState(true);
    const [showError, setShowError] = useState(false);
    const [copyMessage, setCopyMessage] = useState("");
    const [editorMessage, setEditorMessage] = useState("");
    const [problemQuery, setProblemQuery] = useState("");
    const editorRef = useRef(null);

    useEffect(() => {
        if (!sidebarOpen) return;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sidebarOpen]);

    useEffect(() => {
        setAuth(getStoredAuth());
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadProblems = async () => {
            setProblemsLoading(true);
            setProblemsError("");
            try {
                const data = await getProblems();
                if (!isMounted) return;
                const list = Array.isArray(data) ? data : [];
                setProblems(list);
                if (list.length > 0) {
                    setSelectedProblemId(list[0].id);
                }
            } catch (error) {
                if (!isMounted) return;
                setProblemsError("Failed to load problems.");
            } finally {
                if (isMounted) setProblemsLoading(false);
            }
        };

        loadProblems();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        setCode(templates[language] || "");
    }, [language]);

    useEffect(() => {
        if (!selectedProblemId) {
            setSelectedProblem(null);
            return;
        }

        let isMounted = true;
        const fromList = problems.find((problem) => problem.id === selectedProblemId);
        if (fromList) {
            setSelectedProblem(fromList);
        }

        const loadDetails = async () => {
            try {
                const data = await getProblemDetails(selectedProblemId);
                if (!isMounted) return;
                setSelectedProblem(data);
            } catch (error) {
                if (!isMounted) return;
                if (fromList) {
                    setSelectedProblem(fromList);
                }
            }
        };

        loadDetails();
        return () => {
            isMounted = false;
        };
    }, [selectedProblemId, problems]);

    const handleSubmit = async () => {
        if (!selectedProblemId) {
            setSubmissionState((prev) => ({
                ...prev,
                error: "Select a problem first.",
            }));
            return;
        }
        if (!code.trim()) {
            setSubmissionState((prev) => ({
                ...prev,
                error: "Code cannot be empty.",
            }));
            return;
        }
        const historyContext = {
            problemId: selectedProblemId,
            problemTitle: selectedProblem?.title || `Problem ${selectedProblemId}`,
            language,
            submittedAt: new Date().toISOString(),
        };
        setSubmissionState((prev) => ({
            ...prev,
            loading: true,
            status: "PENDING",
            verdict: "",
            error: "",
            timeTaken: null,
            memoryUsed: null,
            id: null,
            historyContext,
        }));

        try {
            const submission = await submitCode({
                problemId: selectedProblemId,
                language,
                code,
            });
            const id = submission?.id || null;

            if (id) {
                upsertSubmissionHistoryEntry({
                    id,
                    ...historyContext,
                    status: submission?.status || "PENDING",
                    verdict: submission?.verdict || "",
                    timeTaken: submission?.timeTaken ?? null,
                    memoryUsed: submission?.memoryUsed ?? null,
                    error: submission?.error || "",
                    submittedAt: submission?.submissionTime || historyContext.submittedAt,
                    updatedAt: historyContext.submittedAt,
                });
            }

            setSubmissionState((prev) => ({
                ...prev,
                id,
                status: submission?.status || "PENDING",
                verdict: submission?.verdict || "",
                error: submission?.error || "",
                timeTaken: submission?.timeTaken ?? null,
                memoryUsed: submission?.memoryUsed ?? null,
                loading: id ? prev.loading : false,
                historyContext,
            }));
        } catch (error) {
            setSubmissionState((prev) => ({
                ...prev,
                error: "Failed to submit solution.",
                loading: false,
            }));
        }
    };

    useEffect(() => {
        if (!submissionState.id) return;

        let isMounted = true;
        let timeoutId;

        const poll = async () => {
            try {
                const result = await getSubmissionStatus(submissionState.id);
                if (!isMounted) return;
                setSubmissionState((prev) => ({
                    ...prev,
                    status: result?.status || "",
                    verdict: result?.verdict || "",
                    error: result?.error || "",
                    timeTaken: result?.timeTaken ?? null,
                    memoryUsed: result?.memoryUsed ?? null,
                }));

                upsertSubmissionHistoryEntry({
                    id: submissionState.id,
                    ...(submissionState.historyContext || {}),
                    status: result?.status || "",
                    verdict: result?.verdict || "",
                    timeTaken: result?.timeTaken ?? null,
                    memoryUsed: result?.memoryUsed ?? null,
                    error: result?.error || "",
                    updatedAt: new Date().toISOString(),
                });

                if (result?.status === "COMPLETED" || result?.status === "FAILED") {
                    setSubmissionState((prev) => ({
                        ...prev,
                        loading: false,
                    }));
                    return;
                }
            } catch (error) {
                if (!isMounted) return;
                setSubmissionState((prev) => ({
                    ...prev,
                    error: "Failed to fetch submission status.",
                    loading: false,
                }));
                return;
            }

            timeoutId = setTimeout(poll, 1500);
        };

        poll();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [submissionState.id]);

    const copySubmissionId = async () => {
        if (!submissionState.id) return;
        try {
            await navigator.clipboard.writeText(submissionState.id);
            setCopyMessage("Copied!");
            setTimeout(() => setCopyMessage(""), 2000);
        } catch (e) {
            setCopyMessage("Copy failed");
            setTimeout(() => setCopyMessage(""), 2000);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
        }
        clearStoredAuth();
        setAuth(null);
    };

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
    };

    const handleRefactor = async () => {
        if (!code.trim()) {
            setEditorMessage("Nothing to refactor.");
            return;
        }

        try {
            if (editorRef.current) {
                const formatAction = editorRef.current.getAction("editor.action.formatDocument");
                if (formatAction) {
                    await formatAction.run();
                    const formatted = editorRef.current.getValue();
                    if (formatted !== code) {
                        setCode(formatted);
                        setEditorMessage("Refactor complete: code formatted.");
                        return;
                    }
                }
            }
        } catch (error) {
        }

        const refactored = basicRefactor(code);
        setCode(refactored);
        setEditorMessage(refactored === code ? "Code already clean." : "Refactor complete: formatting and cleanup applied.");
    };

    const handleResetCode = () => {
        setCode(templates[language] || "");
        setEditorMessage(`Editor reset to ${language.toUpperCase()} template.`);
    };

    useEffect(() => {
        if (!editorMessage) return;
        const timeoutId = setTimeout(() => setEditorMessage(""), 2400);
        return () => clearTimeout(timeoutId);
    }, [editorMessage]);

    const shortSubmissionId = submissionState.id ? `${submissionState.id.substring(0, 8)}...` : "-";
    const hasTerminalStatus = submissionState.status === "COMPLETED" || submissionState.status === "FAILED";
    const statusVisual = statusVisuals[submissionState.status] || {
        label: submissionState.status || "Unknown",
        tone: "queued",
    };
    const difficulty = selectedProblem?.difficulty || "UNKNOWN";
    const difficultyTone = String(difficulty).toLowerCase();
    const filteredProblems = useMemo(() => {
        const term = problemQuery.trim().toLowerCase();
        if (!term) return problems;

        return problems.filter((problem) => {
            const haystack = [
                problem.title,
                problem.difficulty,
                problem.description,
                String(problem.id ?? ""),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [problemQuery, problems]);

    return (
        <div className="app">
            <header className="app-header">
                <div className="brand">
                    <div className="logo-wrap" aria-hidden>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12L9 6L15 12L9 18L3 12Z" fill="white" />
                            <path d="M15 6L21 12L15 18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="app-title">Online Judge Studio</h1>
                        <p className="app-subtitle">Practice. Submit. Improve.</p>
                    </div>
                </div>

                <div className="header-stats" aria-label="Quick stats">
                    <span className="chip">Problems: {problems.length}</span>
                    <span className={`chip difficulty-chip ${difficultyTone}`}>{difficulty}</span>
                    {selectedProblem?.testCaseCount != null && (
                        <span className="chip">Tests: {selectedProblem.testCaseCount}</span>
                    )}
                </div>

                <div className="auth-bar">
                    <Link className="history-link" to="/history">History</Link>
                    {auth?.username ? (
                        <>
                            <span className="auth-user">Signed in as <strong>{auth.username}</strong></span>
                            <button className="auth-cta" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link className="auth-link" to="/login">Login</Link>
                            <Link className="auth-cta" to="/register">Register</Link>
                        </>
                    )}
                </div>
            </header>

            <div className={`layout ${sidebarOpen ? "" : "list-collapsed"}`}>
                <div className="left-rail">
                    {sidebarOpen ? (
                        <div className={`problem-drawer-wrap ${sidebarOpen ? "open" : "closed"}`} aria-hidden={!sidebarOpen}>
                            <aside className="panel sidebar drawer">
                                <div className="drawer-header">
                                    <div>
                                        <p className="section-eyebrow">Problem Library</p>
                                        <h2 className="sidebar-title">All Problems</h2>
                                    </div>
                                    <button
                                        className="panel-toggle"
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        aria-expanded={sidebarOpen}
                                        aria-label="Minimize problem list"
                                    >
                                        <span aria-hidden>◂</span>
                                        <span>Minimize</span>
                                    </button>
                                </div>

                                <div className="problem-tools">
                                    <input
                                        className="problem-search"
                                        type="text"
                                        value={problemQuery}
                                        onChange={(event) => setProblemQuery(event.target.value)}
                                        placeholder="Search title, difficulty..."
                                        aria-label="Search problems"
                                    />
                                    <span className="problem-counter">Showing {filteredProblems.length} / {problems.length}</span>
                                </div>

                                {problemsLoading && <p>Loading problems...</p>}
                                {problemsError && <p className="status-error">{problemsError}</p>}

                                <div className="problem-list">
                                    {filteredProblems.map((problem, index) => {
                                        const tone = String(problem.difficulty || "unknown").toLowerCase();
                                        return (
                                            <div
                                                key={problem.id}
                                                className={`problem-card ${selectedProblemId === problem.id ? "active" : ""}`}
                                                style={{ "--anim-index": index }}
                                                onClick={() => {
                                                    setSelectedProblemId(problem.id);
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                        setSelectedProblemId(problem.id);
                                                    }
                                                }}
                                            >
                                                <div className="problem-row">
                                                    <h3>{problem.title}</h3>
                                                    <span className="problem-index">{String(index + 1).padStart(2, "0")}</span>
                                                </div>
                                                <div className="problem-meta">
                                                    {problem.difficulty && <span className={`pill ${tone}`}>{problem.difficulty}</span>}
                                                    {problem.testCaseCount != null && <span className="pill neutral">{problem.testCaseCount} tests</span>}
                                                    {problem.timeLimitSeconds != null && <span className="pill neutral">{problem.timeLimitSeconds}s</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!problemsLoading && filteredProblems.length === 0 && (
                                        <div className="problem-list-empty">No problems match your search.</div>
                                    )}
                                </div>
                            </aside>
                        </div>
                    ) : (
                        <div className="panel list-collapsed-card">
                            <button
                                className="collapsed-panel-button"
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-expanded={sidebarOpen}
                                aria-label="Show problem list"
                            >
                                <span className="collapsed-panel-icon" aria-hidden>▸</span>
                                <span className="collapsed-panel-label">Problems</span>
                                <span className="collapsed-panel-count">{problems.length}</span>
                            </button>
                        </div>
                    )}

                </div>

                <main className="workspace-main">
                    <section className={`panel problem-hero ${problemBriefOpen ? "" : "brief-collapsed"}`}>
                        <div className="problem-hero-bar">
                            <div className="detail-header">
                                <div>
                                    <p className="section-eyebrow">Problem Brief</p>
                                    <h2>{selectedProblem?.title || "Select a problem"}</h2>
                                </div>
                                <div className="hero-actions">
                                    <span className={`badge ${difficultyTone}`}>{difficulty}</span>
                                    <button
                                        className="panel-toggle"
                                        type="button"
                                        onClick={() => setProblemBriefOpen((prev) => !prev)}
                                        aria-expanded={problemBriefOpen}
                                        aria-label={problemBriefOpen ? "Hide problem brief" : "Show problem brief"}
                                    >
                                        <span aria-hidden>{problemBriefOpen ? "▴" : "▾"}</span>
                                        <span>{problemBriefOpen ? "Hide Brief" : "Show Brief"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {problemBriefOpen && (
                            <>
                                <div className="problem-hero-copy">
                                    <div className="problem-markdown">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {selectedProblem?.description || "Choose a problem from the list to view its statement."}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div className="problem-hero-meta">
                                    <div className="meta-card">
                                        <span className="meta-label">Difficulty</span>
                                        <strong>{selectedProblem?.difficulty || "Unknown"}</strong>
                                    </div>
                                    <div className="meta-card">
                                        <span className="meta-label">Time Limit</span>
                                        <strong>{selectedProblem?.timeLimitSeconds != null ? `${selectedProblem.timeLimitSeconds}s` : "N/A"}</strong>
                                    </div>
                                    <div className="meta-card">
                                        <span className="meta-label">Memory</span>
                                        <strong>{selectedProblem?.memoryLimitMb != null ? `${selectedProblem.memoryLimitMb} MB` : "N/A"}</strong>
                                    </div>
                                    <div className="meta-card">
                                        <span className="meta-label">Test Cases</span>
                                        <strong>{selectedProblem?.testCaseCount != null ? selectedProblem.testCaseCount : "N/A"}</strong>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    <div className="workspace-grid">
                        <section className="panel code-panel">
                            <div className="studio-head">
                                <div>
                                    <p className="section-eyebrow">Workspace</p>
                                    <h2 className="studio-title">Code Editor</h2>
                                </div>
                                <p className="studio-copy">Write, clean up, and submit from one place.</p>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label htmlFor="language">Language</label>
                                    <select
                                        id="language"
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                    >
                                        <option value="cpp">C++</option>
                                        <option value="python">Python 3</option>
                                        <option value="java">Java</option>
                                    </select>
                                </div>
                            </div>

                            <div className="editor-toolbar" role="toolbar" aria-label="Code editor actions">
                                <button className="tool-btn" type="button" onClick={handleRefactor}>Refactor</button>
                                <button className="tool-btn ghost" type="button" onClick={handleResetCode}>Reset</button>
                                {editorMessage && <span className="editor-message">{editorMessage}</span>}
                            </div>

                            <div className="editor-shell">
                                <Editor
                                    height="600px"
                                    language={monacoLanguageMap[language] || "plaintext"}
                                    value={code}
                                    onChange={(value) => setCode(value || "")}
                                    onMount={handleEditorMount}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineNumbers: "on",
                                        smoothScrolling: true,
                                        padding: { top: 10, bottom: 10 },
                                        automaticLayout: true,
                                        tabSize: 4,
                                        insertSpaces: true,
                                        formatOnPaste: true,
                                        formatOnType: true,
                                    }}
                                />
                            </div>

                            <div className="action-row">
                                <button className="submit-btn" onClick={handleSubmit} disabled={submissionState.loading}>
                                    {submissionState.loading ? "Judging..." : "Submit Solution"}
                                </button>
                                {submissionState.status && (
                                    <span className={`judge-state ${statusVisual.tone}`}>
                                        <span className="judge-state-dot" />
                                        {statusVisual.label}
                                    </span>
                                )}
                            </div>
                        </section>

                        <aside className="panel insights-panel">
                            <div className="insights-head">
                                <div>
                                    <p className="section-eyebrow">Submission Status</p>
                                    <h2 className="studio-title">Run Details</h2>
                                </div>
                                <p className="studio-copy">
                                    {submissionState.status
                                        ? hasTerminalStatus
                                            ? "Latest submission id, verdict, time, memory, and error details."
                                            : "Watching your current submission status and runtime details."
                                        : "Submit code to see the current submission id, status, verdict, time, memory, and errors here."}
                                </p>
                            </div>

                            {submissionState.status ? (
                                <div className="status-card">
                                    <div className="status-card-header">
                                        <div>
                                            <div><strong>ID:</strong> {shortSubmissionId}</div>
                                            <div className="status-line">
                                                <strong>Status:</strong>
                                                <span className={`status-pill ${statusVisual.tone}`}>{statusVisual.label}</span>
                                            </div>
                                        </div>
                                        <div className="status-actions">
                                            {submissionState.id && (
                                                <button className="copy-btn" onClick={copySubmissionId} aria-label="Copy submission id">
                                                    Copy ID
                                                </button>
                                            )}
                                            {copyMessage && <span className="copy-feedback">{copyMessage}</span>}
                                            {submissionState.error && (
                                                <button className="error-toggle" onClick={() => setShowError((s) => !s)}>
                                                    {showError ? "Hide Error" : "Show Error"}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="status-summary">
                                        {submissionState.verdict && (
                                            <div className={`verdict ${submissionState.verdict === "ACCEPTED" ? "ok" : "bad"}`}>
                                                {submissionState.verdict}
                                            </div>
                                        )}
                                        {submissionState.timeTaken != null && (
                                            <div><strong>Time:</strong> {submissionState.timeTaken} ms</div>
                                        )}
                                        {submissionState.memoryUsed != null && (
                                            <div><strong>Memory:</strong> {submissionState.memoryUsed} KB</div>
                                        )}
                                    </div>

                                    {submissionState.status === "FAILED" && submissionState.error && (
                                        <div className="error-block">
                                            <strong className="error-title">Error trace</strong>
                                            {showError ? (
                                                <div className="error-preview" role="region">
                                                    <pre className="error-content expanded">{submissionState.error}</pre>
                                                </div>
                                            ) : (
                                                <div className="error-preview compact">
                                                    <pre className="error-content compact">{submissionState.error}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="submission-placeholder">
                                    <div className="submission-placeholder-mark" aria-hidden>01</div>
                                    <h3>No active run</h3>
                                    <p>Pick a problem, write your answer, and submit once you are ready. Verdict, time, memory, and errors show up here.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
