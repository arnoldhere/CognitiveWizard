import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
    SlidersHorizontal, Save, Info, Bot, Wand2, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { getLLMConfigs, updateLLMConfig } from "../../services/admin";
import toast from "react-hot-toast";

const PARAM_META = {
    temperature: {
        label: "Temperature",
        hint: "Controls randomness. Lower = more focused, Higher = more creative.",
        icon: Wand2,
        min: 0, max: 2, step: 0.01,
    },
    max_new_tokens: {
        label: "Max New Tokens",
        hint: "Maximum number of tokens the model can generate in a single response.",
        icon: SlidersHorizontal,
        min: 64, max: 4096, step: 1,
    },
    top_p: {
        label: "Top P",
        hint: "Nucleus sampling threshold. Controls diversity of word selection.",
        icon: SlidersHorizontal,
        min: 0, max: 1, step: 0.01,
    },
    top_k: {
        label: "Top K",
        hint: "Limits next-token selection to the top K candidates.",
        icon: SlidersHorizontal,
        min: 0, max: 200, step: 1,
    },
    model_override: {
        label: "Model Override",
        hint: "Override the default model ID for this task. Leave blank for provider default.",
        icon: Bot,
    },
};

function ConfigCard({ config, index, onChange, onSave, saving, isDark }) {
    const taskLabel = config.task_name?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
            className={`rounded-3xl p-6 border shadow-sm transition-all duration-300 hover:shadow-lg ${
                isDark ? 'bg-slate-800/80 border-slate-700/80 hover:border-primary/50' : 'bg-white border-slate-200 hover:border-primary/50'
            }`}
        >
            {/* Card Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                    <SlidersHorizontal size={20} />
                </div>
                <div className="flex-1">
                    <h3 className={`text-lg font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{taskLabel}</h3>
                    <div className={`inline-flex px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                        LLM Task
                    </div>
                </div>
            </div>

            <div className={`h-px w-full mb-6 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`} />

            <div className="space-y-6">
                {/* Temperature Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 group relative">
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Temperature</span>
                            <Info size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                                {PARAM_META.temperature.hint}
                            </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                            {config.temperature?.toFixed(2)}
                        </div>
                    </div>
                    <input
                        type="range"
                        min={PARAM_META.temperature.min}
                        max={PARAM_META.temperature.max}
                        step={PARAM_META.temperature.step}
                        value={config.temperature ?? 0.7}
                        onChange={(e) => onChange(index, "temperature", parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Top P Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 group relative">
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Top P</span>
                            <Info size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                                {PARAM_META.top_p.hint}
                            </div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-500/10 text-cyan-600'}`}>
                            {config.top_p?.toFixed(2) ?? "—"}
                        </div>
                    </div>
                    <input
                        type="range"
                        min={PARAM_META.top_p.min}
                        max={PARAM_META.top_p.max}
                        step={PARAM_META.top_p.step}
                        value={config.top_p ?? 0.9}
                        onChange={(e) => onChange(index, "top_p", parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>

                {/* Numeric Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 group relative">
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Max Tokens</span>
                            <Info size={12} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                                {PARAM_META.max_new_tokens.hint}
                            </div>
                        </div>
                        <input
                            type="number"
                            min={PARAM_META.max_new_tokens.min}
                            max={PARAM_META.max_new_tokens.max}
                            value={config.max_new_tokens ?? ""}
                            onChange={e => onChange(index, "max_new_tokens", parseInt(e.target.value, 10))}
                            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 group relative">
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Top K</span>
                            <Info size={12} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                                {PARAM_META.top_k.hint}
                            </div>
                        </div>
                        <input
                            type="number"
                            min={PARAM_META.top_k.min}
                            max={PARAM_META.top_k.max}
                            value={config.top_k ?? ""}
                            onChange={e => onChange(index, "top_k", e.target.value ? parseInt(e.target.value, 10) : null)}
                            placeholder="Default"
                            className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>
                </div>

                {/* Model Override */}
                <div>
                    <div className="flex items-center gap-1.5 mb-2 group relative">
                        <Bot size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Model Override</span>
                        <Info size={12} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                            {PARAM_META.model_override.hint}
                        </div>
                    </div>
                    <input
                        type="text"
                        value={config.model_override ?? ""}
                        onChange={e => onChange(index, "model_override", e.target.value || null)}
                        placeholder="Leave blank for provider default"
                        className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                </div>

                {/* Use Chat Pipeline */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <div>
                        <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Chat Pipeline</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Use conversational chat format vs. completion</div>
                    </div>
                    <button
                        role="switch"
                        aria-checked={config.use_chat ?? false}
                        onClick={() => onChange(index, "use_chat", !(config.use_chat ?? false))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-white'} ${
                            (config.use_chat ?? false) ? 'bg-primary' : (isDark ? 'bg-slate-600' : 'bg-slate-300')
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (config.use_chat ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>

                <button
                    onClick={() => onSave(config)}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold transition-all hover:bg-primary/90 disabled:opacity-70"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Saving..." : "Save Configuration"}
                </button>
            </div>
        </motion.div>
    );
}

export default function AdminLLMConfigs() {
    const { isDark } = useOutletContext() || { isDark: false };
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchConfigs(); }, []);

    const fetchConfigs = async () => {
        try {
            const data = await getLLMConfigs();
            setConfigs(data);
        } catch {
            toast.error("Failed to load configs");
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
            toast.success(`"${config.task_name}" config saved!`);
        } catch {
            toast.error("Failed to save config");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 size={40} className="animate-spin text-primary" />
        </div>
    );

    return (
        <div className="pb-12 max-w-7xl mx-auto font-sans">
            <div className={`relative overflow-hidden mb-8 p-6 md:p-8 rounded-3xl border flex flex-col justify-center shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="absolute -top-24 -right-12 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">Model Operations</div>
                    <h1 className={`text-2xl font-extrabold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>LLM Configurations</h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Fine-tune AI model parameters per task — changes apply to the next request cycle.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configs.map((config, i) => (
                    <ConfigCard
                        key={config.task_name}
                        config={config}
                        index={i}
                        onChange={handleChange}
                        onSave={handleSave}
                        saving={saving}
                        isDark={isDark}
                    />
                ))}
            </div>
        </div>
    );
}
