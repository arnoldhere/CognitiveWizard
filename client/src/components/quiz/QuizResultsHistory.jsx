import { useState, useEffect } from "react";
import {
    Container,
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
} from "@mui/material";
import { Download, TrendingUp } from "@mui/icons-material";

export default function QuizResultsHistory({ results, loading, onFetchResults }) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState("submitted_at");
    const [sortOrder, setSortOrder] = useState("desc");
    const [statusFilter, setStatusFilter] = useState("");
    const [topicSearch, setTopicSearch] = useState("");

    useEffect(() => {
        onFetchResults({
            skip: page * rowsPerPage,
            limit: rowsPerPage,
            sort_by: sortBy,
            sort_order: sortOrder,
            status_filter: statusFilter || undefined,
            topic_search: topicSearch || undefined,
        });
    }, [page, rowsPerPage, sortBy, sortOrder, statusFilter, topicSearch]);

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

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Stack spacing={3}>
            {/* Filters Section */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "background.paper" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
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
                        sx={{ flex: 2 }}
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
                        sx={{ flex: 1, minWidth: 150 }}
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
                        sx={{ flex: 1, minWidth: 150 }}
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
                        sx={{ flex: 1, minWidth: 120 }}
                    >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                    </TextField>
                </Stack>
            </Paper>

            {/* Results Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
                <Table sx={{ minWidth: 750 }}>
                    <TableHead sx={{ bgcolor: "primary.light" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "white" }}>Topic</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "white" }}>
                                Difficulty
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "white" }}>
                                Status
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "white" }}>
                                Score
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "white" }}>
                                Answers
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                                Date
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.data && results.data.length > 0 ? (
                            results.data.map((row, index) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        "&:last-child td, &:last-child th": { border: 0 },
                                        "&:hover": { bgcolor: "action.hover" },
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <TableCell sx={{ fontWeight: 500 }}>{row.quiz_topic}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.difficulty}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                textTransform: "capitalize",
                                                fontWeight: 500,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.result.toUpperCase()}
                                            color={row.result === "pass" ? "success" : "warning"}
                                            size="small"
                                            icon={<TrendingUp />}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "1.1rem",
                                                color:
                                                    row.score_percentage >= 60
                                                        ? "success.main"
                                                        : "warning.main",
                                            }}
                                        >
                                            {row.score_percentage}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {row.correct_answers}/{row.total_questions}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDate(row.submitted_at)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No results found</Typography>
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
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                />
            </TableContainer>
        </Stack>
    );
}