import { useState, useEffect } from "react";
import { TrendingUp, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function QuizResultsHistory({
    results,
    loading,
    onFetchResults,
    onViewDetails,
}) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState("submitted_at");
    const [sortOrder, setSortOrder] = useState("desc");
    const [statusFilter, setStatusFilter] = useState("");
    const [topicSearch, setTopicSearch] = useState("");

    useEffect(() => {
        const handler = window.setTimeout(() => {
            onFetchResults({
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                sort_by: sortBy,
                sort_order: sortOrder,
                status_filter: statusFilter || undefined,
                topic_search: topicSearch || undefined,
            });
        }, 300);
        return () => window.clearTimeout(handler);
    }, [page, rowsPerPage, sortBy, sortOrder, statusFilter, topicSearch, onFetchResults]);

    const handleChangePage = (newPage) => {
        if (newPage >= 0 && newPage < Math.ceil((results.total || 0) / rowsPerPage)) {
            setPage(newPage);
        }
    };
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const formatDate = (d) =>
        new Date(d).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) return "N/A";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalPages = Math.ceil((results.total || 0) / rowsPerPage);

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Search className="text-primary" size={20} />
                    <h3 className="font-bold text-slate-800">Filters & Search</h3>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Topic search */}
                    <div className="relative flex-2 md:flex-[2]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="text-slate-400" size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by topic…"
                            value={topicSearch}
                            onChange={(e) => { setTopicSearch(e.target.value); setPage(0); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                        />
                    </div>
                    {/* Status */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        className="flex-1 md:min-w-[140px] px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="pass">Passed</option>
                        <option value="fail">Failed</option>
                    </select>
                    {/* Sort By */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="flex-1 md:min-w-[140px] px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-white"
                    >
                        <option value="submitted_at">Date</option>
                        <option value="score_percentage">Score</option>
                        <option value="result">Status</option>
                    </select>
                    {/* Order */}
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="flex-1 md:min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm bg-white"
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4">Topic</th>
                                <th className="px-6 py-4 text-center">Difficulty</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Score</th>
                                <th className="px-6 py-4 text-center">Answers</th>
                                <th className="px-6 py-4 text-right">Time Taken</th>
                                <th className="px-6 py-4 text-right">Date</th>
                                <th className="px-6 py-4 text-center">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.data && results.data.length > 0 ? (
                                results.data.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                                            {row.quiz_topic}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                                                {row.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border ${row.result === 'pass' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                                <TrendingUp size={12} /> {row.result.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-black text-lg" style={{ color: row.score_percentage >= 60 ? '#6A89A7' : '#384959' }}>
                                            {row.score_percentage}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500 font-semibold text-sm">
                                            {row.correct_answers}/{row.total_questions}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 font-medium text-sm">
                                            {formatDuration(row.time_taken)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 font-medium text-sm">
                                            {formatDate(row.submitted_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => onViewDetails(row.id)}
                                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 text-primary font-bold text-xs hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <TrendingUp size={48} className="opacity-30 mb-2" />
                                            <p className="font-medium italic">No quiz results found</p>
                                            <p className="text-sm">Complete a quiz to see your history here</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                        <span>Rows per page:</span>
                        <select 
                            value={rowsPerPage} 
                            onChange={handleChangeRowsPerPage}
                            className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
                        <span>
                            {results.total === 0 ? 0 : page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, results.total || 0)} of {results.total || 0}
                        </span>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => handleChangePage(page - 1)}
                                disabled={page === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={() => handleChangePage(page + 1)}
                                disabled={page >= totalPages - 1 || totalPages === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}