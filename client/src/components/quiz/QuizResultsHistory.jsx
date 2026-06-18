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
import { TrendingUp, Visibility } from "@mui/icons-material";

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

        return () => {
            window.clearTimeout(handler);
        };
    }, [page, rowsPerPage, sortBy, sortOrder, statusFilter, topicSearch, onFetchResults]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) {
            return "N/A";
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress size={60} color="secondary" />
            </Box>
        );
    }

    return (
        <Stack spacing={3}>
            {/* Filters Section */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    bgcolor: "rgba(22, 27, 39, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5, color: "#f1f5f9" }}>
                    Filters & Search
                </Typography>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                >
                    <TextField
                        placeholder="Search by topic..."
                        value={topicSearch}
                        onChange={(e) => {
                            setTopicSearch(e.target.value);
                            setPage(0);
                        }}
                        sx={{ 
                            flex: 2,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                            }
                        }}
                        size="small"
                    />
                    <TextField
                        select
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                        size="small"
                        sx={{ 
                            flex: 1, 
                            minWidth: 150,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                            }
                        }}
                    >
                        <MenuItem value="">All Results</MenuItem>
                        <MenuItem value="pass">Passed</MenuItem>
                        <MenuItem value="fail">Failed</MenuItem>
                    </TextField>
                    <TextField
                        select
                        label="Sort By"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        size="small"
                        sx={{ 
                            flex: 1, 
                            minWidth: 150,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                            }
                        }}
                    >
                        <MenuItem value="submitted_at">Date</MenuItem>
                        <MenuItem value="score_percentage">Score</MenuItem>
                        <MenuItem value="result">Status</MenuItem>
                    </TextField>
                    <TextField
                        select
                        label="Order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        size="small"
                        sx={{ 
                            flex: 1, 
                            minWidth: 120,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                            }
                        }}
                    >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Results Table */}
            <TableContainer 
                component={Paper} 
                elevation={0} 
                sx={{ 
                    borderRadius: 3,
                    bgcolor: "rgba(22, 27, 39, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
            >
                <Table sx={{ minWidth: 750 }}>
                    <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.02)" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>Topic</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Difficulty
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Status
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Score
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Answers
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Time Taken
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Date
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#cbd5e1", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                Details
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.data && results.data.length > 0 ? (
                            results.data.map((row) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        "&:last-child td, &:last-child th": { border: 0 },
                                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" },
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 600, color: "#f1f5f9", borderColor: "rgba(255, 255, 255, 0.06)" }}>{row.quiz_topic}</TableCell>
                                    <TableCell align="center" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Chip
                                            label={row.difficulty}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                textTransform: "capitalize",
                                                fontWeight: 600,
                                                color: "#a78bfa",
                                                borderColor: "rgba(167, 139, 250, 0.3)",
                                                backgroundColor: "rgba(167, 139, 250, 0.06)",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Chip
                                            label={row.result.toUpperCase()}
                                            size="small"
                                            icon={<TrendingUp />}
                                            sx={{ 
                                                fontWeight: 700,
                                                color: row.result === "pass" ? "#34d399" : "#fbbf24",
                                                borderColor: row.result === "pass" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                                                backgroundColor: row.result === "pass" ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                                                "& .MuiChip-icon": {
                                                    color: "inherit"
                                                }
                                            }}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: "1.1rem",
                                                color:
                                                    row.score_percentage >= 60
                                                        ? "#34d399"
                                                        : "#fbbf24",
                                            }}
                                        >
                                            {row.score_percentage}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#cbd5e1" }}>
                                            {row.correct_answers}/{row.total_questions}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                            {formatDuration(row.time_taken)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                            {formatDate(row.submitted_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
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
                                                    color: "#06b6d4",
                                                    borderColor: "rgba(6, 182, 212, 0.4)",
                                                    "&:hover": {
                                                        borderColor: "#06b6d4",
                                                        backgroundColor: "rgba(6, 182, 212, 0.08)",
                                                    }
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
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>No results found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={results.total || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#94a3b8",
                        "& .MuiTablePagination-selectIcon": {
                            color: "#94a3b8",
                        }
                    }}
                />
            </TableContainer>
        </Stack>
    );
}