import { useState, useMemo } from "react";
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

/* ── Static Tutor Material Data ── */
const staticMarketplaceItems = [
    {
        id: 1,
        title: "Full-Stack Modern Web Engineering 2026",
        contentType: "roadmap",
        topic: "Web Development",
        tutorName: "Prof. Alex Rivera",
        tutorTitle: "Senior Web Educator & Full-Stack Architect",
        tutorAvatar: "A",
        tutorVerified: true,
        rating: 4.9,
        reviewsCount: 312,
        enrolledCount: 1420,
        difficulty: "Intermediate",
        estimatedTime: "12 Weeks (6 hrs/week)",
        modulesCount: 8,
        description: "A comprehensive, phase-by-phase learning path covering React 19, Node.js microservices, PostgreSQL, GraphQL, and modern DevOps deployment pipelines.",
        tags: ["React", "Node.js", "PostgreSQL", "System Architecture"],
        modules: [
            { name: "Phase 1: Modern JavaScript & Async Paradigms", duration: "1.5 Weeks", detail: "Deep dive into ESNext, Event Loop, Closures, Promises, and Module systems." },
            { name: "Phase 2: React 19 Core & Client State Patterns", duration: "2 Weeks", detail: "Server Components, Action hooks, Context, and state management best practices." },
            { name: "Phase 3: Express & Node API Architecture", duration: "2 Weeks", detail: "RESTful principles, JWT authentication, rate limiting, and middleware chains." },
            { name: "Phase 4: Database Design & Query Optimization", duration: "2.5 Weeks", detail: "PostgreSQL schemas, indexing strategies, transactions, and Prisma ORM." },
            { name: "Phase 5: Cloud Deployment & CI/CD Pipelines", duration: "2 Weeks", detail: "Docker containers, GitHub Actions, and production infrastructure management." }
        ]
    },
    {
        id: 2,
        title: "Mastering Machine Learning & Neural Networks",
        contentType: "course",
        topic: "Artificial Intelligence",
        tutorName: "Dr. Elena Vance",
        tutorTitle: "AI Research Lead & University Lecturer",
        tutorAvatar: "E",
        tutorVerified: true,
        rating: 4.95,
        reviewsCount: 480,
        enrolledCount: 2890,
        difficulty: "Advanced",
        estimatedTime: "16 Weeks (8 hrs/week)",
        modulesCount: 10,
        description: "Rigorous curriculum covering foundational mathematics, supervised & unsupervised learning, PyTorch deep learning architectures, and Large Language Model fine-tuning.",
        tags: ["Python", "PyTorch", "Machine Learning", "LLMs"],
        modules: [
            { name: "Module 1: Mathematical Foundations for AI", duration: "2 Weeks", detail: "Linear Algebra, Vector Calculus, Probability distributions, and Gradient Descent." },
            { name: "Module 2: Supervised Learning Algorithms", duration: "3 Weeks", detail: "Regression, Decision Trees, SVMs, Ensemble methods, and Model evaluation." },
            { name: "Module 3: Neural Networks & PyTorch", duration: "3 Weeks", detail: "Backpropagation, CNNs, ResNets, Optimizers, and Loss functions." },
            { name: "Module 4: Transformers & Attention Mechanisms", duration: "4 Weeks", detail: "Self-attention, Transformer architectures, BERT, GPT, and fine-tuning with LoRA." },
            { name: "Module 5: Capstone: Building a Production RAG System", duration: "4 Weeks", detail: "Vector DB indexing, hybrid retrieval, guardrails, and model evaluation." }
        ]
    },
    {
        id: 3,
        title: "System Design & Distributed Architectures Guide",
        contentType: "guide",
        topic: "Software Architecture",
        tutorName: "Marcus Vance",
        tutorTitle: "Staff Systems Engineer & Author",
        tutorAvatar: "M",
        tutorVerified: true,
        rating: 4.88,
        reviewsCount: 195,
        enrolledCount: 2150,
        difficulty: "Advanced",
        estimatedTime: "6 Weeks (4 hrs/week)",
        modulesCount: 5,
        description: "Step-by-step practical guide to designing high-throughput, fault-tolerant distributed systems. Includes real-world case studies of top tech platforms.",
        tags: ["System Design", "Scalability", "Redis", "Kafka"],
        modules: [
            { name: "Step 1: Scalability & Load Balancing Strategies", duration: "1 Week", detail: "Horizontal vs Vertical scaling, DNS routing, Nginx/HAProxy configuration." },
            { name: "Step 2: Caching Strategies & Memory Storage", duration: "1 Week", detail: "Cache-aside, Write-through, Redis cluster patterns, and Eviction policies." },
            { name: "Step 3: Message Queues & Event-Driven Architecture", duration: "1.5 Weeks", detail: "Apache Kafka streams, RabbitMQ, Decoupling services, and Eventual consistency." },
            { name: "Step 4: Database Sharding & Replication", duration: "1.5 Weeks", detail: "Consistent hashing, Master-Replica topologies, Distributed locks." },
            { name: "Step 5: Monitoring, Telemetry & Disaster Recovery", duration: "1 Week", detail: "Prometheus, Grafana, Distributed Tracing (Jaeger), and Circuit Breakers." }
        ]
    },
    {
        id: 4,
        title: "Data Structures & Algorithmic Thinking Roadmap",
        contentType: "roadmap",
        topic: "Computer Science",
        tutorName: "Prof. Sarah Chen",
        tutorTitle: "Computer Science Faculty",
        tutorAvatar: "S",
        tutorVerified: true,
        rating: 4.92,
        reviewsCount: 520,
        enrolledCount: 3400,
        difficulty: "Beginner to Intermediate",
        estimatedTime: "10 Weeks (5 hrs/week)",
        modulesCount: 6,
        description: "Structured roadmap from fundamental data structures to advanced graph algorithms and dynamic programming for coding interviews and software engineering mastery.",
        tags: ["Algorithms", "Data Structures", "Problem Solving", "Interview Prep"],
        modules: [
            { name: "Phase 1: Arrays, Linked Lists & Pointers", duration: "2 Weeks", detail: "Memory allocation, Two-pointer technique, Sliding window algorithms." },
            { name: "Phase 2: Stacks, Queues & Hash Maps", duration: "1.5 Weeks", detail: "Collision resolution, Monotonic stacks, LRU Cache implementation." },
            { name: "Phase 3: Trees, Heaps & Priority Queues", duration: "2 Weeks", detail: "Binary Search Trees, AVL Trees, Heapsort, Tries for prefix lookup." },
            { name: "Phase 4: Graph Theory & Traversals", duration: "2.5 Weeks", detail: "BFS, DFS, Dijkstra's algorithm, Topological sort, Disjoint Set (Union-Find)." },
            { name: "Phase 5: Dynamic Programming & Greedy Strategies", duration: "2 Weeks", detail: "Memoization, Tabulation, Knapsack variations, Longest Common Subsequence." }
        ]
    },
    {
        id: 5,
        title: "Cybersecurity & Ethical Hacking Mastery",
        contentType: "course",
        topic: "Cybersecurity",
        tutorName: "David Miller",
        tutorTitle: "Certified Ethical Hacker & Defense Lead",
        tutorAvatar: "D",
        tutorVerified: true,
        rating: 4.85,
        reviewsCount: 140,
        enrolledCount: 750,
        difficulty: "Intermediate",
        estimatedTime: "8 Weeks (5 hrs/week)",
        modulesCount: 7,
        description: "Hands-on course in network security, web application security (OWASP Top 10), penetration testing techniques, and defensive hardening.",
        tags: ["Cybersecurity", "OWASP", "Penetration Testing", "Network Security"],
        modules: [
            { name: "Module 1: Networking Protocols & Packet Analysis", duration: "1.5 Weeks", detail: "TCP/IP, Wireshark inspection, Subnetting, and Port Scanning with Nmap." },
            { name: "Module 2: Web Vulnerabilities & OWASP Top 10", duration: "2 Weeks", detail: "SQL Injection, XSS, CSRF, Authentication bypasses, and Burp Suite." },
            { name: "Module 3: Cryptography & Public Key Infrastructure", duration: "1.5 Weeks", detail: "Symmetric/Asymmetric encryption, Hashing, TLS/SSL certificates." },
            { name: "Module 4: Defensive Hardening & Incident Response", duration: "3 Weeks", detail: "Firewall rules, SIEM logging, SOC monitoring, and Remediation strategies." }
        ]
    },
    {
        id: 6,
        title: "Cloud Native & Kubernetes DevOps Guide",
        contentType: "guide",
        topic: "DevOps & Cloud",
        tutorName: "Priya Sharma",
        tutorTitle: "Lead Cloud Architect",
        tutorAvatar: "P",
        tutorVerified: true,
        rating: 4.91,
        reviewsCount: 210,
        enrolledCount: 1600,
        difficulty: "Intermediate",
        estimatedTime: "6 Weeks (4 hrs/week)",
        modulesCount: 5,
        description: "Actionable guide for containerizing applications with Docker, orchestrating clusters with Kubernetes, and managing Infrastructure as Code using Terraform.",
        tags: ["DevOps", "Kubernetes", "Docker", "Terraform", "AWS"],
        modules: [
            { name: "Step 1: Containerization with Docker", duration: "1 Week", detail: "Dockerfile optimization, multi-stage builds, container security scanning." },
            { name: "Step 2: Kubernetes Cluster Architecture", duration: "1.5 Weeks", detail: "Pods, Deployments, Services, Ingress controllers, and Helm charts." },
            { name: "Step 3: Infrastructure as Code (Terraform)", duration: "1.5 Weeks", detail: "Provisioning AWS EKS, VPCs, and IAM policies declaratively." },
            { name: "Step 4: Continuous Delivery & GitOps", duration: "2 Weeks", detail: "ArgoCD setup, Progressive rollouts, and Observability with Grafana." }
        ]
    }
];

export default function Marketplace() {
    const [selectedTab, setSelectedTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState("");

    const filteredItems = useMemo(() => {
        return staticMarketplaceItems.filter(item => {
            const matchesTab =
                selectedTab === "all" ||
                item.contentType.toLowerCase() === selectedTab.toLowerCase();

            const query = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !query ||
                item.title.toLowerCase().includes(query) ||
                item.topic.toLowerCase().includes(query) ||
                item.tutorName.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query));

            return matchesTab && matchesQuery;
        });
    }, [selectedTab, searchQuery]);

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
                                    {staticMarketplaceItems.length}+ Published
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
                {filteredItems.length === 0 ? (
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
