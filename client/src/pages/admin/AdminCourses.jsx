import { useState, useEffect } from "react";
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
    TextField, InputAdornment, Chip, MenuItem, Select, FormControl, InputLabel,
    CircularProgress, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, Grid
} from "@mui/material";
import { Search, BookOpen, RefreshCw, Eye } from "lucide-react";
import { getAdminCourses } from "../../services/admin";
import dayjs from "dayjs";

export default function AdminCourses({ title, description, userRole }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting
    const [sortField, setSortField] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Filtering & Search
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [contentType, setContentType] = useState("all");

    // View Dialog
    const [viewData, setViewData] = useState(null);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0); // Reset page on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: rowsPerPage,
                sortField,
                sortOrder,
                search: debouncedSearch,
                contentType,
                userRole
            };
            const response = await getAdminCourses(params);
            setCourses(response.data);
            setTotal(response.total);
        } catch (err) {
            console.error("Failed to fetch admin courses", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [page, rowsPerPage, sortField, sortOrder, debouncedSearch, contentType, userRole]);

    const handleSort = (field) => {
        const isAsc = sortField === field && sortOrder === "asc";
        setSortOrder(isAsc ? "desc" : "asc");
        setSortField(field);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusChip = (status) => {
        if (status === "published") {
            return <Chip label="Published" size="small" color="success" sx={{ fontWeight: 600 }} />;
        }
        return <Chip label={status || "Draft"} size="small" color="default" sx={{ fontWeight: 600 }} />;
    };

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2, p: { xs: 2.5, md: 3 }, borderRadius: 4, border: "1px solid", borderColor: "divider", background: "linear-gradient(115deg, rgba(20,140,255,0.15), rgba(118,85,246,0.10) 58%, rgba(30,217,242,0.06))" }}>
                <Box>
                    <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 800, letterSpacing: "0.14em" }}>Course Catalog</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>{title || "Published Content"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description || "Browse and manage all educational content published by tutors."}
                    </Typography>
                </Box>
                <IconButton onClick={fetchCourses} disabled={loading} sx={{ bgcolor: "background.paper", boxShadow: 1 }}>
                    <RefreshCw size={20} className={loading ? "spin" : ""} />
                </IconButton>
            </Box>

            {/* Toolbar */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                    placeholder="Search by topic, title, or tutor email..."
                    variant="outlined"
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 260, flex: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={18} />
                            </InputAdornment>
                        ),
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Content Type</InputLabel>
                    <Select
                        value={contentType}
                        label="Content Type"
                        onChange={(e) => { setContentType(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="Course/Syllabus">Course</MenuItem>
                        <MenuItem value="Roadmap">Roadmap</MenuItem>
                        <MenuItem value="Guide">Guide</MenuItem>
                    </Select>
                </FormControl>
            </Paper>

            {/* Data Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                <TableContainer>
                    <Table sx={{ minWidth: 700 }}>
                        <TableHead sx={{ bgcolor: "action.hover" }}>
                            <TableRow>
                                <TableCell width={60}>ID</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortField === "topic"}
                                        direction={sortField === "topic" ? sortOrder : "asc"}
                                        onClick={() => handleSort("topic")}
                                    >
                                        Topic / Title
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Tutor</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortField === "created_at"}
                                        direction={sortField === "created_at" ? sortOrder : "asc"}
                                        onClick={() => handleSort("created_at")}
                                    >
                                        Date
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && courses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : courses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                        No courses found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                courses.map((course) => (
                                    <TableRow key={course.id} hover>
                                        <TableCell>#{course.id}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{course.content?.title || course.topic}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 250, display: "inline-block" }}>
                                                {course.content?.description || "No description"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip icon={<BookOpen size={14} />} label={course.content_type || "N/A"} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{course.user?.full_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{course.user?.email}</Typography>
                                        </TableCell>
                                        <TableCell>{getStatusChip(course.status)}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{dayjs(course.created_at).format("MMM D, YYYY")}</Typography>
                                            <Typography variant="caption" color="text.secondary">{dayjs(course.created_at).format("h:mm A")}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => setViewData(course)} color="primary" size="small">
                                                <Eye size={18} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>

            {/* View Course Dialog */}
            <Dialog open={!!viewData} onClose={() => setViewData(null)} maxWidth="md" fullWidth>
                {viewData && (
                    <>
                        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>{viewData.content?.title || viewData.topic}</Typography>
                                <Typography variant="caption" color="text.secondary">By {viewData.user?.email} • {viewData.content_type}</Typography>
                            </Box>
                            {getStatusChip(viewData.status)}
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>Description</Typography>
                                    <Typography variant="body2">{viewData.content?.description || "N/A"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>Skill Level</Typography>
                                    <Typography variant="body2">{viewData.content?.skill_level || "N/A"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>Target Audience</Typography>
                                    <Typography variant="body2">{viewData.content?.target_audience || "N/A"}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Modules / Phases ({viewData.content?.modules?.length || 0})</Typography>
                                    {viewData.content?.modules?.map((m, i) => (
                                        <Paper key={i} sx={{ p: 2, mb: 1.5, bgcolor: "background.default" }} elevation={0} variant="outlined">
                                            <Typography variant="body2" fontWeight={700}>{i + 1}. {m.title}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{m.duration}</Typography>
                                            <Typography variant="body2">{m.description}</Typography>
                                            {m.topics?.length > 0 && (
                                                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                    {m.topics.map((t, idx) => (
                                                        <Chip key={idx} label={t} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                    ))}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setViewData(null)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
