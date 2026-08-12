import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, BookOpen, RefreshCw, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAdminCourses } from "../../services/admin";
import dayjs from "dayjs";

export default function AdminCourses({ title, description, userRole }) {
    const { isDark } = useOutletContext() || { isDark: false };
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting
    const [sortField, setSortField] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Filtering & Search
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [contentType, setContentType] = useState("all");

    // View Dialog
    const [viewData, setViewData] = useState(null);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: rowsPerPage,
                sortField,
                sortOrder,
                search: debouncedSearch,
                contentType,
                userRole
            };
            const response = await getAdminCourses(params);
            setCourses(response.data);
            setTotal(response.total);
        } catch (err) {
            console.error("Failed to fetch admin courses", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [page, rowsPerPage, sortField, sortOrder, debouncedSearch, contentType, userRole]);

    const handleSort = (field) => {
        const isAsc = sortField === field && sortOrder === "asc";
        setSortOrder(isAsc ? "desc" : "asc");
        setSortField(field);
    };

    const getStatusStyle = (status) => {
        if (status === "published") {
            return isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100";
        }
        return isDark ? "bg-slate-700/50 text-slate-300 border-slate-600" : "bg-slate-100 text-slate-600 border-slate-200";
    };

    return (
        <div className="pb-12 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div className={`relative overflow-hidden mb-6 p-6 md:p-8 rounded-3xl border flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="absolute -top-24 -right-12 w-64 h-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Course Catalog</div>
                    <h1 className={`text-2xl font-extrabold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title || "Published Content"}</h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {description || "Browse and manage all educational content published by tutors."}
                    </p>
                </div>
                
                <button 
                    onClick={fetchCourses} 
                    disabled={loading}
                    className={`relative z-10 p-2.5 rounded-xl border shadow-sm transition-colors shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'}`}
                >
                    <RefreshCw size={18} className={loading ? "animate-spin text-primary" : ""} />
                </button>
            </div>

            {/* Toolbar */}
            <div className={`flex flex-col sm:flex-row gap-4 mb-6 p-4 rounded-2xl border shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by topic, title, or tutor email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />
                </div>
                
                <div className="sm:w-48 relative">
                    <select
                        value={contentType}
                        onChange={(e) => { setContentType(e.target.value); setPage(0); }}
                        className={`w-full appearance-none pl-4 pr-10 py-2.5 text-sm font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer ${isDark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                    >
                        <option value="all">All Types</option>
                        <option value="Course/Syllabus">Course</option>
                        <option value="Roadmap">Roadmap</option>
                        <option value="Guide">Guide</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'bg-slate-900/50 text-slate-400 border-b border-slate-700' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">
                                    <button 
                                        className="flex items-center gap-1 font-bold hover:text-primary transition-colors uppercase tracking-wider"
                                        onClick={() => handleSort("topic")}
                                    >
                                        Topic / Title
                                        {sortField === "topic" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Tutor</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">
                                    <button 
                                        className="flex items-center gap-1 font-bold hover:text-primary transition-colors uppercase tracking-wider"
                                        onClick={() => handleSort("created_at")}
                                    >
                                        Date
                                        {sortField === "created_at" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                            {loading && courses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                                    </td>
                                </tr>
                            ) : courses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`px-6 py-12 text-center font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No courses found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}`}>
                                        <td className={`px-6 py-4 font-mono text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            #{course.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-bold truncate max-w-[200px] sm:max-w-[250px] ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                                {course.content?.title || course.topic}
                                            </div>
                                            <div className={`text-xs truncate max-w-[200px] sm:max-w-[250px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                {course.content?.description || "No description"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                <BookOpen size={12} />
                                                {course.content_type || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{course.user?.full_name || "—"}</div>
                                            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{course.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(course.status)}`}>
                                                {course.status || "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{dayjs(course.created_at).format("MMM D, YYYY")}</div>
                                            <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{dayjs(course.created_at).format("h:mm A")}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setViewData(course)}
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-primary hover:bg-primary/10' : 'text-primary hover:bg-primary/10'}`}
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className={`px-6 py-4 border-t flex items-center justify-between text-sm ${isDark ? 'border-slate-700/50 bg-slate-900/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        Showing {Math.min(page * rowsPerPage + 1, total)} to {Math.min((page + 1) * rowsPerPage, total)} of {total} entries
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                                className={`appearance-none pl-3 pr-8 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer text-xs font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                            >
                                {[5, 10, 25, 50].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className={`p-1.5 rounded-md border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * rowsPerPage >= total}
                                className={`p-1.5 rounded-md border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Course Modal */}
            <AnimatePresence>
                {viewData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setViewData(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`relative w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}
                        >
                            {/* Modal Header */}
                            <div className={`flex justify-between items-center p-6 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div>
                                    <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {viewData.content?.title || viewData.topic}
                                    </h2>
                                    <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        By {viewData.user?.email} • {viewData.content_type}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(viewData.status)}`}>
                                        {viewData.status || "Draft"}
                                    </span>
                                    <button 
                                        onClick={() => setViewData(null)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                                    <div className="sm:col-span-2">
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Description</h3>
                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {viewData.content?.description || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Skill Level</h3>
                                        <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {viewData.content?.skill_level || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Target Audience</h3>
                                        <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {viewData.content?.target_audience || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
                                        Modules / Phases ({viewData.content?.modules?.length || 0})
                                    </h3>
                                    <div className="space-y-3">
                                        {viewData.content?.modules?.map((m, i) => (
                                            <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <h4 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {i + 1}. {m.title}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                                        {m.duration}
                                                    </span>
                                                </div>
                                                <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {m.description}
                                                </p>
                                                {m.topics?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {m.topics.map((t, idx) => (
                                                            <span key={idx} className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isDark ? 'bg-slate-900/50 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex justify-end shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                <button 
                                    onClick={() => setViewData(null)}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
