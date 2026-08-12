import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getWizardContentDetail } from "../services/api";
import RoadmapDisplay from "../components/wizard/RoadmapDisplay";
import { Clock, CheckSquare, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ModuleItem = ({ mod }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-cyan-400" />
      
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{mod.title}</h3>
        <div className="flex items-center gap-3 shrink-0">
          {mod.estimated_time && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-600 text-xs font-bold uppercase tracking-wider">
              <Clock size={14} className="text-primary" /> {mod.estimated_time}
            </div>
          )}
          <button className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      <p className={`text-slate-600 leading-relaxed ${expanded ? 'mb-6' : 'm-0'}`}>
        {mod.description}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {mod.key_takeaways?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-slate-900 mb-3 text-sm">Key Takeaways:</h4>
                <ul className="space-y-2">
                  {mod.key_takeaways.map((k, i) => (
                    <li key={i} className="flex items-start gap-2 text-indigo-700 text-sm font-medium">
                      <span className="text-indigo-400 mt-1">•</span> {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mod.topics?.length > 0 && (
              <div className="flex flex-col gap-4">
                {mod.topics.map((topic, idx) => (
                  <div key={idx} className="bg-cyan-50/50 p-5 rounded-2xl border border-cyan-100">
                    <h4 className="text-cyan-700 font-bold mb-2">
                      {topic.name || topic}
                    </h4>
                    {(topic.details || topic.content) && (
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {topic.details || topic.content}
                      </p>
                    )}
                    {topic.practical_task && (
                      <div className="mt-4 p-3 bg-cyan-100/50 rounded-xl text-cyan-800 text-sm font-semibold flex items-start gap-2">
                        <CheckSquare className="shrink-0 mt-0.5 text-cyan-600" size={16} />
                        <span>Task: {topic.practical_task}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function WizardContentView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const result = await getWizardContentDetail(id);
        setData(result);
      } catch (err) {
        setError(err.message || "Failed to load content.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchContent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading your content…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 py-4 rounded-2xl font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isRoadmap = (data?.content_type || "").toLowerCase() === "roadmap";

  if (isRoadmap) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mx-auto">
        <RoadmapDisplay
          data={data}
          learningStyle={data?.content?.learning_style}
          topic={data?.topic}
          onBack={() => window.history.back()}
          onRegenerate={() => { window.opener && window.close(); window.location.href = "/wizard"; }}
        />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 md:px-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded-full text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
            {data.content_type}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            {data.content?.title || data.topic}
          </h1>
          {data.content?.description && (
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {data.content.description}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-6">
          {data.content?.modules?.map((mod, i) => (
            <ModuleItem key={i} mod={mod} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
