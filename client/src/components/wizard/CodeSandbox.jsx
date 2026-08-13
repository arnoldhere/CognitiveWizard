/**
 * components/wizard/CodeSandbox.jsx
 * ===================================
 * Basic interactive coding sandbox for lesson exercises.
 *
 * Features:
 *  - Editable code textarea with syntax highlighting via CSS
 *  - Run button that executes Python/JS via eval (JS) or Pyodide (Python)
 *  - Shows stdout/result output panel
 *  - Show Hint / Show Answer on demand
 *  - Language badge display
 *
 * For Python: uses Pyodide (WebAssembly Python runtime loaded lazily).
 * For JavaScript: uses safe eval with captured console.log output.
 * Other languages: shows a "Run in your local environment" message.
 *
 * Design: Dark editor theme matching the lesson reader's aesthetic.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Play, Eye, EyeOff, Lightbulb, RotateCcw, Terminal,
  CheckCircle, XCircle, Loader, Code2,
} from "lucide-react";

// ── Pyodide lazy loader ────────────────────────────────────────────────────────
let pyodideInstance = null;
let pyodideLoading = false;
let pyodideCallbacks = [];

async function loadPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    return new Promise((resolve) => pyodideCallbacks.push(resolve));
  }

  pyodideLoading = true;

  // Load Pyodide script dynamically
  if (!document.getElementById("pyodide-script")) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "pyodide-script";
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  pyodideInstance = await window.loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
  });

  pyodideLoading = false;
  pyodideCallbacks.forEach((cb) => cb(pyodideInstance));
  pyodideCallbacks = [];

  return pyodideInstance;
}

// ── Safe JS executor ──────────────────────────────────────────────────────────
function runJavaScript(code) {
  const output = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  try {
    // Capture console output
    console.log = (...args) => output.push(args.map(String).join(" "));
    console.error = (...args) => output.push("❌ " + args.map(String).join(" "));
    console.warn = (...args) => output.push("⚠️ " + args.map(String).join(" "));

    // eslint-disable-next-line no-new-func
    const result = new Function(code)();
    if (result !== undefined) output.push(String(result));

    return { success: true, output: output.join("\n") || "(no output)" };
  } catch (err) {
    return { success: false, output: `${err.name}: ${err.message}` };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

// ── Language config ───────────────────────────────────────────────────────────
const LANGUAGE_CONFIG = {
  python:     { label: "Python", color: "#3B82F6", canRun: true,  mode: "python" },
  javascript: { label: "JavaScript", color: "#F59E0B", canRun: true,  mode: "js" },
  js:         { label: "JavaScript", color: "#F59E0B", canRun: true,  mode: "js" },
  sql:        { label: "SQL", color: "#8B5CF6", canRun: false, mode: "sql" },
  bash:       { label: "Bash", color: "#10B981", canRun: false, mode: "bash" },
  html:       { label: "HTML", color: "#EF4444", canRun: false, mode: "html" },
};

const DEFAULT_LANG_COLOR = "#6B7280";

// ── Status labels for loading states ─────────────────────────────────────────
const STATUS_LABELS = {
  idle: null,
  loading_pyodide: "Loading Python runtime (first run only)...",
  running: "Running your code...",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CodeSandbox({ exercise }) {
  const {
    title = "Coding Exercise",
    description = "",
    starter_code = "",
    language = "python",
    solution_hint = null,
    expected_output = null,
    difficulty = "medium",
  } = exercise || {};

  const langKey = (language || "python").toLowerCase();
  const langConfig = LANGUAGE_CONFIG[langKey] || { label: language, color: DEFAULT_LANG_COLOR, canRun: false };

  const [code, setCode] = useState(starter_code || "");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading_pyodide | running
  const [runSuccess, setRunSuccess] = useState(null); // null | true | false
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const textareaRef = useRef(null);

  // Reset code to starter
  const handleReset = useCallback(() => {
    setCode(starter_code || "");
    setOutput("");
    setRunSuccess(null);
    setShowHint(false);
    setShowAnswer(false);
  }, [starter_code]);

  // Run code based on language
  const handleRun = useCallback(async () => {
    if (!langConfig.canRun) {
      setOutput(`ℹ️ ${langConfig.label} cannot be executed in the browser.\nPlease run this in your local environment.`);
      return;
    }

    setStatus("running");
    setOutput("");
    setRunSuccess(null);

    try {
      if (langConfig.mode === "python") {
        setStatus("loading_pyodide");
        const pyodide = await loadPyodide();
        setStatus("running");

        // Capture stdout
        let capturedOutput = "";
        pyodide.setStdout({ batched: (text) => { capturedOutput += text; } });
        pyodide.setStderr({ batched: (text) => { capturedOutput += "❌ " + text; } });

        try {
          const result = await pyodide.runPythonAsync(code);
          if (result !== undefined && result !== null) {
            capturedOutput += (capturedOutput ? "\n" : "") + String(result);
          }
          setOutput(capturedOutput || "(no output)");
          setRunSuccess(true);
        } catch (pyErr) {
          setOutput(`❌ ${pyErr.message || pyErr}`);
          setRunSuccess(false);
        }

      } else if (langConfig.mode === "js") {
        const { success, output: jsOutput } = runJavaScript(code);
        setOutput(jsOutput);
        setRunSuccess(success);
      }
    } catch (err) {
      setOutput(`❌ Runtime error: ${err.message}`);
      setRunSuccess(false);
    } finally {
      setStatus("idle");
    }
  }, [code, langConfig]);

  // Tab key support in textarea
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      // Restore cursor position
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleRun();
    }
  }, [code, handleRun]);

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1117] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3">
        <div className="flex items-center gap-3">
          <Code2 size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-200">{title}</span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider"
            style={{ backgroundColor: `${langConfig.color}20`, color: langConfig.color }}
          >
            {langConfig.label}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${difficultyColors[difficulty] || difficultyColors.medium}`}>
            {difficulty}
          </span>
        </div>

        {/* Traffic light dots */}
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/70" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <div className="h-3 w-3 rounded-full bg-green-500/70" />
        </div>
      </div>

      {/* Problem description */}
      {description && (
        <div className="border-b border-slate-700/30 bg-[#161b22] px-5 py-3">
          <p className="text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
      )}

      {/* Code editor */}
      <div className="relative">
        {/* Line numbers overlay (visual only) */}
        <div
          className="pointer-events-none absolute left-0 top-0 select-none px-3 py-4 font-mono text-[13px] leading-[1.6] text-slate-600"
          aria-hidden
        >
          {code.split("\n").map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none bg-transparent py-4 pr-4 font-mono text-[13px] leading-[1.6] text-slate-100 outline-none"
          style={{ paddingLeft: "3rem", minHeight: "220px" }}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          placeholder="// Write your code here..."
        />
      </div>

      {/* Output panel */}
      {(output || status !== "idle") && (
        <div className="border-t border-slate-700/50 bg-[#0a0d13]">
          <div className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Terminal size={12} />
            <span>Output</span>
            {runSuccess === true && <CheckCircle size={12} className="ml-auto text-emerald-400" />}
            {runSuccess === false && <XCircle size={12} className="ml-auto text-red-400" />}
          </div>
          <pre className="px-5 pb-4 font-mono text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap">
            {STATUS_LABELS[status] ? (
              <span className="text-slate-500 italic">{STATUS_LABELS[status]}</span>
            ) : output}
          </pre>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-700/50 px-4 py-3">
        {/* Run button */}
        <button
          id={`sandbox-run-${exercise?.id || "0"}`}
          onClick={handleRun}
          disabled={status !== "idle"}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {status !== "idle" ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {status !== "idle" ? "Running..." : "Run Code"}
        </button>

        {/* Run shortcut hint */}
        <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">
          Ctrl+Enter to run
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          <RotateCcw size={12} />
          Reset
        </button>

        {/* Hint */}
        {solution_hint && (
          <button
            onClick={() => setShowHint((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-amber-400 transition hover:border-amber-500"
          >
            <Lightbulb size={12} />
            {showHint ? "Hide Hint" : "Show Hint"}
          </button>
        )}

        {/* Answer */}
        {expected_output && (
          <button
            onClick={() => setShowAnswer((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            {showAnswer ? <EyeOff size={12} /> : <Eye size={12} />}
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </button>
        )}
      </div>

      {/* Hint panel */}
      {showHint && solution_hint && (
        <div className="border-t border-amber-800/30 bg-amber-900/20 px-5 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Lightbulb size={12} />
            Hint
          </div>
          <p className="text-sm text-amber-200/80">{solution_hint}</p>
        </div>
      )}

      {/* Answer panel */}
      {showAnswer && expected_output && (
        <div className="border-t border-blue-800/30 bg-blue-900/20 px-5 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-400">
            <Eye size={12} />
            Expected Output / Model Answer
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-blue-200/80">{expected_output}</pre>
        </div>
      )}
    </div>
  );
}
