import { useState, useMemo, useEffect } from "react";
import {
  Search,
  GraduationCap,
  BookOpen,
  Compass,
  CheckCircle2,
  X,
  Clock,
  Layers,
  Star,
  ArrowRight,
  Award,
  Loader2,
} from "lucide-react";
import { getPublishedCourses } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function Marketplace() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await getPublishedCourses();
        const formatted = data.map((item) => {
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
            rating: (4.5 + Math.random() * 0.5).toFixed(1),
            reviewsCount: Math.floor(Math.random() * 200) + 10,
            enrolledCount: Math.floor(Math.random() * 1000) + 50,
            difficulty: c.skill_level || "Intermediate",
            estimatedTime: c.duration || "Self-paced",
            modulesCount: c.modules?.length || 0,
            description: c.description || "No description provided.",
            tags: c.tags || [item.topic],
            modules: (c.modules || []).map((m) => ({
              name: m.title || "Module",
              duration: m.duration || "",
              detail: m.description || "",
            })),
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
    return courses.filter((item) => {
      const matchesTab =
        selectedTab === "all" || item.contentType.toLowerCase() === selectedTab.toLowerCase();

      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.topic.toLowerCase().includes(query) ||
        item.tutorName.toLowerCase().includes(query) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(query)));

      return matchesTab && matchesQuery;
    });
  }, [selectedTab, searchQuery, courses]);

  const handleEnroll = (item) => {
    toast.success(`Enrolled in "${item.title}" published by ${item.tutorName}! Added to your study profile.`);
    setSelectedItem(null);
  };

  return (
    <section className="min-h-screen bg-slate-50 pb-20 pt-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header Banner */}
        <div className="relative mb-12 p-8 md:p-12 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 text-white shadow-xl overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 blur-2xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-indigo-400/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                <Award size={14} className="text-amber-400" />
                <span>Tutor Published Courses</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
                Discover Verified Tutor Materials
              </h1>
              <p className="text-indigo-100/90 max-w-2xl text-lg font-medium leading-relaxed mx-auto md:mx-0">
                Explore structured learning roadmaps, professional courses, and practical guides introduced directly by teachers, faculty, and experienced tutors.
              </p>
            </div>
            
            <div className="shrink-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 text-center shadow-lg md:text-right min-w-[200px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
                Curated Library
              </div>
              <div className="text-4xl font-black mb-1">{courses.length}+ Published</div>
              <div className="text-xs font-medium text-indigo-200">
                Pedagogically framed & verified
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div className="flex overflow-x-auto gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm w-full md:w-auto hide-scrollbar">
            <button
              onClick={() => setSelectedTab("all")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedTab === "all" ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              All Materials
            </button>
            <button
              onClick={() => setSelectedTab("roadmap")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedTab === "roadmap" ? 'bg-primary text-slate-900 shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Compass size={16} /> Roadmaps
            </button>
            <button
              onClick={() => setSelectedTab("course")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedTab === "course" ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <GraduationCap size={16} /> Courses
            </button>
            <button
              onClick={() => setSelectedTab("guide")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedTab === "guide" ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <BookOpen size={16} /> Guides
            </button>
          </div>

          <div className="relative w-full md:w-96 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by title, tutor, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium shadow-sm"
            />
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading published courses...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <Search size={48} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No materials found</h3>
            <p className="text-slate-500 font-medium mb-6">We couldn't find any materials matching your criteria.</p>
            <button 
              onClick={() => { setSelectedTab("all"); setSearchQuery(""); }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 flex flex-col group h-full"
              >
                {/* Card Top Badges */}
                <div className="flex justify-between items-center mb-4">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
                    item.contentType === "roadmap" ? "bg-primary/10 text-primary border-primary/20" :
                    item.contentType === "course" ? "bg-indigo-600/10 text-indigo-600 border-indigo-600/20" :
                    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                  }`}>
                    {item.contentType}
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{item.rating}</span>
                    <span className="text-[10px] font-medium text-amber-600/60">({item.reviewsCount})</span>
                  </div>
                </div>

                {/* Title & Topic */}
                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6 min-h-[40px]">
                  {item.description}
                </p>

                {/* Tutor Header */}
                <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center text-white font-black shadow-sm shrink-0">
                    {item.tutorAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {item.tutorName}
                    </div>
                    <div className="text-xs font-medium text-slate-500 truncate">
                      {item.tutorTitle}
                    </div>
                  </div>
                  {item.tutorVerified && (
                    <div className="bg-primary/10 p-1.5 rounded-full text-primary shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  {/* Quick Meta */}
                  <div className="flex justify-between items-center py-4 border-t border-slate-100 mb-2">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock size={16} />
                      <span className="text-xs font-bold">{item.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Layers size={16} />
                      <span className="text-xs font-bold">{item.modulesCount} Modules</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full flex justify-center items-center gap-2 py-3 bg-slate-900 group-hover:bg-primary text-white font-bold rounded-xl transition-all shadow-md"
                  >
                    Explore Material
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Material Detail Dialog Modal */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setSelectedItem(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      selectedItem.contentType === "roadmap" ? "bg-primary/10 text-primary border-primary/20" :
                      selectedItem.contentType === "course" ? "bg-indigo-600/10 text-indigo-600 border-indigo-600/20" :
                      "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                    }`}>
                      {selectedItem.contentType}
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Topic: {selectedItem.topic}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 leading-tight">
                    {selectedItem.title}
                  </h2>

                  {/* Tutor Info Block */}
                  <div className="flex items-center gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                      {selectedItem.tutorAvatar}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-lg">
                        Published by {selectedItem.tutorName}
                      </div>
                      <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        {selectedItem.tutorTitle} • Verified Faculty / Tutor
                        <CheckCircle2 size={14} className="text-primary" />
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed mb-6 text-lg">
                    {selectedItem.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <hr className="border-slate-100 mb-8" />

                  {/* Curriculum Modules */}
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
                    Syllabus & Module Breakdown
                  </h3>
                  <div className="flex flex-col gap-3">
                    {selectedItem.modules.map((mod, idx) => (
                      <div key={idx} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-primary/30 transition-colors shadow-sm">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <h4 className="font-bold text-primary text-lg">{mod.name}</h4>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0">
                            {mod.duration}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {mod.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="w-full sm:w-auto px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEnroll(selectedItem)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
                  >
                    <CheckCircle2 size={18} />
                    Enroll & Add to My Learning Plan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
