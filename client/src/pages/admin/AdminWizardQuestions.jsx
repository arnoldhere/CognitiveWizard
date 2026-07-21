import { useState, useEffect } from "react";
import {
    Box, Typography, Card, CardContent, Grid, Button, Chip,
    IconButton, Switch, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
    FormControlLabel, Snackbar, Alert, Divider, Paper, CircularProgress,
    Collapse,
} from "@mui/material";
import {
    Plus, Pencil, Trash2, GripVertical, HelpCircle, CheckSquare,
    FileText, AlignLeft, Calendar, Hash, ListFilter, ChevronDown,
    ChevronUp, X, Save, PlusCircle, Eye, EyeOff, AlertTriangle,
    Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getWizardQuestionSets, createWizardQuestionSet,
    updateWizardQuestionSet, deleteWizardQuestionSet,
    toggleWizardQuestionSet,
} from "../../services/admin";

// Palette
const palette = {
    coral: "#F26F67",
    teal: "#34B1AA",
    blue: "#3B8FF3",
    gold: "#E0B50F",
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
    { value: "text", label: "Free Text", icon: AlignLeft, hint: "Open-ended text answer" },
    { value: "short_text", label: "Short Text", icon: FileText, hint: "Single-line short answer" },
    { value: "select", label: "Single Choice", icon: CheckSquare, hint: "Pick one from a list" },
    { value: "multiselect", label: "Multi Choice", icon: ListFilter, hint: "Pick multiple from a list" },
    { value: "number", label: "Number", icon: Hash, hint: "Numeric input" },
    { value: "date", label: "Date", icon: Calendar, hint: "Date picker" },
];

const CONTENT_TYPE_OPTIONS = [
    { value: "Roadmap", label: "Roadmap" },
    { value: "Course/Syllabus", label: "Course / Syllabus" },
    { value: "Guide", label: "Guide" },
    { value: "Schedule", label: "Schedule" },
];

const BLANK_QUESTION = () => ({
    key: "",
    label: "",
    type: "text",
    placeholder: "",
    options: [],
    required: true,
    _tempId: Date.now() + Math.random(),
});

const BLANK_SET = () => ({
    content_type: "",
    label: "",
    description: "",
    icon: "ExploreRounded",
    is_active: true,
    sort_order: 0,
    questions: [],
});

function normalizeQuestions(questions = []) {
    return questions.map((question, index) => ({
        ...question,
        _tempId: question._tempId || `question-${index + 1}-${question.key || "item"}`,
    }));
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 16 }) {
    const found = QUESTION_TYPES.find(t => t.value === type);
    const IconComponent = found?.icon || AlignLeft;
    return <IconComponent size={size} />;
}

function genKey(label) {
    return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

// ─── Question Editor Row ───────────────────────────────────────────────────────

function QuestionRow({ q, index, onChange, onRemove }) {
    const [optionInput, setOptionInput] = useState("");
    const needsOptions = q.type === "select" || q.type === "multiselect";

    const handleLabelChange = (e) => {
        const newLabel = e.target.value;
        onChange(index, { ...q, label: newLabel, key: genKey(newLabel) });
    };

    const addOption = () => {
        const trimmed = optionInput.trim();
        if (!trimmed) return;
        onChange(index, { ...q, options: [...(q.options || []), trimmed] });
        setOptionInput("");
    };

    const removeOption = (oi) => {
        onChange(index, { ...q, options: q.options.filter((_, i) => i !== oi) });
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5, borderRadius: 2.5,
                border: "1px solid", borderColor: "divider",
                bgcolor: "background.default",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Tooltip title="Drag to reorder">
                    <Box sx={{ cursor: "grab", display: "flex", alignItems: "center", opacity: 0.5 }}>
                        <GripVertical size={18} />
                    </Box>
                </Tooltip>
                <Chip label={`Q${index + 1}`} size="small" sx={{ fontWeight: 800, bgcolor: `${palette.coral}18`, color: palette.coral, fontSize: "0.7rem" }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <TypeIcon type={q.type} size={15} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {QUESTION_TYPES.find(t => t.value === q.type)?.label}
                    </Typography>
                </Box>
                <Box sx={{ flex: 1 }} />
                <FormControlLabel
                    control={<Switch size="small" checked={q.required} onChange={e => onChange(index, { ...q, required: e.target.checked })} />}
                    label={<Typography variant="caption" color="text.secondary">Required</Typography>}
                    sx={{ mr: 0 }}
                />
                <Tooltip title="Remove question">
                    <IconButton size="small" color="error" onClick={() => onRemove(index)}>
                        <X size={16} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Question Label *"
                        value={q.label}
                        onChange={handleLabelChange}
                        size="small"
                        fullWidth
                        placeholder="e.g. What is your skill level?"
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Answer Type</InputLabel>
                        <Select
                            label="Answer Type"
                            value={q.type}
                            onChange={e => onChange(index, { ...q, type: e.target.value, options: [] })}
                        >
                            {QUESTION_TYPES.map(t => (
                                <MenuItem key={t.value} value={t.value}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <t.icon size={16} />
                                        {t.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <TextField
                        label="Field Key"
                        value={q.key}
                        onChange={e => onChange(index, { ...q, key: e.target.value })}
                        size="small"
                        fullWidth
                        placeholder="auto_generated"
                        helperText="Unique identifier"
                    />
                </Grid>

                {/* Placeholder — only for non-select types */}
                {!needsOptions && (
                    <Grid item xs={12}>
                        <TextField
                            label="Placeholder Text"
                            value={q.placeholder || ""}
                            onChange={e => onChange(index, { ...q, placeholder: e.target.value })}
                            size="small"
                            fullWidth
                            placeholder="e.g. Enter your answer here..."
                        />
                    </Grid>
                )}

                {/* Options — for select / multiselect */}
                {needsOptions && (
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: "block" }}>
                            Answer Options
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, minHeight: 36 }}>
                            {(q.options || []).map((opt, oi) => (
                                <Chip
                                    key={oi}
                                    label={opt}
                                    size="small"
                                    onDelete={() => removeOption(oi)}
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                            {(q.options || []).length === 0 && (
                                <Typography variant="caption" color="text.secondary">No options yet — add below</Typography>
                            )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                                size="small"
                                value={optionInput}
                                onChange={e => setOptionInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addOption()}
                                placeholder="Type an option and press Enter or +"
                                fullWidth
                            />
                            <Button variant="outlined" size="small" onClick={addOption} sx={{ minWidth: 40, px: 1 }}>
                                <Plus size={16} />
                            </Button>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
}

// ─── Question Set Dialog (Create / Edit) ───────────────────────────────────────

function QuestionSetDialog({ open, onClose, onSave, initial }) {
    const isEdit = Boolean(initial?.id);
    const [form, setForm] = useState(BLANK_SET());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            setForm(initial ? { ...initial, questions: normalizeQuestions(initial.questions || []) } : BLANK_SET());
            setError(null);
        }
    }, [open, initial]);

    const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const addQuestion = () => setField("questions", [...form.questions, BLANK_QUESTION()]);

    const updateQuestion = (i, updated) => {
        const qs = [...form.questions];
        qs[i] = updated;
        setField("questions", qs);
    };

    const removeQuestion = (i) => {
        setField("questions", form.questions.filter((_, idx) => idx !== i));
    };

    const handleSave = async () => {
        setError(null);
        if (!form.content_type.trim()) { setError("Content type identifier is required."); return; }
        if (!form.label.trim()) { setError("Display label is required."); return; }

        for (const q of form.questions) {
            if (!q.label.trim()) { setError("All questions must have a label."); return; }
            if (!q.key.trim()) { setError(`Question "${q.label}" is missing a field key.`); return; }
            if ((q.type === "select" || q.type === "multiselect") && (!q.options || q.options.length < 2)) {
                setError(`Question "${q.label}" needs at least 2 options.`); return;
            }
        }

        const payload = {
            ...form,
            questions: form.questions.map(({ _tempId, ...q }) => q),
        };

        setSaving(true);
        try {
            await onSave(payload);
            onClose();
        } catch (e) {
            setError(e.response?.data?.error || "Save failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${palette.coral}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <HelpCircle size={20} color={palette.coral} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>
                        {isEdit ? "Edit Question Set" : "Create Question Set"}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
                    Content Type Info
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Content Type *</InputLabel>
                            <Select
                                label="Content Type *"
                                value={form.content_type || ""}
                                onChange={e => setField("content_type", e.target.value)}
                            >
                                {CONTENT_TYPE_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Display Label *"
                            value={form.label}
                            onChange={e => setField("label", e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="e.g. Learning Roadmap"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Description"
                            value={form.description || ""}
                            onChange={e => setField("description", e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Short description shown under the card title in wizard"
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField
                            label="Sort Order"
                            type="number"
                            value={form.sort_order}
                            onChange={e => setField("sort_order", parseInt(e.target.value) || 0)}
                            size="small"
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={6} sm={4} sx={{ display: "flex", alignItems: "center" }}>
                        <FormControlLabel
                            control={<Switch checked={form.is_active} onChange={e => setField("is_active", e.target.checked)} />}
                            label="Active (visible in Wizard)"
                        />
                    </Grid>
                </Grid>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Questions ({form.questions.length})
                    </Typography>
                    <Button
                        startIcon={<PlusCircle size={16} />}
                        size="small"
                        variant="contained"
                        onClick={addQuestion}
                    >
                        Add Question
                    </Button>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <AnimatePresence>
                        {form.questions.map((q, i) => (
                            <motion.div
                                key={q._tempId || `question-${i}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                                transition={{ duration: 0.2 }}
                            >
                                <QuestionRow
                                    q={q}
                                    index={i}
                                    onChange={updateQuestion}
                                    onRemove={removeQuestion}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {form.questions.length === 0 && (
                        <Box sx={{
                            textAlign: "center", py: 5, borderRadius: 2.5,
                            border: "2px dashed", borderColor: "divider"
                        }}>
                            <Sparkles size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <Typography color="text.secondary">No questions yet. Click "Add Question" to begin.</Typography>
                        </Box>
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>{error}</Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={saving} variant="outlined" sx={{ borderRadius: 2 }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={16} />}
                >
                    {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Question Set"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteDialog({ open, onClose, onConfirm, name }) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        setLoading(true);
        await onConfirm();
        setLoading(false);
    };
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <AlertTriangle color={palette.coral} size={20} />
                    Delete Question Set
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Are you sure you want to delete <strong>"{name}"</strong>?
                    This cannot be undone and will remove all its questions.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
                <Button onClick={confirm} color="error" variant="contained" disabled={loading} sx={{ borderRadius: 2 }}>
                    {loading ? <CircularProgress size={16} color="inherit" /> : "Delete"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminWizardQuestions() {
    const [sets, setSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

    const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

    const load = async () => {
        setLoading(true);
        try {
            const data = await getWizardQuestionSets();
            setSets(data);
        } catch {
            showToast("Failed to load question sets", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async (payload) => {
        if (editTarget?.id) {
            await updateWizardQuestionSet(editTarget.id, payload);
            showToast(`"${payload.label}" updated successfully`);
        } else {
            await createWizardQuestionSet(payload);
            showToast(`"${payload.label}" created successfully`);
        }
        await load();
    };

    const handleDelete = async () => {
        await deleteWizardQuestionSet(deleteTarget.id);
        showToast(`"${deleteTarget.label}" deleted`);
        setDeleteTarget(null);
        await load();
    };

    const handleToggle = async (id) => {
        try {
            const res = await toggleWizardQuestionSet(id);
            setSets(prev => prev.map(s => s.id === id ? { ...s, is_active: res.is_active } : s));
        } catch {
            showToast("Failed to toggle visibility", "error");
        }
    };

    return (
        <Box sx={{ pb: 6 }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Wizard Question Sets</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage the questions shown to users in the AI Content Wizard — per content type.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                    sx={{ borderRadius: 2.5 }}
                >
                    New Question Set
                </Button>
            </Box>

            {/* Summary chips */}
            <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
                <Chip icon={<HelpCircle size={14} />} label={`${sets.length} total sets`} sx={{ fontWeight: 700, bgcolor: `${palette.coral}18`, color: palette.coral, border: "none" }} />
                <Chip icon={<Eye size={14} />} label={`${sets.filter(s => s.is_active).length} active`} sx={{ fontWeight: 700, bgcolor: `${palette.teal}18`, color: palette.teal, border: "none" }} />
                <Chip icon={<EyeOff size={14} />} label={`${sets.filter(s => !s.is_active).length} hidden`} sx={{ fontWeight: 700, bgcolor: "rgba(176,176,200,0.1)", color: "text.secondary", border: "none" }} />
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress sx={{ color: palette.coral }} /></Box>
            ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <AnimatePresence>
                        {sets.map((set, i) => (
                            <motion.div
                                key={set.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                            >
                                <Card elevation={0} sx={{
                                    borderRadius: 3,
                                    border: "1px solid", borderColor: "divider",
                                    opacity: set.is_active ? 1 : 0.6,
                                    transition: "all 0.2s ease",
                                }}>
                                    <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                                        {/* Card header row */}
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                                            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: `${palette.coral}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <Typography variant="caption" fontWeight={800} sx={{ color: palette.coral }}>{set.sort_order}</Typography>
                                            </Box>

                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                                                    <Typography variant="h6" fontWeight={700} noWrap>{set.label}</Typography>
                                                    <Chip
                                                        label={set.content_type}
                                                        size="small"
                                                        sx={{ fontWeight: 700, bgcolor: `${palette.coral}12`, color: palette.coral, fontSize: "0.68rem" }}
                                                    />
                                                    <Chip
                                                        label={set.is_active ? "Visible" : "Hidden"}
                                                        size="small"
                                                        icon={set.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                                        sx={{
                                                            fontWeight: 700, fontSize: "0.68rem",
                                                            bgcolor: set.is_active ? `${palette.teal}18` : "rgba(176,176,200,0.1)",
                                                            color: set.is_active ? palette.teal : "text.secondary",
                                                            border: "none",
                                                            gap: 0.5,
                                                            "& .MuiChip-icon": { marginLeft: "4px" }
                                                        }}
                                                    />
                                                </Box>
                                                {set.description && (
                                                    <Typography variant="body2" color="text.secondary" noWrap>{set.description}</Typography>
                                                )}
                                            </Box>

                                            {/* Actions */}
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Chip
                                                    label={`${set.questions?.length || 0} questions`}
                                                    size="small"
                                                    icon={<HelpCircle size={13} />}
                                                    sx={{ fontWeight: 600, bgcolor: `${palette.coral}0d`, color: "text.secondary", gap: 0.5, "& .MuiChip-icon": { marginLeft: "4px" } }}
                                                />

                                                <Tooltip title={set.is_active ? "Hide from wizard" : "Show in wizard"}>
                                                    <Switch
                                                        size="small"
                                                        checked={set.is_active}
                                                        onChange={() => handleToggle(set.id)}
                                                        sx={{
                                                            "& .MuiSwitch-switchBase.Mui-checked": { color: palette.teal },
                                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: palette.teal },
                                                        }}
                                                    />
                                                </Tooltip>

                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => { setEditTarget(set); setDialogOpen(true); }}
                                                        sx={{ bgcolor: `${palette.coral}12`, "&:hover": { bgcolor: `${palette.coral}24` } }}>
                                                        <Pencil size={16} color={palette.coral} />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => setDeleteTarget(set)}
                                                        sx={{ bgcolor: "rgba(242,111,103,0.12)", "&:hover": { bgcolor: "rgba(242,111,103,0.24)" } }}>
                                                        <Trash2 size={16} color={palette.coral} />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title={expandedId === set.id ? "Collapse" : "Preview questions"}>
                                                    <IconButton size="small" onClick={() => setExpandedId(expandedId === set.id ? null : set.id)}>
                                                        {expandedId === set.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Expanded questions preview */}
                                        <Collapse in={expandedId === set.id}>
                                            <Box sx={{ mt: 2.5 }}>
                                                <Divider sx={{ mb: 2 }} />
                                                {!set.questions || set.questions.length === 0 ? (
                                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                                        No questions configured. Click Edit to add questions.
                                                    </Typography>
                                                ) : (
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                                        {set.questions.map((q, qi) => (
                                                            <Box key={qi} sx={{
                                                                display: "flex", alignItems: "flex-start", gap: 2,
                                                                p: 1.5, borderRadius: 2,
                                                                bgcolor: `${palette.coral}06`,
                                                                border: "1px solid", borderColor: `${palette.coral}15`
                                                            }}>
                                                                <Chip label={`Q${qi + 1}`} size="small"
                                                                    sx={{ fontWeight: 800, bgcolor: `${palette.coral}18`, color: palette.coral, minWidth: 36, fontSize: "0.65rem" }} />
                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                                                        <Typography variant="body2" fontWeight={600}>{q.label}</Typography>
                                                                        <Chip
                                                                            icon={<TypeIcon type={q.type} size={12} />}
                                                                            label={QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                                                                            size="small"
                                                                            sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(176,176,200,0.1)", color: "text.secondary", gap: 0.5, "& .MuiChip-icon": { marginLeft: "4px" } }}
                                                                        />
                                                                        {q.required && (
                                                                            <Chip label="Required" size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: `${palette.coral}18`, color: palette.coral }} />
                                                                        )}
                                                                    </Box>
                                                                    {q.options && q.options.length > 0 && (
                                                                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                                                            {q.options.map((opt, oi) => (
                                                                                <Chip key={oi} label={opt} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
                                                                            ))}
                                                                        </Box>
                                                                    )}
                                                                    {q.placeholder && (
                                                                        <Typography variant="caption" color="text.secondary">Placeholder: {q.placeholder}</Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {sets.length === 0 && !loading && (
                        <Box sx={{ textAlign: "center", py: 10, borderRadius: 3, border: "2px dashed", borderColor: "divider" }}>
                            <HelpCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <Typography variant="h6" fontWeight={600} color="text.secondary" gutterBottom>No question sets yet</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Create your first question set to power the AI Wizard module.
                            </Typography>
                            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
                                Create First Set
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* Dialogs */}
            <QuestionSetDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                initial={editTarget}
            />
            <DeleteDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                name={deleteTarget?.label}
            />

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast(t => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={toast.severity} sx={{ width: "100%", borderRadius: 2.5 }}>{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
