import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FileDownload,
  InsertChartOutlined,
  Refresh,
  RocketLaunch,
} from '@mui/icons-material';
import ErrorMessage from '../utils/ErrorMessage';
import '../../styles/RAGEvalDashboard.css';

/**
 * RAG Evaluation Dashboard Component
 * 
 * Features:
 * - One-click evaluation on recent query logs
 * - Displays all RAGAS and custom metrics
 * - Color-coded performance indicators
 * - Latency breakdown visualizations
 * - Export metrics as JSON
 */
export default function RAGEvalDashboard() {
  // State management
  const [evaluating, setEvaluating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load cached report on component mount
  useEffect(() => {
    fetchReport();
  }, []);

  /**
   * Fetch latest evaluation report from backend
   */
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/rag/evaluation-report', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      if (data.data) {
        setReportData(data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trigger one-click evaluation on recent query logs
   */
  const handleAutoEvaluate = async () => {
    try {
      setEvaluating(true);
      setError('');

      const response = await fetch('/api/rag/auto-evaluate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 50 }),
      });

      if (!response.ok) {
        throw new Error('Evaluation request failed');
      }

      await response.json();

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30;

      const pollReport = () => {
        attempts++;
        if (attempts >= maxAttempts) {
          setError('Evaluation took too long. Please try again.');
          setEvaluating(false);
          return;
        }

        fetchReport().then(() => {
          if (reportData) {
            setEvaluating(false);
          } else {
            setTimeout(pollReport, 1000);
          }
        });
      };

      setTimeout(pollReport, 2000);
    } catch (err) {
      setError(err.message || 'Evaluation failed');
      setEvaluating(false);
    }
  };

  /**
   * Export metrics as JSON
   */
  const exportMetrics = () => {
    if (!reportData) return;

    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag-evaluation-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  /**
   * Get color based on metric score
   * Green: 0.8+, Yellow: 0.6-0.8, Red: <0.6
   */
  const getScoreColor = (score) => {
    if (score >= 0.8) return '#10b981'; // Green
    if (score >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  /**
   * Get quality level badge
   */
  const getQualityBadge = (score) => {
    if (score >= 0.8) return { text: 'Excellent', color: '#10b981' };
    if (score >= 0.6) return { text: 'Good', color: '#3b82f6' };
    if (score >= 0.4) return { text: 'Fair', color: '#f59e0b' };
    return { text: 'Poor', color: '#ef4444' };
  };

  if (loading) {
    return (
      <section className="eval-dashboard">
        <div className="eval-header">
          <h2>RAG Evaluation Dashboard</h2>
        </div>
        <div className="eval-loading">Loading evaluation data...</div>
      </section>
    );
  }

  const qualityBadge = reportData?.overall_score ? getQualityBadge(reportData.overall_score) : null;

  return (
    <section className="eval-dashboard">
      {/* Header */}
      <div className="eval-header">
        <div className="eval-title-section">
          <h2>RAG Evaluation Dashboard</h2>
          <p className="eval-description">
            Comprehensive evaluation of retrieval-augmented generation performance
          </p>
        </div>

        {/* Action Buttons */}
        <div className="eval-actions">
          <button
            className="btn-evaluate"
            onClick={handleAutoEvaluate}
            disabled={evaluating}
          >
            {evaluating ? (
              <>
                <span className="spinner"></span>
                Evaluating... (may take time)
              </>
            ) : (
              <>
                <RocketLaunch fontSize="small" />
                Run Evaluation
              </>
            )}
          </button>
          <button
            className="btn-export"
            onClick={exportMetrics}
            disabled={!reportData}
          >
            <FileDownload fontSize="small" />
            Export JSON
          </button>
          <button
            className="btn-refresh"
            onClick={fetchReport}
            disabled={evaluating}
          >
            <Refresh fontSize="small" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {!reportData ? (
        <div className="eval-empty-state">
          <InsertChartOutlined className="empty-icon" />
          <p>No evaluation data available yet.</p>
          <p className="empty-hint">Click "Run Evaluation" to analyze recent queries.</p>
        </div>
      ) : (
        <>
          {/* Overall Score Card */}
          <div className="eval-overall">
            <div className="overall-score-display">
              <div
                className="score-circle"
                style={{
                  background: `conic-gradient(${getScoreColor(reportData.overall_score)} 0deg ${reportData.overall_score * 360}deg, #e5e7eb ${reportData.overall_score * 360}deg)`,
                }}
              >
                <div className="score-value">
                  {(reportData.overall_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="overall-details">
                <h3>Overall Performance</h3>
                <p className="overall-queries">
                  {reportData.total_queries_evaluated || 0} queries evaluated
                </p>
                {qualityBadge && (
                  <span className="quality-badge" style={{ background: qualityBadge.color }}>
                    {qualityBadge.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="eval-metrics-grid">
            <h3 className="grid-title">Detailed Metrics</h3>

            {reportData.metrics_summary && Object.entries(reportData.metrics_summary).map(([metric, stats]) => (
              <div key={metric} className="metric-card">
                <div className="metric-header">
                  <h4>{formatMetricName(metric)}</h4>
                  <span
                    className="metric-badge"
                    style={{ background: getScoreColor(stats.mean) }}
                  >
                    {(stats.mean * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="metric-stats">
                  <div className="stat-row">
                    <span>Mean:</span>
                    <strong>{(stats.mean * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="stat-row">
                    <span>Median:</span>
                    <strong>{(stats.median * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="stat-row">
                    <span>Range:</span>
                    <strong>
                      {(stats.min * 100).toFixed(1)}% - {(stats.max * 100).toFixed(1)}%
                    </strong>
                  </div>
                  {stats.stdev > 0 && (
                    <div className="stat-row">
                      <span>Stdev:</span>
                      <strong>{(stats.stdev * 100).toFixed(1)}%</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Latency Analysis */}
          {reportData.latency_summary && Object.keys(reportData.latency_summary).length > 0 && (
            <div className="eval-latency-section">
              <h3>Latency Analysis</h3>
              <div className="latency-cards">
                {Object.entries(reportData.latency_summary).map(([type, stats]) => (
                  <div key={type} className="latency-card">
                    <h4>{formatLatencyType(type)}</h4>
                    <div className="latency-metric">
                      <span className="latency-label">Mean</span>
                      <span className="latency-value">{stats.mean_ms.toFixed(2)}ms</span>
                    </div>
                    <div className="latency-metric">
                      <span className="latency-label">Median</span>
                      <span className="latency-value">{stats.median_ms.toFixed(2)}ms</span>
                    </div>
                    <div className="latency-metric">
                      <span className="latency-label">Range</span>
                      <span className="latency-value">
                        {stats.min_ms.toFixed(2)}-{stats.max_ms.toFixed(2)}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="eval-footer">
            <p>
              Last evaluated: {new Date(reportData.timestamp).toLocaleString()}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Helper: Format metric names for display
 */
function formatMetricName(metric) {
  const names = {
    faithfulness: 'Faithfulness',
    context_precision: 'Context Precision',
    context_recall: 'Context Recall',
    answer_relevancy: 'Answer Relevancy',
    hallucination_rate: 'Hallucination Rate',
    context_retrieval_ratio: 'Retrieval Ratio',
    context_awareness: 'Context Awareness',
    answer_quality: 'Answer Quality',
  };
  return names[metric] || metric.replace(/_/g, ' ');
}

/**
 * Helper: Format latency type names
 */
function formatLatencyType(type) {
  const types = {
    retrieval: 'Retrieval',
    generation: 'Generation',
    total: 'Total',
  };
  return types[type] || type;
}
