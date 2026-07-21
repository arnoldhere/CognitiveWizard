import { useState, useEffect } from "react";
import {
    Box, Typography, Paper, CircularProgress, TextField,
    Button, Grid, Switch, Snackbar, Alert,
    Divider, Chip, Tooltip, Slider
} from "@mui/material";
import {
    SlidersHorizontal,
    Save,
    Info,
    Bot,
    Wand2,
} from "lucide-react";
import { motion } from "framer-motion";
import { getLLMConfigs, updateLLMConfig } from "../../services/admin";

const palette = {
    coral: "#F26F67",
    teal:  "#34B1AA",
    blue:  "#3B8FF3",
    gold:  "#E0B50F",
};

const PARAM_META = {
    temperature: {
        label: "Temperature",
        hint: "Controls randomness. Lower = more focused, Higher = more creative.",
        icon: Wand2,
        min: 0, max: 2, step: 0.01, type: "slider",
    },
    max_new_tokens: {
        label: "Max New Tokens",
        hint: "Maximum number of tokens the model can generate in a single response.",
        icon: SlidersHorizontal,
        min: 64, max: 4096, step: 1, type: "number",
    },
    top_p: {
        label: "Top P",
        hint: "Nucleus sampling threshold. Controls diversity of word selection.",
        icon: SlidersHorizontal,
        min: 0, max: 1, step: 0.01, type: "slider",
    },
    top_k: {
        label: "Top K",
        hint: "Limits next-token selection to the top K candidates.",
        icon: SlidersHorizontal,
        min: 0, max: 200, step: 1, type: "number",
    },
    model_override: {
        label: "Model Override",
        hint: "Override the default model ID for this task. Leave blank for provider default.",
        icon: Bot,
        type: "text",
    },
};

function ConfigCard({ config, index, onChange, onSave, saving }) {
    const taskLabel = config.task_name?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
        >
            <Paper elevation={0} sx={{
                p: 3.5, borderRadius: 3,
                border: "1px solid", borderColor: "divider",
                bgcolor: "background.paper",
                "&:hover": { borderColor: palette.coral, boxShadow: `0 0 0 1px ${palette.coral}48` },
                transition: "all 0.2s ease",
            }}>
                {/* Card Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                    <Box sx={{
                        width: 38, height: 38, borderRadius: 2,
                        bgcolor: `${palette.coral}18`,
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <SlidersHorizontal size={20} color={palette.coral} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: "capitalize" }}>
                            {taskLabel}
                        </Typography>
                        <Chip label="LLM Task" size="small" sx={{ height: 18, fontSize: "0.65rem", mt: 0.25, bgcolor: `${palette.coral}14`, color: palette.coral, fontWeight: 700 }} />
                    </Box>
                </Box>

                <Divider sx={{ mb: 3, opacity: 0.5 }} />

                <Box sx={{ display: "grid", gap: 2.5 }}>
                    {/* Temperature Slider */}
                    <Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Typography variant="body2" fontWeight={600}>Temperature</Typography>
                                <Tooltip title={PARAM_META.temperature.hint} placement="top">
                                    <Info size={14} style={{ opacity: 0.6, cursor: "help" }} />
                                </Tooltip>
                            </Box>
                            <Chip label={config.temperature?.toFixed(2)} size="small"
                                sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700, bgcolor: `${palette.coral}18`, color: palette.coral }} />
                        </Box>
                        <Slider
                            value={config.temperature ?? 0.7}
                            onChange={(_, v) => onChange(index, "temperature", v)}
                            min={0} max={2} step={0.01}
                            size="small"
                            sx={{
                                color: palette.coral,
                                "& .MuiSlider-thumb": { width: 14, height: 14 },
                                "& .MuiSlider-track": { background: `linear-gradient(90deg, ${palette.coral}, #F59A94)` }
                            }}
                        />
                    </Box>

                    {/* Top P Slider */}
                    <Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <Typography variant="body2" fontWeight={600}>Top P</Typography>
                                <Tooltip title={PARAM_META.top_p.hint} placement="top">
                                    <Info size={14} style={{ opacity: 0.6, cursor: "help" }} />
                                </Tooltip>
                            </Box>
                            <Chip label={config.top_p?.toFixed(2) ?? "—"} size="small"
                                sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700, bgcolor: `${palette.teal}18`, color: palette.teal }} />
                        </Box>
                        <Slider
                            value={config.top_p ?? 0.9}
                            onChange={(_, v) => onChange(index, "top_p", v)}
                            min={0} max={1} step={0.01}
                            size="small"
                            sx={{ color: palette.teal }}
                        />
                    </Box>

                    {/* Numeric Fields */}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                                <Typography variant="body2" fontWeight={600}>Max Tokens</Typography>
                                <Tooltip title={PARAM_META.max_new_tokens.hint} placement="top">
                                    <Info size={13} style={{ opacity: 0.6, cursor: "help" }} />
                                </Tooltip>
                            </Box>
                            <TextField
                                type="number"
                                inputProps={{ min: 64, max: 4096 }}
                                value={config.max_new_tokens ?? ""}
                                onChange={e => onChange(index, "max_new_tokens", parseInt(e.target.value, 10))}
                                size="small"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                                <Typography variant="body2" fontWeight={600}>Top K</Typography>
                                <Tooltip title={PARAM_META.top_k.hint} placement="top">
                                    <Info size={13} style={{ opacity: 0.6, cursor: "help" }} />
                                </Tooltip>
                            </Box>
                            <TextField
                                type="number"
                                inputProps={{ min: 0, max: 200 }}
                                value={config.top_k ?? ""}
                                onChange={e => onChange(index, "top_k", e.target.value ? parseInt(e.target.value, 10) : null)}
                                size="small"
                                fullWidth
                                placeholder="Default"
                            />
                        </Grid>
                    </Grid>

                    {/* Model Override */}
                    <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                            <Bot size={14} style={{ opacity: 0.6 }} />
                            <Typography variant="body2" fontWeight={600}>Model Override</Typography>
                            <Tooltip title={PARAM_META.model_override.hint} placement="top">
                                <Info size={13} style={{ opacity: 0.6, cursor: "help" }} />
                            </Tooltip>
                        </Box>
                        <TextField
                            type="text"
                            value={config.model_override ?? ""}
                            onChange={e => onChange(index, "model_override", e.target.value || null)}
                            size="small"
                            fullWidth
                            placeholder="Leave blank for provider default"
                        />
                    </Box>

                    {/* Use Chat Pipeline */}
                    <Box sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        bgcolor: `${palette.coral}0d`, p: 1.5, borderRadius: 2,
                        border: "1px solid", borderColor: `${palette.coral}22`
                    }}>
                        <Box>
                            <Typography variant="body2" fontWeight={600}>Chat Pipeline</Typography>
                            <Typography variant="caption" color="text.secondary">Use conversational chat format vs. completion</Typography>
                        </Box>
                        <Switch
                            checked={config.use_chat ?? false}
                            onChange={e => onChange(index, "use_chat", e.target.checked)}
                            size="small"
                            sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": { color: palette.coral },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: palette.coral },
                            }}
                        />
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={<Save size={16} />}
                        onClick={() => onSave(config)}
                        disabled={saving}
                        fullWidth
                        sx={{ mt: 0.5, py: 1.25 }}
                    >
                        {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                </Box>
            </Paper>
        </motion.div>
    );
}

export default function AdminLLMConfigs() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => { fetchConfigs(); }, []);

    const fetchConfigs = async () => {
        try {
            const data = await getLLMConfigs();
            setConfigs(data);
        } catch {
            setToast({ open: true, message: "Failed to load configs", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index, field, value) => {
        const next = [...configs];
        next[index][field] = value;
        setConfigs(next);
    };

    const handleSave = async (config) => {
        setSaving(true);
        try {
            await updateLLMConfig(config.task_name, config);
            setToast({ open: true, message: `"${config.task_name}" config saved!`, severity: "success" });
        } catch {
            setToast({ open: true, message: "Failed to save config", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress sx={{ color: palette.coral }} />
        </Box>
    );

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>LLM Configurations</Typography>
                <Typography variant="body2" color="text.secondary">
                    Fine-tune AI model parameters per task — changes apply to the next request cycle.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {configs.map((config, i) => (
                    <Grid item xs={12} md={6} key={config.task_name}>
                        <ConfigCard
                            config={config}
                            index={i}
                            onChange={handleChange}
                            onSave={handleSave}
                            saving={saving}
                        />
                    </Grid>
                ))}
            </Grid>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={toast.severity} sx={{ width: "100%", borderRadius: 2.5 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
