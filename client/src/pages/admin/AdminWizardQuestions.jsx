import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
    Plus, Pencil, Trash2, GripVertical, HelpCircle, CheckSquare,
    FileText, AlignLeft, Calendar, Hash, ListFilter, ChevronDown,
    ChevronUp, X, Save, PlusCircle, Eye, EyeOff, AlertTriangle,
    Sparkles, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getWizardQuestionSets, createWizardQuestionSet,
    updateWizardQuestionSet, deleteWizardQuestionSet,
    toggleWizardQuestionSet,
} from "../../services/admin";
import toast from "react-hot-toast";

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

function TypeIcon({ type, size = 16 }) {
    const found = QUESTION_TYPES.find(t => t.value === type);
    const IconComponent = found?.icon || AlignLeft;
    return <IconComponent size={size} />;
}

function genKey(label) {
    return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

// ─── Question Editor Row ───────────────────────────────────────────────────────

function QuestionRow({ q, index, onChange, onRemove, isDark }) {
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
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`cursor-grab flex items-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`} title="Drag to reorder">
                    <GripVertical size={18} />
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                    Q{index + 1}
                </div>
                <div className="flex items-center gap-1.5">
                    <TypeIcon type={q.type} size={15} />
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {QUESTION_TYPES.find(t => t.value === q.type)?.label}
                    </span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Required</span>
                    <button
                        role="switch"
                        aria-checked={q.required}
                        onClick={() => onChange(index, { ...q, required: !q.required })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-slate-50'} ${
                            q.required ? 'bg-primary' : (isDark ? 'bg-slate-600' : 'bg-slate-300')
                        }`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            q.required ? 'translate-x-4.5' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
                <button 
                    onClick={() => onRemove(index)}
                    className={`p-1.5 rounded-lg transition-colors ml-2 ${isDark ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-500 hover:bg-rose-50'}`}
                    title="Remove question"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Question Label *</label>
                    <input
                        type="text"
                        value={q.label}
                        onChange={handleLabelChange}
                        placeholder="e.g. What is your skill level?"
                        className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                </div>
                
                <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Answer Type</label>
                    <div className="relative">
                        <select
                            value={q.type}
                            onChange={e => onChange(index, { ...q, type: e.target.value, options: [] })}
                            className={`w-full appearance-none pl-3 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm cursor-pointer ${isDark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                        >
                            {QUESTION_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Field Key</label>
                    <input
                        type="text"
                        value={q.key}
                        onChange={e => onChange(index, { ...q, key: e.target.value })}
                        placeholder="auto_generated"
                        className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                </div>

                {/* Placeholder */}
                {!needsOptions && (
                    <div className="lg:col-span-4">
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Placeholder Text</label>
                        <input
                            type="text"
                            value={q.placeholder || ""}
                            onChange={e => onChange(index, { ...q, placeholder: e.target.value })}
                            placeholder="e.g. Enter your answer here..."
                            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>
                )}

                {/* Options */}
                {needsOptions && (
                    <div className="lg:col-span-4">
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Answer Options</label>
                        
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                            {(q.options || []).map((opt, oi) => (
                                <div key={oi} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isDark ? 'bg-slate-700/50 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                    <span>{opt}</span>
                                    <button onClick={() => removeOption(oi)} className="hover:text-rose-500 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {(q.options || []).length === 0 && (
                                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No options yet — add below</span>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={optionInput}
                                onChange={e => setOptionInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addOption()}
                                placeholder="Type an option and press Enter or +"
                                className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                            <button 
                                onClick={addOption}
                                className={`px-4 py-2 rounded-xl border font-bold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Question Set Dialog (Create / Edit) ───────────────────────────────────────

function QuestionSetDialog({ open, onClose, onSave, initial, isDark }) {
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

    if (!open) return null;

    const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const addQuestion = () => setField("questions", [...form.questions, BLANK_QUESTION()]);
    const updateQuestion = (i, updated) => {
        const qs = [...form.questions];
        qs[i] = updated;
        setField("questions", qs);
    };
    const removeQuestion = (i) => setField("questions", form.questions.filter((_, idx) => idx !== i));

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}
            >
                {/* Header */}
                <div className={`flex items-center gap-3 p-6 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                        <HelpCircle size={20} />
                    </div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isEdit ? "Edit Question Set" : "Create Question Set"}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 font-sans">
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Content Type Info
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Content Type *</label>
                            <div className="relative">
                                <select
                                    value={form.content_type || ""}
                                    onChange={e => setField("content_type", e.target.value)}
                                    className={`w-full appearance-none pl-3 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm cursor-pointer ${isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                >
                                    <option value="" disabled>Select a type...</option>
                                    {CONTENT_TYPE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Display Label *</label>
                            <input
                                type="text"
                                value={form.label}
                                onChange={e => setField("label", e.target.value)}
                                placeholder="e.g. Learning Roadmap"
                                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
                            <input
                                type="text"
                                value={form.description || ""}
                                onChange={e => setField("description", e.target.value)}
                                placeholder="Short description shown under the card title in wizard"
                                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Sort Order</label>
                            <input
                                type="number"
                                value={form.sort_order}
                                onChange={e => setField("sort_order", parseInt(e.target.value) || 0)}
                                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                role="switch"
                                aria-checked={form.is_active}
                                onClick={() => setField("is_active", !form.is_active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'} ${
                                    form.is_active ? 'bg-primary' : (isDark ? 'bg-slate-700' : 'bg-slate-300')
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Active (visible in Wizard)</span>
                        </div>
                    </div>

                    <div className={`h-px w-full mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Questions ({form.questions.length})
                        </h3>
                        <button
                            onClick={addQuestion}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-primary/20 text-blue-400 hover:bg-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
                        >
                            <PlusCircle size={16} />
                            Add Question
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
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
                                        isDark={isDark}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {form.questions.length === 0 && (
                            <div className={`text-center py-12 rounded-3xl border-2 border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <Sparkles size={40} className={`mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                                <div className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No questions yet. Click "Add Question" to begin.</div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold flex items-start gap-2">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-end gap-3 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <button 
                        onClick={onClose}
                        disabled={saving}
                        className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold transition-all hover:bg-primary/90 disabled:opacity-70"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Question Set"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteDialog({ open, onClose, onConfirm, name, isDark }) {
    const [loading, setLoading] = useState(false);
    
    if (!open) return null;

    const confirm = async () => {
        setLoading(true);
        await onConfirm();
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`relative w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}
            >
                <div className={`p-6 border-b flex items-center gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <AlertTriangle className="text-rose-500" size={24} />
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Delete Question Set</h3>
                </div>
                <div className={`p-6 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Are you sure you want to delete <strong className={isDark ? 'text-white' : 'text-slate-900'}>"{name}"</strong>?
                    This cannot be undone and will remove all its questions.
                </div>
                <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirm}
                        disabled={loading}
                        className="flex items-center justify-center min-w-[80px] px-4 py-2 rounded-xl bg-rose-500 text-white font-bold transition-all hover:bg-rose-600 disabled:opacity-70"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminWizardQuestions() {
    const { isDark } = useOutletContext() || { isDark: false };
    const [sets, setSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getWizardQuestionSets();
            setSets(data);
        } catch {
            toast.error("Failed to load question sets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async (payload) => {
        if (editTarget?.id) {
            await updateWizardQuestionSet(editTarget.id, payload);
            toast.success(`"${payload.label}" updated successfully`);
        } else {
            await createWizardQuestionSet(payload);
            toast.success(`"${payload.label}" created successfully`);
        }
        await load();
    };

    const handleDelete = async () => {
        await deleteWizardQuestionSet(deleteTarget.id);
        toast.success(`"${deleteTarget.label}" deleted`);
        setDeleteTarget(null);
        await load();
    };

    const handleToggle = async (id) => {
        try {
            const res = await toggleWizardQuestionSet(id);
            setSets(prev => prev.map(s => s.id === id ? { ...s, is_active: res.is_active } : s));
        } catch {
            toast.error("Failed to toggle visibility");
        }
    };

    return (
        <div className="pb-12 max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className={`relative overflow-hidden mb-6 p-6 md:p-8 rounded-3xl border flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="absolute -top-24 -right-12 w-64 h-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Wizard Orchestration</div>
                    <h1 className={`text-2xl font-extrabold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Wizard Question Sets</h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage the questions shown to users in the AI Content Wizard — per content type.
                    </p>
                </div>
                
                <button
                    onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                    className="relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors shrink-0"
                >
                    <Plus size={18} />
                    New Question Set
                </button>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDark ? 'bg-primary/20 text-blue-400 border-primary/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
                    <HelpCircle size={14} />
                    {sets.length} total sets
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'}`}>
                    <Eye size={14} />
                    {sets.filter(s => s.is_active).length} active
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    <EyeOff size={14} />
                    {sets.filter(s => !s.is_active).length} hidden
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <AnimatePresence>
                        {sets.map((set, i) => (
                            <motion.div
                                key={set.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                                className={`rounded-2xl border shadow-sm transition-all overflow-hidden ${
                                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                                } ${set.is_active ? 'opacity-100' : 'opacity-60 grayscale-[0.2]'}`}
                            >
                                <div className="p-5">
                                    {/* Card header row */}
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                                            {set.sort_order}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{set.label}</h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                                                    {set.content_type}
                                                </span>
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                                                    set.is_active 
                                                        ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
                                                        : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                                                }`}>
                                                    {set.is_active ? <Eye size={10} /> : <EyeOff size={10} />}
                                                    {set.is_active ? "Visible" : "Hidden"}
                                                </span>
                                            </div>
                                            {set.description && (
                                                <p className={`text-sm truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{set.description}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold mr-2 ${isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                                <HelpCircle size={14} />
                                                {set.questions?.length || 0} questions
                                            </div>

                                            <button
                                                role="switch"
                                                aria-checked={set.is_active}
                                                onClick={() => handleToggle(set.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-white'} ${
                                                    set.is_active ? 'bg-cyan-500' : (isDark ? 'bg-slate-600' : 'bg-slate-300')
                                                }`}
                                                title={set.is_active ? "Hide from wizard" : "Show in wizard"}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    set.is_active ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                            </button>

                                            <button 
                                                onClick={() => { setEditTarget(set); setDialogOpen(true); }}
                                                className={`p-2 rounded-lg transition-colors ml-1 ${isDark ? 'text-blue-400 hover:bg-primary/20' : 'text-primary hover:bg-primary/10'}`}
                                                title="Edit"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            <button 
                                                onClick={() => setDeleteTarget(set)}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-500 hover:bg-rose-50'}`}
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            <button 
                                                onClick={() => setExpandedId(expandedId === set.id ? null : set.id)}
                                                className={`p-2 rounded-lg transition-colors ml-2 border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                title={expandedId === set.id ? "Collapse" : "Preview questions"}
                                            >
                                                {expandedId === set.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded questions preview */}
                                    <AnimatePresence>
                                        {expandedId === set.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className={`mt-5 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                                    {!set.questions || set.questions.length === 0 ? (
                                                        <div className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                            No questions configured. Click Edit to add questions.
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-3">
                                                            {set.questions.map((q, qi) => (
                                                                <div key={qi} className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                                                                        Q{qi + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                            <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{q.label}</span>
                                                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                                                                <TypeIcon type={q.type} size={10} />
                                                                                {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                                                                            </span>
                                                                            {q.required && (
                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                                                                                    Required
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {q.options && q.options.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                {q.options.map((opt, oi) => (
                                                                                    <span key={oi} className={`px-2 py-1 rounded text-[10px] font-bold border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                                                                        {opt}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {q.placeholder && (
                                                                            <div className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                                                Placeholder: {q.placeholder}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {sets.length === 0 && !loading && (
                        <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <HelpCircle size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No question sets yet</h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                Create your first question set to power the AI Wizard module.
                            </p>
                            <button 
                                onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                <Plus size={18} />
                                Create First Set
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Dialogs */}
            <QuestionSetDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                initial={editTarget}
                isDark={isDark}
            />
            
            <DeleteDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                name={deleteTarget?.label}
                isDark={isDark}
            />
        </div>
    );
}
