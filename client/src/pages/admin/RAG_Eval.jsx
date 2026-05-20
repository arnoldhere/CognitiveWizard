import { useState, useEffect, useCallback, useRef } from "react";
import {
    AutoAwesome,
    Balance,
    ChatBubbleOutlineOutlined,
    ErrorOutlineOutlined,
    FileDownload,
    GpsFixed,
    HourglassEmpty,
    InsertChartOutlined,
    Inventory2,
    ManageSearch,
    PlayArrow,
    Psychology,
    Refresh,
    ReportProblem,
    Speed,
} from "@mui/icons-material";
import { API } from "../../services/api";

const METRIC_META = {
    faithfulness: { label: "Faithfulness", Icon: Balance, desc: "Answer grounded in retrieved context" },
    context_precision: { label: "Context Precision", Icon: GpsFixed, desc: "Retrieved chunks truly relevant" },
    context_recall: { label: "Context Recall", Icon: ManageSearch, desc: "Relevant info present in chunks" },
    hallucination_rate: { label: "Hallucination Rate", Icon: ReportProblem, desc: "Fraction of unsupported statements", invert: true },
    context_retrieval_ratio: { label: "Context Retrieval Ratio", Icon: Inventory2, desc: "Fraction of relevant chunks retrieved" },
    answer_relevancy: { label: "Answer Relevancy", Icon: ChatBubbleOutlineOutlined, desc: "Answer addresses the question" },
    context_awareness: { label: "Context Awareness", Icon: Psychology, desc: "LLM utilisation of retrieved context" },
    answer_generation_quality: { label: "Answer Generation Quality", Icon: AutoAwesome, desc: "Composite: faithfulness + relevancy" },
};

function grade(value, invert = false) {
    if (invert) {
        if (value <= 0.20) return "good";
        if (value <= 0.40) return "fair";
        return "poor";
    }
    if (value >= 0.80) return "good";
    if (value >= 0.60) return "fair";
    return "poor";
}

const GRADE_COLOR = {
    good: { bar: "#22c55e", text: "#16a34a", bg: "rgba(34,197,94,0.10)" },
    fair: { bar: "#f59e0b", text: "#b45309", bg: "rgba(245,158,11,0.10)" },
    poor: { bar: "#ef4444", text: "#b91c1c", bg: "rgba(239,68,68,0.10)" },
};

function MetricCard({ metricKey, value, interpretation }) {
    const meta = METRIC_META[metricKey];
    const Icon = meta.Icon;
    const g = interpretation?.[metricKey]?.toLowerCase() ?? grade(value, meta.invert);
    const color = GRADE_COLOR[g] ?? GRADE_COLOR.fair;
    const pct = Math.round(value * 100);

    return (
        <div style={{
            background: color.bg,
            border: `1.5px solid ${color.bar}`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            transition: "transform 0.2s",
        }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    <Icon fontSize="small" />
                    {meta.label}
                </span>
                <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 20, background: color.bar, color: "#fff",
                }}>{g.toUpperCase()}</span>
            </div>

            <div style={{ fontSize: 40, fontWeight: 900, color: color.text, lineHeight: 1 }}>
                {pct}<span style={{ fontSize: 18, fontWeight: 600 }}>%</span>
            </div>

            <div style={{ height: 6, borderRadius: 4, background: "rgba(148,163,184,0.2)", overflow: "hidden" }}>
                <div style={{
                    height: "100%", borderRadius: 4,
                    background: color.bar,
                    width: `${pct}%`,
                    transition: "width 1s cubic-bezier(.4,0,.2,1)",
                }} />
            </div>

            <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{meta.desc}</p>
        </div>
    );
}


function LatencyPanel({ latency }) {
    if (!latency) return null;
    const bars = [
        { label: "Retrieval", key: "retrieval_avg_ms", color: "#6366f1" },
        { label: "Generation", key: "generation_avg_ms", color: "#0ea5e9" },
        { label: "Total", key: "total_avg_ms", color: "#10b981" },
    ];
    const max = Math.max(...bars.map(b => latency[b.key] ?? 0), 1);

    return (
        <div style={{
            background: "rgba(15,23,42,0.6)",
            border: "1.5px solid rgba(148,163,184,0.15)",
            borderRadius: 14, padding: "18px 20px",
        }}>
            <h3 style={{
                margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.07em"
            }}>
                <Speed fontSize="small" style={{ verticalAlign: "middle", marginRight: 6 }} />
                Latency & Efficiency
            </h3>
            {bars.map(b => (
                <div key={b.key} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{b.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>
                            {latency[b.key] != null ? `${latency[b.key]} ms` : "N/A"}
                        </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(148,163,184,0.12)" }}>
                        <div style={{
                            height: "100%", borderRadius: 4, background: b.color,
                            width: `${Math.min(((latency[b.key] ?? 0) / max) * 100, 100)}%`,
                            transition: "width 1s ease",
                        }} />
                    </div>
                </div>
            ))}
            <p style={{ fontSize: 11, color: "#475569", margin: "8px 0 0" }}>
                RAGAS eval: {latency.ragas_evaluation_sec != null
                    ? `${latency.ragas_evaluation_sec}s` : "N/A"}
            </p>
        </div>
    );
}


export default function RAGEvalDashboard() {
    const [status, setStatus] = useState("idle");
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);
    const pollRef = useRef(null);

    const pollReport = useCallback(async () => {
        try {
            const { data } = await API.get("/rag-eval/report");
            if (data.status === "running") return; // keep polling
            clearInterval(pollRef.current);
            if (data.report?.error) {
                setError(data.report.error);
                setStatus("error");
            } else {
                setReport(data.report);
                setStatus("completed");
            }
        } catch (e) {
            clearInterval(pollRef.current);
            setError(e.message);
            setStatus("error");
        }
    }, []);

    useEffect(() => () => clearInterval(pollRef.current), []);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await API.get("/rag-eval/report");
                if (data.status === "completed" && data.report) {
                    setReport(data.report);
                    setStatus("completed");
                }
            } catch { /* no cached report, stay idle */ }
        })();
    }, []);

    const runEvaluation = async () => {
        setStatus("running");
        setError(null);
        try {
            await API.post("/rag-eval-auto/auto-evaluate?limit=50");
            pollRef.current = setInterval(pollReport, 3000);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message);
            setStatus("error");
        }
    };

    const exportReport = () => {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rag_eval_${report.evaluated_at?.replace(/[:.]/g, "-") ?? "report"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #020617 0%, #0f172a 60%, #0c1426 100%)",
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            color: "#e2e8f0",
            padding: "32px 24px",
        }}>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
                    <div>
                        <h1 style={{
                            margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em",
                            background: "linear-gradient(90deg,#60a5fa,#818cf8)", WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}>
                            RAG Evaluation Dashboard
                        </h1>
                        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                            RAGAS-powered | 8 metrics | CognitiveWizard Admin
                            {report && <span style={{ marginLeft: 12, color: "#475569" }}>
                                Last run: {new Date(report.evaluated_at).toLocaleString()}
                                {" "}({report.sample_count} samples)
                            </span>}
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        {report && (
                            <button onClick={exportReport} style={{
                                padding: "10px 18px", borderRadius: 10, border: "1.5px solid rgba(148,163,184,0.25)",
                                background: "transparent", color: "#94a3b8", fontWeight: 600, cursor: "pointer", fontSize: 13,
                                display: "inline-flex", alignItems: "center", gap: 6,
                            }}>
                                <FileDownload fontSize="small" />
                                Export JSON
                            </button>
                        )}
                        <button
                            onClick={runEvaluation}
                            disabled={status === "running"}
                            style={{
                                padding: "10px 24px", borderRadius: 10, border: "none",
                                background: status === "running"
                                    ? "rgba(99,102,241,0.4)"
                                    : "linear-gradient(135deg,#6366f1,#818cf8)",
                                color: "#fff", fontWeight: 700, fontSize: 14,
                                cursor: status === "running" ? "not-allowed" : "pointer",
                                boxShadow: status === "running" ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
                                transition: "all 0.2s",
                                display: "inline-flex", alignItems: "center", gap: 6,
                            }}>
                            {status === "running" ? (
                                <>
                                    <HourglassEmpty fontSize="small" />
                                    Evaluating...
                                </>
                            ) : (
                                <>
                                    <PlayArrow fontSize="small" />
                                    Run Evaluation
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {status === "running" && (
                    <div style={{
                        padding: "14px 20px", borderRadius: 10,
                        background: "rgba(99,102,241,0.12)", border: "1.5px solid rgba(99,102,241,0.3)",
                        marginBottom: 24, fontSize: 13, color: "#818cf8",
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <Refresh fontSize="small" />
                        Evaluation pipeline running - collecting logs, computing RAGAS metrics...
                        Results will appear automatically.
                    </div>
                )}

                {status === "error" && (
                    <div style={{
                        padding: "14px 20px", borderRadius: 10,
                        background: "rgba(239,68,68,0.10)", border: "1.5px solid rgba(239,68,68,0.3)",
                        marginBottom: 24, fontSize: 13, color: "#f87171",
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <ErrorOutlineOutlined fontSize="small" />
                        Evaluation failed: {error}
                    </div>
                )}

                {status === "idle" && (
                    <div style={{
                        textAlign: "center", padding: "80px 20px", color: "#334155",
                        border: "2px dashed rgba(148,163,184,0.12)", borderRadius: 16,
                    }}>
                        <InsertChartOutlined sx={{ fontSize: 48, marginBottom: "12px" }} />
                        <p style={{ fontSize: 15, margin: 0 }}>
                            Click <strong style={{ color: "#818cf8" }}>Run Evaluation</strong> to compute all 8 RAG metrics from recent chatbot interactions.
                        </p>
                    </div>
                )}

                {report?.metrics && (
                    <>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                            gap: 16, marginBottom: 20,
                        }}>
                            {Object.entries(report.metrics).map(([key, value]) => (
                                <MetricCard
                                    key={key}
                                    metricKey={key}
                                    value={value}
                                    interpretation={report.interpretation}
                                />
                            ))}
                        </div>

                        <LatencyPanel latency={report.latency} />
                    </>
                )}
            </div>
        </div>
    );
}
