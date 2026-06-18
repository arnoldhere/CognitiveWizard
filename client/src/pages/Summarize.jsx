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
    ContentCopy,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { summarizeContent, uploadSummaryFile } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

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
            /^[\s]*[-\u2022*]\s/.test(trimmed) ||
            /^\d+[.)]\s/.test(trimmed)
        ) {
            const items = trimmed.split(/\n/).filter((i) => i.trim());
            sections.push({
                type: "list",
                items: items.map((item) =>
                    item.replace(/^[\s]*[-\u2022*\d.)]\s+/, "").trim()
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
    const [copied, setCopied] = useState(false);

    const modeConfig = {
        concise: {
            icon: <Lightbulb sx={{ fontSize: 24, color: "#fbbf24" }} />,
            title: "Quick Insight",
            subtitle: "Ultra-concise summary",
            bgColor: "rgba(251, 191, 36, 0.08)",
            borderColor: "rgba(251, 191, 36, 0.3)",
            textColor: "#fde68a",
        },
        brief: {
            icon: <CheckCircle sx={{ fontSize: 24, color: "#60a5fa" }} />,
            title: "Brief Overview",
            subtitle: "Key points summary",
            bgColor: "rgba(96, 165, 250, 0.08)",
            borderColor: "rgba(96, 165, 250, 0.3)",
            textColor: "#bfdbfe",
        },
        summary: {
            icon: <TrendingUp sx={{ fontSize: 24, color: "#34d399" }} />,
            title: "Main Summary",
            subtitle: "Balanced overview",
            bgColor: "rgba(52, 211, 153, 0.08)",
            borderColor: "rgba(52, 211, 153, 0.3)",
            textColor: "#a7f3d0",
        },
        detailed: {
            icon: <AutoAwesome sx={{ fontSize: 24, color: "#a78bfa" }} />,
            title: "Detailed Analysis",
            subtitle: "Comprehensive summary",
            bgColor: "rgba(167, 139, 250, 0.08)",
            borderColor: "rgba(167, 139, 250, 0.3)",
            textColor: "#ddd6fe",
        },
    };

    const config = modeConfig[mode] || modeConfig.brief;

    const handleCopy = () => {
        navigator.clipboard.writeText(summary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                    borderRadius: 4,
                    background: "rgba(22, 27, 39, 0.95)",
                    border: `1.5px solid ${config.borderColor}`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    backdropFilter: "blur(16px)",
                    color: "#e2e8f0",
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
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
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
                            border: `1px solid ${config.borderColor}`,
                        }}
                    >
                        {config.icon}
                    </Box>
                    <Box>
                        <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{
                                color: "#f1f5f9",
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
                                        color: "#cbd5e1",
                                        fontSize: "0.95rem",
                                        letterSpacing: "0.3px",
                                        lineHeight: 1.85,
                                    }}
                                >
                                    {section.content.split(/(\*\*.*?\*\*)/g).map(
                                        (part, i) =>
                                            part.startsWith("**") ? (
                                                <strong
                                                    key={i}
                                                    style={{
                                                        fontWeight: 700,
                                                        color: "#f1f5f9",
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
                                                color: "#cbd5e1",
                                                lineHeight: 1.8,
                                            },
                                            "& li::marker": {
                                                color: config.textColor,
                                                fontWeight: 700,
                                                fontSize: "1.1em",
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
                <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.08)" }} />
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
                        {summary.split(/\s+/).length} words | {sections.length} sections
                    </Typography>
                    <Button
                        size="medium"
                        variant="outlined"
                        onClick={handleCopy}
                        startIcon={<ContentCopy />}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            borderColor: "rgba(255,255,255,0.12)",
                            bgcolor: "rgba(255,255,255,0.03)",
                            "&:hover": {
                                background: "rgba(255,255,255,0.08)",
                                borderColor: "rgba(255,255,255,0.2)",
                            },
                        }}
                    >
                        {copied ? "Copied!" : "Copy Summary"}
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
            setError(getApiErrorMessage(err, "Failed to generate summary. Please try again."));
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
                        background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    AI Summarizer
                </Typography>

                <Typography mt={1.5} color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                    Turn long content into powerful insights instantly
                </Typography>
            </Box>

            {/* MAIN CARD */}
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 4,
                    background: "rgba(22, 27, 39, 0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                {/* TABS */}
                <Tabs
                    value={source}
                    onChange={handleTabChange}
                    centered
                    sx={{
                        mb: 4,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#94a3b8",
                            "&.Mui-selected": {
                                color: "#06b6d4",
                            }
                        },
                        "& .MuiTabs-indicator": {
                            backgroundColor: "#06b6d4",
                        }
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
                                border: "2px dashed rgba(124, 58, 237, 0.3)",
                                borderRadius: 3,
                                p: 4,
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "0.2s ease-in-out",
                                background: "rgba(255, 255, 255, 0.01)",
                                "&:hover": {
                                    background: "rgba(124, 58, 237, 0.05)",
                                    borderColor: "#7c3aed",
                                },
                            }}
                        >
                            <UploadFile sx={{ fontSize: 48, color: "#a78bfa", mb: 1 }} />
                            <Typography sx={{ color: "#cbd5e1", fontWeight: 600 }}>
                                Click or drag file to upload
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                PDF & DOCX up to 50MB
                            </Typography>
                            <input
                                type="file"
                                hidden
                                onChange={handleFileChange}
                                id="fileInput"
                            />
                            <label htmlFor="fileInput">
                                <Button component="span" variant="outlined" sx={{ mt: 2, textTransform: "none", fontWeight: 600, color: "#a78bfa", borderColor: "rgba(167, 139, 250, 0.4)" }}>
                                    Browse File
                                </Button>
                            </label>

                            {file && (
                                <Typography mt={2} color="success.main" sx={{ fontWeight: 600 }}>
                                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </Typography>
                            )}
                        </Box>
                    )}

                    {(source === "url" || source === "youtube") && (
                        <TextField
                            fullWidth
                            variant="outlined"
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
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                                    "& fieldset": {
                                        borderColor: "rgba(255, 255, 255, 0.08)",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: "rgba(255, 255, 255, 0.15)",
                                    },
                                }
                            }}
                        />
                    )}

                    {/* MODE */}
                    <FormControl fullWidth>
                        <InputLabel sx={{ color: "#94a3b8" }}>Summary Mode</InputLabel>
                        <Select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            label="Summary Mode"
                            sx={{
                                backgroundColor: "rgba(255, 255, 255, 0.02)",
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "rgba(255, 255, 255, 0.08)",
                                },
                            }}
                        >
                            <MenuItem value="concise">Concise</MenuItem>
                            <MenuItem value="brief">Brief</MenuItem>
                            <MenuItem value="summary">Summary</MenuItem>
                            <MenuItem value="detailed">Detailed</MenuItem>
                        </Select>
                    </FormControl>

                    {error && (
                        <Alert 
                            severity="error"
                            sx={{
                                bgcolor: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                color: "#fca5a5",
                                "& .MuiAlert-icon": { color: "#f87171" }
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* BUTTON */}
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={loading}
                        startIcon={!loading && <AutoAwesome />}
                        sx={{
                            py: 1.8,
                            borderRadius: 3,
                            fontWeight: 700,
                            color: "#ffffff",
                            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                            boxShadow: "0 6px 20px rgba(124, 58, 237, 0.35)",
                            "&:hover": {
                                background: "linear-gradient(90deg, #6d28d9, #0891b2)",
                            }
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
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
