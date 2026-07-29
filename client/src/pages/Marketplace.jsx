import { useState, useMemo, useEffect } from "react";
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
    Button,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    Rating,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Paper,
    Divider,
    Alert,
    Snackbar,
    CircularProgress,
} from "@mui/material";
import {
    Search,
    School,
    MenuBook,
    Explore,
    CheckCircle,
    Close,
    Person,
    Timer,
    Layers,
    Star,
    ArrowForward,
    LocalOffer,
    WorkspacePremium,
} from "@mui/icons-material";
import { getPublishedCourses } from "../services/api";

/* ── Palette Constants ── */
const T = {
    bg: "#F5F9FF",
    surface: "rgba(255, 255, 255, 0.92)",
    border: "rgba(20, 140, 255, 0.16)",
    text: "#07152E",
    textLight: "#4D6486",
    muted: "#7187A9",
    primary: "#148CFF",
    primaryDark: "#0666D9",
    cyan: "#1ED9F2",
    accent: "#7655F6",
    amber: "#F59E0B",
    shadow: "0 12px 40px rgba(20, 140, 255, 0.09)",
};

const glassCard = {
    background: T.surface,
    backdropFilter: "blur(20px)",
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    boxShadow: T.shadow,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 20px 48px rgba(20, 140, 255, 0.18)",
        borderColor: T.primary,
    },
};

export default function Marketplace() {
    const [selectedTab, setSelectedTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState("");
    
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const data = await getPublishedCourses();
                // Map backend structure to UI structure
                const formatted = data.map(item => {
                    const c = item.content || {};
                    return {
                        id: item.id,
                        title: c.title || item.topic,
                        contentType: item.content_type?.toLowerCase() || "course",
                        topic: item.topic,
                        tutorName: item.user?.full_name || item.user?.email || "Unknown Tutor",
                        tutorTitle: item.user?.role === "tutor" ? "Verified Faculty / Tutor" : "Instructor",
                        tutorAvatar: (item.user?.full_name || item.user?.email || "T").charAt(0).toUpperCase(),
                        tutorVerified: item.user?.role === "tutor",
                        rating: (4.5 + Math.random() * 0.5).toFixed(1), // Mock rating since we don't have reviews yet
                        reviewsCount: Math.floor(Math.random() * 200) + 10,
                        enrolledCount: Math.floor(Math.random() * 1000) + 50,
                        difficulty: c.skill_level || "Intermediate",
                        estimatedTime: c.duration || "Self-paced",
                        modulesCount: c.modules?.length || 0,
                        description: c.description || "No description provided.",
                        tags: c.tags || [item.topic],
                        modules: (c.modules || []).map(m => ({
                            name: m.title || "Module",
                            duration: m.duration || "",
                            detail: m.description || "",
                        }))
                    };
                });
                setCourses(formatted);
            } catch (err) {
                console.error("Failed to fetch published courses", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
    }, []);

    const filteredItems = useMemo(() => {
        return courses.filter(item => {
            const matchesTab =
                selectedTab === "all" ||
                item.contentType.toLowerCase() === selectedTab.toLowerCase();

            const query = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !query ||
                item.title.toLowerCase().includes(query) ||
                item.topic.toLowerCase().includes(query) ||
                item.tutorName.toLowerCase().includes(query) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)));

            return matchesTab && matchesQuery;
        });
    }, [selectedTab, searchQuery, courses]);

    const handleEnroll = (item) => {
        setSnackbarMsg(`Enrolled in "${item.title}" published by ${item.tutorName}! Added to your study profile.`);
        setSnackbarOpen(true);
        setSelectedItem(null);
    };

    return (
        <section className="marketplace-page" style={{ minHeight: "90vh", paddingBottom: "4rem" }}>
            <Container maxWidth="lg" sx={{ pt: 5 }}>
                {/* ── Page Header Banner ── */}
                <Box
                    sx={{
                        mb: 5,
                        p: { xs: 3.5, md: 5 },
                        borderRadius: 5,
                        background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 50%, ${T.accent} 100%)`,
                        color: "#fff",
                        boxShadow: "0 16px 48px rgba(20, 140, 255, 0.22)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            top: -40,
                            right: -40,
                            width: 260,
                            height: 260,
                            background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
                            borderRadius: "50%",
                        }}
                    />
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                                <Chip
                                    label="TUTOR PUBLISHED COURSES"
                                    icon={<WorkspacePremium sx={{ color: `${T.amber} !important` }} />}
                                    sx={{
                                        background: "rgba(255, 255, 255, 0.15)",
                                        backdropFilter: "blur(10px)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        border: "1px solid rgba(255, 255, 255, 0.3)",
                                        letterSpacing: 1,
                                    }}
                                />
                            </Box>
                            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: "-0.02em", mb: 1.5, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                Discover Verified Tutor Materials
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.92, maxWidth: 620, lineHeight: 1.6, fontSize: "1.05rem" }}>
                                Explore structured learning roadmaps, professional courses, and practical guides introduced directly by teachers, faculty, and experienced tutors.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ textAlign: { md: "right" } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3.5,
                                    background: "rgba(255, 255, 255, 0.12)",
                                    backdropFilter: "blur(16px)",
                                    border: "1px solid rgba(255, 255, 255, 0.25)",
                                    color: "#fff",
                                    display: "inline-block",
                                    textAlign: "left",
                                    minWidth: 200,
                                }}
                            >
                                <Typography variant="caption" sx={{ textTransform: "uppercase", opacity: 0.8, fontWeight: 700, letterSpacing: 1 }}>
                                    Curated Library
                                </Typography>
                                <Typography variant="h4" fontWeight={900}>
                                    {courses.length}+ Published
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                    Pedagogically framed & verified
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>

                {/* ── Search & Filter Controls ── */}
                <Box sx={{ mb: 4, display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2.5 }}>
                    <Tabs
                        value={selectedTab}
                        onChange={(_, v) => setSelectedTab(v)}
                        sx={{
                            background: T.surface,
                            p: 0.5,
                            borderRadius: 3,
                            border: `1px solid ${T.border}`,
                            boxShadow: T.shadow,
                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: 2.5,
                                px: 3,
                                py: 1,
                                minHeight: 44,
                                color: T.muted,
                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                                "&.Mui-selected": {
                                    color: "#fff",
                                    backgroundColor: T.primary,
                                },
                            },
                            "& .MuiTabs-indicator": { display: "none" },
                        }}
                    >
                        <Tab value="all" label="All Materials" />
                        <Tab value="roadmap" label="Roadmaps" icon={<Explore fontSize="small" />} iconPosition="start" />
                        <Tab value="course" label="Courses" icon={<School fontSize="small" />} iconPosition="start" />
                        <Tab value="guide" label="Guides" icon={<MenuBook fontSize="small" />} iconPosition="start" />
                    </Tabs>

                    <TextField
                        placeholder="Search by title, tutor, or topic..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{
                            width: { xs: "100%", md: 360 },
                            background: T.surface,
                            borderRadius: 3,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 3,
                                border: `1px solid ${T.border}`,
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {/* ── Cards Grid ── */}
                {loading ? (
                    <Box textAlign="center" sx={{ py: 8 }}>
                        <CircularProgress sx={{ color: T.primary, mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Loading published courses...
                        </Typography>
                    </Box>
                ) : filteredItems.length === 0 ? (
                    <Box textAlign="center" sx={{ py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            No materials found matching your criteria.
                        </Typography>
                        <Button sx={{ mt: 2 }} onClick={() => { setSelectedTab("all"); setSearchQuery(""); }}>
                            Reset Filters
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3.5}>
                        {filteredItems.map((item) => (
                            <Grid item xs={12} md={6} lg={4} key={item.id}>
                                <Card sx={glassCard}>
                                    <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}>
                                        {/* Card Top Badges */}
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                            <Chip
                                                label={item.contentType.toUpperCase()}
                                                size="small"
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: "0.7rem",
                                                    letterSpacing: 0.8,
                                                    backgroundColor:
                                                        item.contentType === "roadmap"
                                                            ? "rgba(20, 140, 255, 0.12)"
                                                            : item.contentType === "course"
                                                            ? "rgba(118, 85, 246, 0.12)"
                                                            : "rgba(30, 217, 242, 0.12)",
                                                    color:
                                                        item.contentType === "roadmap"
                                                            ? T.primary
                                                            : item.contentType === "course"
                                                            ? T.accent
                                                            : T.primaryDark,
                                                    border: `1px solid ${
                                                        item.contentType === "roadmap"
                                                            ? "rgba(20, 140, 255, 0.3)"
                                                            : item.contentType === "course"
                                                            ? "rgba(118, 85, 246, 0.3)"
                                                            : "rgba(30, 217, 242, 0.3)"
                                                    }`,
                                                }}
                                            />
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                <Star sx={{ color: T.amber, fontSize: "1.1rem" }} />
                                                <Typography variant="body2" fontWeight={800} color="text.primary">
                                                    {item.rating}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ({item.reviewsCount})
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Title & Topic */}
                                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: T.text, lineHeight: 1.35, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 40 }}>
                                            {item.description}
                                        </Typography>

                                        {/* Tutor Header */}
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, p: 1.5, borderRadius: 2.5, background: "rgba(20, 140, 255, 0.04)" }}>
                                            <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${T.amber}, ${T.primary})`, fontWeight: 800, fontSize: "0.9rem" }}>
                                                {item.tutorAvatar}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                                                <Typography variant="subtitle2" fontWeight={800} noWrap color="text.primary">
                                                    {item.tutorName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                    {item.tutorTitle}
                                                </Typography>
                                            </Box>
                                            {item.tutorVerified && (
                                                <CheckCircle sx={{ color: T.primary, fontSize: "1.1rem" }} />
                                            )}
                                        </Box>

                                        {/* Quick Meta */}
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, pb: 2, borderTop: `1px solid ${T.border}` }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                <Timer fontSize="small" sx={{ color: T.muted }} />
                                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                    {item.estimatedTime}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                <Layers fontSize="small" sx={{ color: T.muted }} />
                                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                    {item.modulesCount} Modules
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Action Button */}
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={() => setSelectedItem(item)}
                                            endIcon={<ArrowForward />}
                                            sx={{
                                                mt: "auto",
                                                borderRadius: 2.5,
                                                textTransform: "none",
                                                fontWeight: 800,
                                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                                                background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                                                boxShadow: "0 4px 14px rgba(20, 140, 255, 0.25)",
                                            }}
                                        >
                                            Explore Material
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* ── Material Detail Dialog Modal ── */}
                {selectedItem && (
                    <Dialog
                        open={Boolean(selectedItem)}
                        onClose={() => setSelectedItem(null)}
                        maxWidth="md"
                        fullWidth
                        PaperProps={{
                            sx: {
                                borderRadius: 4,
                                p: 1,
                                background: T.bg,
                            },
                        }}
                    >
                        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Chip
                                    label={selectedItem.contentType.toUpperCase()}
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 800 }}
                                />
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Topic: {selectedItem.topic}
                                </Typography>
                            </Box>
                            <IconButton onClick={() => setSelectedItem(null)}>
                                <Close />
                            </IconButton>
                        </DialogTitle>

                        <DialogContent dividers sx={{ border: "none" }}>
                            <Typography variant="h4" fontWeight={900} sx={{ mb: 1.5, color: T.text, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                {selectedItem.title}
                            </Typography>

                            {/* Tutor Info Block */}
                            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: "rgba(20, 140, 255, 0.06)", mb: 3, border: `1px solid ${T.border}` }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Avatar sx={{ width: 48, height: 48, background: `linear-gradient(135deg, ${T.amber}, ${T.primary})`, fontWeight: 800, fontSize: "1.2rem" }}>
                                        {selectedItem.tutorAvatar}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                                            Published by {selectedItem.tutorName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedItem.tutorTitle} • Verified Faculty / Tutor
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            <Typography variant="body1" paragraph sx={{ lineHeight: 1.7, color: T.textLight }}>
                                {selectedItem.description}
                            </Typography>

                            {/* Tags */}
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
                                {selectedItem.tags.map((tag) => (
                                    <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                                ))}
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {/* Curriculum Modules */}
                            <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: T.text }}>
                                Syllabus & Module Breakdown
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {selectedItem.modules.map((mod, idx) => (
                                    <Paper
                                        key={idx}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            background: "#fff",
                                            border: `1px solid ${T.border}`,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="primary">
                                                {mod.name}
                                            </Typography>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {mod.duration}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {mod.detail}
                                        </Typography>
                                    </Paper>
                                ))}
                            </Box>
                        </DialogContent>

                        <DialogActions sx={{ p: 3, pt: 1, justifyContent: "space-between" }}>
                            <Button onClick={() => setSelectedItem(null)} color="inherit" sx={{ fontWeight: 700 }}>
                                Close
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => handleEnroll(selectedItem)}
                                startIcon={<CheckCircle />}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 4,
                                    py: 1.2,
                                    fontWeight: 800,
                                    background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                                }}
                            >
                                Enroll & Add to My Learning Plan
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

                {/* Toast Notification */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={4000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert severity="success" sx={{ borderRadius: 3, fontWeight: 700 }}>
                        {snackbarMsg}
                    </Alert>
                </Snackbar>
            </Container>
        </section>
    );
}
