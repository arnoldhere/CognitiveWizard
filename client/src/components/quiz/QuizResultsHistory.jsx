import { useState, useEffect } from "react";
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Box,
    Stack,
    Typography,
    Chip,
    CircularProgress,
    MenuItem,
    Button,
    Tooltip,
} from "@mui/material";
import { TrendingUp, Visibility, Search } from "@mui/icons-material";

/* ─── Teal palette ──────────────────────────────────── */
const T = {
    surface:     "rgba(255,255,255,0.88)",
    border:      "rgba(13,148,136,0.14)",
    borderWhite: "rgba(255,255,255,0.88)",
    text:        "#0F2027",
    textLight:   "#4A6572",
    muted:       "#7A9BA8",
    primary:     "#0D9488",
    cyan:        "#06B6D4",
    shadow:      "0 8px 30px rgba(13,148,136,0.08)",
};

/* ─── Shared header cell sx ─────────────────────────── */
const headCell = {
    fontWeight: 700,
    color: T.textLight,
    fontSize: "0.82rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: `2px solid ${T.border}`,
    background: "rgba(13,148,136,0.04)",
    whiteSpace: "nowrap",
};

/* ─── Shared body cell sx ───────────────────────────── */
const bodyCell = {
    borderColor: T.border,
    py: 1.5,
};

export default function QuizResultsHistory({
    results,
    loading,
    onFetchResults,
    onViewDetails,
}) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState("submitted_at");
    const [sortOrder, setSortOrder] = useState("desc");
    const [statusFilter, setStatusFilter] = useState("");
    const [topicSearch, setTopicSearch] = useState("");

    useEffect(() => {
        const handler = window.setTimeout(() => {
            onFetchResults({
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                sort_by: sortBy,
                sort_order: sortOrder,
                status_filter: statusFilter || undefined,
                topic_search: topicSearch || undefined,
            });
        }, 300);
        return () => window.clearTimeout(handler);
    }, [page, rowsPerPage, sortBy, sortOrder, statusFilter, topicSearch, onFetchResults]);

    const handleChangePage = (_, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const formatDate = (d) =>
        new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) return "N/A";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    /* score colour helper */
    const scoreColor = (pct) => (pct >= 60 ? T.primary : "#EA6C0A");

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress
                    size={56}
                    thickness={4}
                    sx={{ color: T.primary }}
                />
            </Box>
        );
    }

    return (
        <Stack spacing={3}>
            {/* ── Filter Bar ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: 3,
                    background: T.surface,
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${T.borderWhite}`,
                    outline: `1px solid ${T.border}`,
                    boxShadow: T.shadow,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
                    <Search sx={{ color: T.primary, fontSize: 20 }} />
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 700,
                            color: T.text,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                    >
                        Filters & Search
                    </Typography>
                </Box>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    {/* Topic search */}
                    <TextField
                        placeholder="Search by topic…"
                        value={topicSearch}
                        onChange={(e) => { setTopicSearch(e.target.value); setPage(0); }}
                        size="small"
                        sx={{ flex: 2 }}
                        InputProps={{
                            startAdornment: (
                                <Search sx={{ mr: 0.5, fontSize: 18, color: T.muted }} />
                            ),
                        }}
                    />
                    {/* Status */}
                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        size="small"
                        sx={{ flex: 1, minWidth: 140 }}
                    >
                        <MenuItem value="">All Results</MenuItem>
                        <MenuItem value="pass">Passed</MenuItem>
                        <MenuItem value="fail">Failed</MenuItem>
                    </TextField>
                    {/* Sort By */}
                    <TextField
                        select
                        label="Sort By"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        size="small"
                        sx={{ flex: 1, minWidth: 140 }}
                    >
                        <MenuItem value="submitted_at">Date</MenuItem>
                        <MenuItem value="score_percentage">Score</MenuItem>
                        <MenuItem value="result">Status</MenuItem>
                    </TextField>
                    {/* Order */}
                    <TextField
                        select
                        label="Order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        size="small"
                        sx={{ flex: 1, minWidth: 120 }}
                    >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* ── Results Table ── */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: T.surface,
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${T.borderWhite}`,
                    outline: `1px solid ${T.border}`,
                    boxShadow: T.shadow,
                    overflow: "hidden",
                }}
            >
                <Table sx={{ minWidth: 750 }}>
                    {/* ── Head ── */}
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCell}>Topic</TableCell>
                            <TableCell align="center" sx={headCell}>Difficulty</TableCell>
                            <TableCell align="center" sx={headCell}>Status</TableCell>
                            <TableCell align="center" sx={headCell}>Score</TableCell>
                            <TableCell align="center" sx={headCell}>Answers</TableCell>
                            <TableCell align="right" sx={headCell}>Time Taken</TableCell>
                            <TableCell align="right" sx={headCell}>Date</TableCell>
                            <TableCell align="center" sx={headCell}>Details</TableCell>
                        </TableRow>
                    </TableHead>

                    {/* ── Body ── */}
                    <TableBody>
                        {results.data && results.data.length > 0 ? (
                            results.data.map((row) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        "&:last-child td, &:last-child th": { border: 0 },
                                        "&:hover": {
                                            bgcolor: "rgba(13,148,136,0.035)",
                                        },
                                        transition: "background 0.18s ease",
                                    }}
                                >
                                    {/* Topic */}
                                    <TableCell sx={{ ...bodyCell, fontWeight: 600, color: T.text }}>
                                        {row.quiz_topic}
                                    </TableCell>

                                    {/* Difficulty */}
                                    <TableCell align="center" sx={bodyCell}>
                                        <Chip
                                            label={row.difficulty}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                textTransform: "capitalize",
                                                fontWeight: 700,
                                                color: T.primary,
                                                borderColor: "rgba(13,148,136,0.30)",
                                                backgroundColor: "rgba(13,148,136,0.07)",
                                                fontSize: "0.75rem",
                                            }}
                                        />
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell align="center" sx={bodyCell}>
                                        <Chip
                                            label={row.result.toUpperCase()}
                                            size="small"
                                            icon={<TrendingUp />}
                                            variant="outlined"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.75rem",
                                                color:
                                                    row.result === "pass"
                                                        ? "#059669"
                                                        : "#EA6C0A",
                                                borderColor:
                                                    row.result === "pass"
                                                        ? "rgba(5,150,105,0.30)"
                                                        : "rgba(249,115,22,0.30)",
                                                backgroundColor:
                                                    row.result === "pass"
                                                        ? "rgba(5,150,105,0.07)"
                                                        : "rgba(249,115,22,0.07)",
                                                "& .MuiChip-icon": { color: "inherit" },
                                            }}
                                        />
                                    </TableCell>

                                    {/* Score */}
                                    <TableCell align="center" sx={bodyCell}>
                                        <Typography
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: "1.05rem",
                                                color: scoreColor(row.score_percentage),
                                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                                            }}
                                        >
                                            {row.score_percentage}%
                                        </Typography>
                                    </TableCell>

                                    {/* Answers */}
                                    <TableCell align="center" sx={bodyCell}>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600, color: T.textLight }}
                                        >
                                            {row.correct_answers}/{row.total_questions}
                                        </Typography>
                                    </TableCell>

                                    {/* Time */}
                                    <TableCell align="right" sx={bodyCell}>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: T.muted, fontWeight: 500 }}
                                        >
                                            {formatDuration(row.time_taken)}
                                        </Typography>
                                    </TableCell>

                                    {/* Date */}
                                    <TableCell align="right" sx={bodyCell}>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: T.muted, fontWeight: 500, whiteSpace: "nowrap" }}
                                        >
                                            {formatDate(row.submitted_at)}
                                        </Typography>
                                    </TableCell>

                                    {/* Details button */}
                                    <TableCell align="center" sx={bodyCell}>
                                        <Tooltip title="View quiz details">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Visibility />}
                                                onClick={() => onViewDetails(row.id)}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    borderRadius: 99,
                                                    color: T.primary,
                                                    borderColor: "rgba(13,148,136,0.35)",
                                                    "&:hover": {
                                                        borderColor: T.primary,
                                                        backgroundColor: "rgba(13,148,136,0.07)",
                                                    },
                                                    transition: "all 0.18s ease",
                                                }}
                                            >
                                                View
                                            </Button>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 1,
                                            color: T.muted,
                                        }}
                                    >
                                        <TrendingUp sx={{ fontSize: 40, opacity: 0.35 }} />
                                        <Typography
                                            variant="body1"
                                            sx={{ fontStyle: "italic", color: T.muted }}
                                        >
                                            No quiz results found
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: T.muted }}>
                                            Complete a quiz to see your history here
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* ── Pagination ── */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={results.total || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                        borderTop: `1px solid ${T.border}`,
                        color: T.textLight,
                        "& .MuiTablePagination-selectIcon": { color: T.primary },
                        "& .MuiTablePagination-actions .MuiIconButton-root": {
                            color: T.primary,
                            "&.Mui-disabled": { color: T.muted },
                        },
                    }}
                />
            </TableContainer>
        </Stack>
    );
}