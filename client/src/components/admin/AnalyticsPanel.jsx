import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ErrorOutline, InsertChartOutlined } from '@mui/icons-material';
import '../../styles/AdminDashboard.css';

// Color mapping for performance levels
const colors = {
  excellent: '#10b981', // Green
  good: '#3b82f6',       // Blue
  fair: '#f59e0b',       // Yellow
  poor: '#ef4444',       // Red
};

/**
 * Get color based on metric score
 */
const getScoreColor = (score) => {
  if (score >= 0.8) return colors.excellent;
  if (score >= 0.6) return colors.fair;
  return colors.poor;
};

/**
 * Custom tooltip for metrics chart
 */
const MetricsTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="analytics-tooltip">
        <p className="tooltip-title">{data.name}</p>
        <p className="tooltip-stat">Mean: {data.mean.toFixed(1)}%</p>
        <p className="tooltip-stat">Median: {data.median.toFixed(1)}%</p>
        <p className="tooltip-stat">Range: {data.min.toFixed(1)}% - {data.max.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

/**
 * Custom tooltip for latency chart
 */
const LatencyTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="analytics-tooltip">
        <p className="tooltip-title">{data.name}</p>
        <p className="tooltip-stat">Mean: {data.mean.toFixed(2)}ms</p>
        <p className="tooltip-stat">Median: {data.median.toFixed(2)}ms</p>
        <p className="tooltip-stat">Range: {data.min.toFixed(2)}ms - {data.max.toFixed(2)}ms</p>
      </div>
    );
  }
  return null;
};

/**
 * Custom tooltip for quality chart
 */
const QualityTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="analytics-tooltip">
        <p className="tooltip-stat">{payload[0].payload.name}</p>
        <p className="tooltip-stat">{payload[0].value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

/**
 * AnalyticsPanel Component
 * 
 * Displays RAG evaluation metrics with interactive charts:
 * - Metric distribution bar chart
 * - Quality score donut chart
 * - Latency breakdown bar chart
 * - Performance trend line chart (if available)
 * 
 * Features:
 * - Color-coded by metric performance (green/yellow/red)
 * - Responsive grid layout
 * - Loading and error states
 * - Tooltips and legends
 */
export default function AnalyticsPanel({ reportData, loading, error }) {
  /**
   * Prepare metrics distribution data for bar chart
   */
  const metricsChartData = useMemo(() => {
    if (!reportData?.metrics_summary) return [];
    
    return Object.entries(reportData.metrics_summary).map(([metric, stats]) => ({
      name: formatMetricName(metric),
      mean: parseFloat((stats.mean * 100).toFixed(1)),
      median: parseFloat((stats.median * 100).toFixed(1)),
      min: parseFloat((stats.min * 100).toFixed(1)),
      max: parseFloat((stats.max * 100).toFixed(1)),
      color: getScoreColor(stats.mean),
    }));
  }, [reportData]);

  /**
   * Prepare quality score data for donut chart
   */
  const qualityChartData = useMemo(() => {
    if (!reportData?.overall_score) return [];
    
    const score = reportData.overall_score * 100;
    const remaining = 100 - score;
    return [
      { name: 'Quality Score', value: score },
      { name: 'Remaining', value: remaining },
    ];
  }, [reportData]);

  /**
   * Prepare latency breakdown data
   */
  const latencyChartData = useMemo(() => {
    if (!reportData?.latency_summary) return [];
    
    return Object.entries(reportData.latency_summary).map(([type, stats]) => ({
      name: formatLatencyType(type),
      mean: parseFloat(stats.mean_ms.toFixed(2)),
      median: parseFloat(stats.median_ms.toFixed(2)),
      min: parseFloat(stats.min_ms.toFixed(2)),
      max: parseFloat(stats.max_ms.toFixed(2)),
    }));
  }, [reportData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="analytics-panel">
        <div className="analytics-header">
          <h3>Analytics & Metrics</h3>
        </div>
        <div className="analytics-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="analytics-panel">
        <div className="analytics-header">
          <h3>Analytics & Metrics</h3>
        </div>
        <div className="analytics-error">
          <p><ErrorOutline fontSize="small" /> Failed to load analytics</p>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  // Empty state
  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <div className="analytics-panel">
        <div className="analytics-header">
          <h3>Analytics & Metrics</h3>
        </div>
        <div className="analytics-empty">
          <p><InsertChartOutlined fontSize="small" /> No evaluation data available</p>
          <small>Run an evaluation to see metrics and analytics</small>
        </div>
      </div>
    );
  }

  const qualityBadge = reportData?.overall_score
    ? getQualityBadgeInfo(reportData.overall_score)
    : null;

  return (
    <div className="analytics-panel">
      {/* Header */}
      <div className="analytics-header">
        <h3>Analytics & Metrics</h3>
        {reportData?.timestamp && (
          <p className="analytics-timestamp">
            Last updated: {new Date(reportData.timestamp).toLocaleString()}
          </p>
        )}
      </div>

      {/* Overall Quality Score Card */}
      {reportData?.overall_score !== undefined && (
        <div className="analytics-quality-card">
          <div className="quality-content">
            <div className="quality-left">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={qualityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={getScoreColor(reportData.overall_score)} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                  <Tooltip content={<QualityTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="quality-score-text">
                <span className="score-number">
                  {(reportData.overall_score * 100).toFixed(1)}%
                </span>
                <span className="score-label">Overall Score</span>
              </div>
            </div>
            <div className="quality-right">
              <h4>Quality Summary</h4>
              {qualityBadge && (
                <div className="quality-badge-container">
                  <span
                    className="quality-badge"
                    style={{ backgroundColor: qualityBadge.color }}
                  >
                    {qualityBadge.text}
                  </span>
                </div>
              )}
              <div className="quality-stats">
                {reportData.total_queries_evaluated && (
                  <div className="stat">
                    <span className="stat-label">Queries Evaluated</span>
                    <span className="stat-value">{reportData.total_queries_evaluated}</span>
                  </div>
                )}
                {reportData.quality_badge && (
                  <div className="stat">
                    <span className="stat-label">Badge Status</span>
                    <span className="stat-value">{reportData.quality_badge}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="analytics-grid">
        {/* Metrics Bar Chart */}
        {metricsChartData.length > 0 && (
          <div className="analytics-chart-container">
            <h4 className="chart-title">Metric Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={metricsChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<MetricsTooltip />} />
                <Bar dataKey="mean" fill="#6366f1" name="Mean" radius={[8, 8, 0, 0]} />
                <Bar dataKey="median" fill="#8b5cf6" name="Median" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
                <span>Mean</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
                <span>Median</span>
              </div>
            </div>
          </div>
        )}

        {/* Latency Breakdown Chart */}
        {latencyChartData.length > 0 && (
          <div className="analytics-chart-container">
            <h4 className="chart-title">Latency Breakdown</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={latencyChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<LatencyTooltip />} />
                <Bar dataKey="mean" fill="#ec4899" name="Mean" radius={[8, 8, 0, 0]} />
                <Bar dataKey="median" fill="#f472b6" name="Median" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ec4899' }}></span>
                <span>Mean</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f472b6' }}></span>
                <span>Median</span>
              </div>
            </div>
          </div>
        )}

        {/* Metric Stats Cards */}
        {metricsChartData.length > 0 && (
          <div className="analytics-stats-grid">
            <h4 className="chart-title">Metric Ranges</h4>
            {metricsChartData.map((metric, idx) => (
              <div key={idx} className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-card-title">{metric.name}</span>
                  <span
                    className="stat-card-badge"
                    style={{ backgroundColor: metric.color }}
                  >
                    {metric.mean.toFixed(1)}%
                  </span>
                </div>
                <div className="stat-card-content">
                  <div className="stat-row">
                    <span className="stat-label">Min</span>
                    <span className="stat-value">{metric.min.toFixed(1)}%</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Max</span>
                    <span className="stat-value">{metric.max.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${metric.mean}%`,
                        backgroundColor: metric.color,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {reportData && (
        <div className="analytics-footer">
          <p className="info-text">
            {metricsChartData.length} metrics analyzed | 
            {latencyChartData.length > 0 ? ` ${latencyChartData.length} latency types tracked` : ' Latency data not available'}
          </p>
        </div>
      )}
    </div>
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

/**
 * Helper: Get quality badge information
 */
function getQualityBadgeInfo(score) {
  if (score >= 0.8) return { text: 'Excellent', color: '#10b981' };
  if (score >= 0.6) return { text: 'Good', color: '#3b82f6' };
  if (score >= 0.4) return { text: 'Fair', color: '#f59e0b' };
  return { text: 'Poor', color: '#ef4444' };
}
