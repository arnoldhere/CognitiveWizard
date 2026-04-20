import { useState, useMemo } from "react";
import {
    Container,
    Typography,
    Box,
    Tabs,
    Tab,
    Paper,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Fade,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Stack,
    Divider,
} from "@mui/material";
import {
    Link as LinkIcon,
    SmartDisplay,
    UploadFile,
    AutoAwesome,
    CheckCircle,
    Lightbulb,
    TrendingUp,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { summarizeContent, uploadSummaryFile } from "../services/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Parse summary text into structured content with paragraphs, lists, and emphasis
 */
const parseSummaryContent = (text) => {
    const sections = [];
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

    paragraphs.forEach((para) => {
        const trimmed = para.trim();

        if (!trimmed) return;

        if (
            /^[\s]*[-•*]\s/.test(trimmed) ||
            /^\d+[.)]\s/.test(trimmed)
        ) {
            const items = trimmed.split(/\n/).filter((i) => i.trim());
            sections.push({
                type: "list",
                items: items.map((item) =>
                    item.replace(/^[\s]*[-•*\d.)]\s+/, "").trim()
                ),
            });
        } else {
            sections.push({
                type: "paragraph",
                content: trimmed,
            });
        }
    });

    return sections;
};
/**
 * Enhanced summary display component with better readability
 */
const SummaryDisplay = ({ summary, mode }) => {
    const sections = useMemo(() => parseSummaryContent(summary), [summary]);

    const modeConfig = {
        concise: {
            icon: <Lightbulb sx={{ fontSize: 24, color: "#f59e0b" }} />,
            title: "Quick Insight",
            subtitle: "Ultra-concise summary",
            bgColor: "rgba(245, 158, 11, 0.05)",
            borderColor: "#fde68a",
        },
        brief: {
            icon: <CheckCircle sx={{ fontSize: 24, color: "#3b82f6" }} />,
            title: "Brief Overview",
            subtitle: "Key points summary",
            bgColor: "rgba(59, 130, 246, 0.05)",
            borderColor: "#bfdbfe",
        },
        summary: {
            icon: <TrendingUp sx={{ fontSize: 24, color: "#10b981" }} />,
            title: "Main Summary",
            subtitle: "Balanced overview",
            bgColor: "rgba(16, 185, 129, 0.05)",
            borderColor: "#a7f3d0",
        },
        detailed: {
            icon: <AutoAwesome sx={{ fontSize: 24, color: "#8b5cf6" }} />,
            title: "Detailed Analysis",
            subtitle: "Comprehensive summary",
            bgColor: "rgba(139, 92, 246, 0.05)",
            borderColor: "#ddd6fe",
        },
    };

    const config = modeConfig[mode] || modeConfig.brief;

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Paper
                sx={{
                    mt: 5,
                    p: { xs: 3, md: 5 },
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)",
                    border: `2px solid ${config.borderColor}`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
            >
                {/* HEADER */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 3,
                        pb: 3,
                        borderBottom: `1px solid ${config.borderColor}`,
                    }}
                >
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            background: config.bgColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {config.icon}
                    </Box>
                    <Box>
                        <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{
                                background: `linear-gradient(90deg, ${config.borderColor}, currentColor)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            {config.title}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={500}
                        >
                            {config.subtitle}
                        </Typography>
                    </Box>
                </Box>

                {/* CONTENT */}
                <Box sx={{ lineHeight: 1.8 }}>
                    {sections.map((section, idx) => (
                        <Box key={idx} sx={{ mb: 3 }}>
                            {section.type === "paragraph" ? (
                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: "#1f2937",
                                        fontSize: "0.95rem",
                                        letterSpacing: "0.3px",
                                        lineHeight: 1.85,
                                        textAlign: "justify",
                                    }}
                                >
                                    {/* Format emphasized text */}
                                    {section.content.split(/(\*\*.*?\*\*)/g).map(
                                        (part, i) =>
                                            part.startsWith("**") ? (
                                                <strong
                                                    key={i}
                                                    style={{
                                                        fontWeight: 700,
                                                        color: "#374151",
                                                    }}
                                                >
                                                    {part.replace(/\*\*/g, "")}
                                                </strong>
                                            ) : (
                                                part
                                            )
                                    )}
                                </Typography>
                            ) : (
                                <Box>
                                    <Box
                                        component="ul"
                                        sx={{
                                            pl: 3,
                                            m: 0,
                                            "& li": {
                                                mb: 1.5,
                                                color: "#374151",
                                                lineHeight: 1.8,
                                            },
                                            "& li::marker": {
                                                color: config.borderColor,
                                                fontWeight: 700,
                                                fontSize: "1.2em",
                                            },
                                        }}
                                    >
                                        {section.items.map((item, i) => (
                                            <Typography
                                                component="li"
                                                key={i}
                                                sx={{
                                                    fontSize: "0.95rem",
                                                }}
                                            >
                                                {item}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>

                {/* FOOTER STATS */}
                <Divider sx={{ my: 3 }} />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                    >
                        {summary.split(" ").length} words • {sections.length}{" "}
                        sections
                    </Typography>
                    <Button
                        size="medium"
                        variant="outlined"
                        onClick={() => {
                            navigator.clipboard.writeText(summary);
                        }}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            color: config.borderColor,
                            bgcolor: "AccentColor",
                            "&:hover": {
                                background: config.bgColor,
                                color: "red"
                            },
                        }}
                    >
                        Copy
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default function SummarizerPage() {
    const [source, setSource] = useState("file");
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState("");
    const [youtube, setYoutube] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState("");
    const [mode, setMode] = useState("brief");

    const handleTabChange = (_, newValue) => {
        setSource(newValue);
        setError("");
        setFile(null);
        setUrl("");
        setYoutube("");
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        if (
            ![
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ].includes(selected.type)
        ) {
            return setError("Only PDF & DOCX allowed");
        }

        if (selected.size > MAX_FILE_SIZE) {
            return setError("File must be under 50MB");
        }

        setError("");
        setFile(selected);
    };

    const handleSubmit = async () => {
        setError("");
        setSummary("");

        if (source === "file" && !file) return setError("Upload a document");
        if (source === "url" && !url.trim()) return setError("Enter a URL");
        if (source === "youtube" && !youtube.trim())
            return setError("Enter YouTube link");

        setLoading(true);

        try {
            let response;
            const model_mode = "api";

            if (source === "file") {
                response = await uploadSummaryFile(file, mode, model_mode);
            } else {
                response = await summarizeContent({
                    input_type: source === "url" ? "url" : "youtube",
                    source: source === "url" ? url : youtube,
                    mode,
                    model_mode,
                });
            }

            if (response?.status === "success") {
                setSummary(response.data.summary);
            } else {
                console.log("API Error:", response);
                setError(response?.detail || "Unexpected error");
            }
        } catch (err) {
            setError(err.message || "Failed");
            // console.log(err)
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 10 }}>
            {/* HEADER */}
            <Box textAlign="center" mb={6}>
                <Typography
                    variant="h3"
                    fontWeight={900}
                    sx={{
                        background: "linear-gradient(90deg,#6366f1,#9333ea)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    AI Summarizer
                </Typography>

                <Typography mt={1} color="text.secondary">
                    Turn long content into powerful insights instantly
                </Typography>
            </Box>

            {/* MAIN CARD */}
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,0,0,0.05)",
                }}
            >
                {/* TABS */}
                <Tabs
                    value={source}
                    onChange={handleTabChange}
                    centered
                    sx={{
                        mb: 4,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 600,
                        },
                    }}
                >
                    <Tab icon={<UploadFile />} label="Document" value="file" />
                    <Tab icon={<LinkIcon />} label="URL" value="url" />
                    <Tab icon={<SmartDisplay />} label="YouTube" value="youtube" />
                </Tabs>

                {/* INPUT AREA */}
                <Stack spacing={3}>
                    {source === "file" && (
                        <Box
                            sx={{
                                border: "2px dashed #c7d2fe",
                                borderRadius: 3,
                                p: 4,
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "0.3s",
                                "&:hover": {
                                    background: "#f5f3ff",
                                },
                            }}
                        >
                            <UploadFile sx={{ fontSize: 40, color: "#6366f1" }} />
                            <Typography mt={1}>
                                Click or drag file to upload
                            </Typography>
                            <input
                                type="file"
                                hidden
                                onChange={handleFileChange}
                                id="fileInput"
                            />
                            <label htmlFor="fileInput">
                                <Button component="span" sx={{ mt: 2 }}>
                                    Browse File
                                </Button>
                            </label>

                            {file && (
                                <Typography mt={1} color="success.main">
                                    {file.name}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {(source === "url" || source === "youtube") && (
                        <TextField
                            fullWidth
                            placeholder={
                                source === "url"
                                    ? "Paste article URL..."
                                    : "Paste YouTube link..."
                            }
                            value={source === "url" ? url : youtube}
                            onChange={(e) =>
                                source === "url"
                                    ? setUrl(e.target.value)
                                    : setYoutube(e.target.value)
                            }
                            sx={{ borderRadius: 3 }}
                        />
                    )}

                    {/* MODE */}
                    <FormControl fullWidth>
                        <InputLabel>Summary Mode</InputLabel>
                        <Select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                        >
                            <MenuItem value="concise">Concise</MenuItem>
                            <MenuItem value="brief">Brief</MenuItem>
                            <MenuItem value="summary">Summary</MenuItem>
                            <MenuItem value="detailed">Detailed</MenuItem>
                        </Select>
                    </FormControl>

                    {error && <Alert severity="error">{error}</Alert>}

                    {/* BUTTON */}
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={loading}
                        startIcon={<AutoAwesome />}
                        sx={{
                            py: 1.5,
                            borderRadius: 3,
                            background:
                                "linear-gradient(90deg,#6366f1,#9333ea)",
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={22} />
                        ) : (
                            "Generate Summary"
                        )}
                    </Button>
                </Stack>
            </Paper>

            {/* RESULT */}
            {summary && <SummaryDisplay summary={summary} mode={mode} />}
        </Container>
    );
}