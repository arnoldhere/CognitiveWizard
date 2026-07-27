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
            sections.push({ type: "paragraph", content: trimmed });
        }
    });

    return sections;
};

/**
 * Enhanced summary display – Light Teal theme
 */
const SummaryDisplay = ({ summary, mode, tokenUsage }) => {
    const sections = useMemo(() => parseSummaryContent(summary), [summary]);
    const [copied, setCopied] = useState(false);

    const modeConfig = {
        concise: {
            icon: <Lightbulb sx={{ fontSize: 24, color: "#A38CFF" }} />,
            title: "Quick Insight",
            subtitle: "Ultra-concise summary",
            bgColor: "rgba(245, 158, 11, 0.08)",
            borderColor: "rgba(245, 158, 11, 0.28)",
            accentColor: "#5736C8",
            markerColor: "#A38CFF",
        },
        brief: {
            icon: <CheckCircle sx={{ fontSize: 24, color: "#148CFF" }} />,
            title: "Brief Overview",
            subtitle: "Key points summary",
            bgColor: "rgba(20, 140, 255, 0.08)",
            borderColor: "rgba(20, 140, 255, 0.28)",
            accentColor: "#148CFF",
            markerColor: "#1ED9F2",
        },
        summary: {
            icon: <TrendingUp sx={{ fontSize: 24, color: "#1ED9F2" }} />,
            title: "Main Summary",
            subtitle: "Balanced overview",
            bgColor: "rgba(30, 217, 242, 0.08)",
            borderColor: "rgba(30, 217, 242, 0.28)",
            accentColor: "#0BAABD",
            markerColor: "#1ED9F2",
        },
        detailed: {
            icon: <AutoAwesome sx={{ fontSize: 24, color: "#7655F6" }} />,
            title: "Detailed Analysis",
            subtitle: "Comprehensive summary",
            bgColor: "rgba(118, 85, 246, 0.08)",
            borderColor: "rgba(118, 85, 246, 0.28)",
            accentColor: "#5736C8",
            markerColor: "#7655F6",
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
                    background: "rgba(255, 255, 255, 0.90)",
                    border: `1.5px solid ${config.borderColor}`,
                    boxShadow: `0 12px 40px rgba(20, 140, 255,0.10), 0 2px 8px rgba(0,0,0,0.03)`,
                    backdropFilter: "blur(20px)",
                    outline: "1px solid rgba(255,255,255,0.85)",
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
                        borderBottom: "1px solid rgba(20, 140, 255,0.12)",
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
                                color: "#07152E",
                                fontFamily: '"Plus Jakarta Sans", sans-serif',
                            }}
                        >
                            {config.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
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
                                        color: "#334155",
                                        fontSize: "0.95rem",
                                        letterSpacing: "0.2px",
                                        lineHeight: 1.85,
                                    }}
                                >
                                    {section.content.split(/(\*\*.*?\*\*)/g).map(
                                        (part, i) =>
                                            part.startsWith("**") ? (
                                                <strong
                                                    key={i}
                                                    style={{
                                                        fontWeight: 800,
                                                        color: "#07152E",
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
                                <Box
                                    component="ul"
                                    sx={{
                                        pl: 3,
                                        m: 0,
                                        "& li": {
                                            mb: 1.5,
                                            color: "#334155",
                                            lineHeight: 1.8,
                                        },
                                        "& li::marker": {
                                            color: config.markerColor,
                                            fontWeight: 700,
                                            fontSize: "1.1em",
                                        },
                                    }}
                                >
                                    {section.items.map((item, i) => (
                                        <Typography
                                            component="li"
                                            key={i}
                                            sx={{ fontSize: "0.95rem" }}
                                        >
                                            {item}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>

                {/* FOOTER STATS */}
                <Divider sx={{ my: 3, borderColor: "rgba(20, 140, 255,0.12)" }} />
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2,
                    }}
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {summary.split(/\s+/).length} words · {sections.length} sections
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {tokenUsage && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#7187A9",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    background: "rgba(20, 140, 255,0.06)",
                                    px: 1.5,
                                    py: 0.8,
                                    borderRadius: 2,
                                    border: "1px solid rgba(20, 140, 255,0.14)",
                                }}
                            >
                                Tokens:{" "}
                                <span style={{ color: "#148CFF", fontWeight: 700 }}>
                                    {tokenUsage.input_tokens || tokenUsage.prompt_tokens || 0}
                                </span>{" "}
                                in /{" "}
                                <span style={{ color: "#7655F6", fontWeight: 700 }}>
                                    {tokenUsage.output_tokens || tokenUsage.completion_tokens || 0}
                                </span>{" "}
                                out
                            </Typography>
                        )}
                        <Button
                            size="medium"
                            variant="outlined"
                            onClick={handleCopy}
                            startIcon={<ContentCopy />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                color: copied ? "#148CFF" : "#4D6486",
                                borderColor: copied
                                    ? "rgba(20, 140, 255,0.4)"
                                    : "rgba(20, 140, 255,0.22)",
                                bgcolor: copied
                                    ? "rgba(20, 140, 255,0.06)"
                                    : "rgba(255,255,255,0.7)",
                                "&:hover": {
                                    background: "rgba(20, 140, 255,0.08)",
                                    borderColor: "rgba(20, 140, 255,0.4)",
                                    color: "#148CFF",
                                },
                                transition: "all 0.2s ease",
                            }}
                        >
                            {copied ? "Copied!" : "Copy Summary"}
                        </Button>
                    </Box>
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
    const [tokenUsage, setTokenUsage] = useState(null);
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
        setTokenUsage(null);

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
                setTokenUsage(response.data.token_usage);
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
        <Container maxWidth="md" sx={{ py: 10, position: "relative", zIndex: 1 }}>
            {/* PAGE HEADER */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                textAlign="center"
                mb={6}
            >
                {/* Kicker */}
                <Typography
                    variant="overline"
                    sx={{
                        display: "block",
                        mb: 1.5,
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        fontSize: "0.75rem",
                        background: "linear-gradient(90deg, #148CFF, #1ED9F2)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    AI-Powered · Quick Study
                </Typography>

                <Typography
                    variant="h3"
                    fontWeight={900}
                    sx={{
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        letterSpacing: "-0.025em",
                        background: "linear-gradient(135deg, #07152E 0%, #148CFF 55%, #1ED9F2 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    AI Summarizer
                </Typography>

                <Typography
                    mt={1.5}
                    sx={{
                        color: "#4D6486",
                        fontSize: "1.05rem",
                        lineHeight: 1.7,
                        fontWeight: 500,
                    }}
                >
                    Turn long content into powerful insights — instantly
                </Typography>
            </Box>

            {/* MAIN CARD */}
            <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.88)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255, 255, 255, 0.92)",
                    outline: "1px solid rgba(20, 140, 255,0.10)",
                    boxShadow: "0 16px 50px rgba(20, 140, 255,0.10), 0 4px 16px rgba(0,0,0,0.03)",
                }}
            >
                {/* TABS */}
                <Tabs
                    value={source}
                    onChange={handleTabChange}
                    centered
                    sx={{
                        mb: 4,
                        borderBottom: "1px solid rgba(20, 140, 255,0.12)",
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#7187A9",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            "&.Mui-selected": {
                                color: "#148CFF",
                            },
                        },
                        "& .MuiTabs-indicator": {
                            backgroundColor: "#148CFF",
                            height: 3,
                            borderRadius: "3px 3px 0 0",
                        },
                    }}
                >
                    <Tab icon={<UploadFile />} label="Document" value="file" />
                    <Tab icon={<LinkIcon />} label="URL" value="url" />
                    <Tab icon={<SmartDisplay />} label="YouTube" value="youtube" />
                </Tabs>

                {/* INPUT AREA */}
                <Stack spacing={3}>
                    {/* FILE DROP ZONE */}
                    {source === "file" && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            sx={{
                                border: "2px dashed rgba(20, 140, 255,0.30)",
                                borderRadius: 3,
                                p: { xs: 3, md: 5 },
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.22s ease",
                                background: "rgba(255,255,255,0.65)",
                                "&:hover": {
                                    background: "rgba(20, 140, 255,0.04)",
                                    borderColor: "#148CFF",
                                    boxShadow: "0 4px 16px rgba(20, 140, 255,0.10)",
                                },
                            }}
                        >
                            <UploadFile
                                sx={{
                                    fontSize: 52,
                                    color: "#1ED9F2",
                                    mb: 1.5,
                                    filter: "drop-shadow(0 4px 8px rgba(20, 140, 255,0.2))",
                                }}
                            />
                            <Typography sx={{ color: "#07152E", fontWeight: 700, fontSize: "1rem" }}>
                                Click or drag file to upload
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ display: "block", mt: 0.5, color: "#7187A9" }}
                            >
                                PDF & DOCX up to 50MB
                            </Typography>
                            <input
                                type="file"
                                hidden
                                onChange={handleFileChange}
                                id="fileInput"
                            />
                            <label htmlFor="fileInput">
                                <Button
                                    component="span"
                                    variant="outlined"
                                    sx={{
                                        mt: 2.5,
                                        textTransform: "none",
                                        fontWeight: 700,
                                        color: "#148CFF",
                                        borderColor: "rgba(20, 140, 255,0.35)",
                                        borderRadius: 2,
                                        "&:hover": {
                                            borderColor: "#148CFF",
                                            background: "rgba(20, 140, 255,0.06)",
                                        },
                                    }}
                                >
                                    Browse File
                                </Button>
                            </label>

                            {file && (
                                <Box
                                    sx={{
                                        mt: 2.5,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 1,
                                        px: 2,
                                        py: 0.8,
                                        borderRadius: 2,
                                        background: "rgba(20, 140, 255,0.08)",
                                        border: "1px solid rgba(20, 140, 255,0.22)",
                                    }}
                                >
                                    <CheckCircle sx={{ fontSize: 16, color: "#148CFF" }} />
                                    <Typography
                                        sx={{
                                            color: "#148CFF",
                                            fontWeight: 700,
                                            fontSize: "0.88rem",
                                        }}
                                    >
                                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* URL / YOUTUBE INPUT */}
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
                        />
                    )}

                    {/* SUMMARY MODE */}
                    <FormControl fullWidth>
                        <InputLabel>Summary Mode</InputLabel>
                        <Select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            label="Summary Mode"
                        >
                            <MenuItem value="concise">Concise</MenuItem>
                            <MenuItem value="brief">Brief</MenuItem>
                            <MenuItem value="summary">Summary</MenuItem>
                            <MenuItem value="detailed">Detailed</MenuItem>
                        </Select>
                    </FormControl>

                    {/* ERROR */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                bgcolor: "rgba(239, 68, 68, 0.07)",
                                border: "1px solid rgba(239, 68, 68, 0.22)",
                                color: "#b91c1c",
                                "& .MuiAlert-icon": { color: "#ef4444" },
                                borderRadius: 2,
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* SUBMIT BUTTON */}
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={loading}
                        startIcon={!loading && <AutoAwesome />}
                        sx={{
                            py: 1.8,
                            borderRadius: 3,
                            fontWeight: 800,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            fontSize: "1rem",
                            color: "#ffffff",
                            background: "linear-gradient(135deg, #148CFF, #1ED9F2)",
                            boxShadow: "0 6px 22px rgba(20, 140, 255,0.32)",
                            position: "relative",
                            overflow: "hidden",
                            "&::after": {
                                content: '""',
                                position: "absolute",
                                inset: 0,
                                background:
                                    "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%)",
                                transform: "translateX(-100%)",
                                transition: "transform .5s ease",
                            },
                            "&:hover::after": {
                                transform: "translateX(100%)",
                            },
                            "&:hover": {
                                background: "linear-gradient(135deg, #148CFF, #0BAABD)",
                                boxShadow: "0 10px 30px rgba(20, 140, 255,0.42)",
                                transform: "translateY(-1px)",
                            },
                            "&:disabled": {
                                background: "rgba(20, 140, 255,0.25)",
                                color: "rgba(255,255,255,0.7)",
                                boxShadow: "none",
                            },
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
            {summary && (
                <SummaryDisplay summary={summary} mode={mode} tokenUsage={tokenUsage} />
            )}
        </Container>
    );
}
