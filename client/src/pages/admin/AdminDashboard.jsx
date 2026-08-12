import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
    Users, UserCheck, UserX, Bot, GraduationCap, BookOpenText,
    Gauge, UserPlus, TrendingUp, TrendingDown, Activity, Trophy,
    Loader2
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { getAdminStats } from "../../services/admin";

export default function AdminDashboard() {
    const { isDark } = useOutletContext() || { isDark: false };
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminStats()
            .then(setStats)
            .catch((err) => console.error("Failed to load stats", err))
            .finally(() => setLoading(false));
    }, []);

    const palette = {
        primary: "#6A89A7",
        cyan: "#BDDDFC",
        indigo: "#88BDF2",
        rose: "#f43f5e",
        slate: isDark ? "#1e293b" : "#f8fafc",
    };

    const tooltipStyle = {
        contentStyle: {
            background: isDark ? "#1e293b" : "#ffffff",
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            color: isDark ? "#f8fafc" : "#0f172a",
            fontSize: "12px",
            fontWeight: 600,
        },
        labelStyle: { color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700 },
    };

    const kpiCards = [
        {
            title: "Total Users",
            value: stats?.totalUsers,
            subtitle: `+${stats?.newUsersToday ?? 0} today`,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            trend: stats?.newUsersToday ?? 0,
            trendLabel: `+${stats?.newUsersToday ?? 0} today`,
            gradient: "from-blue-500 to-blue-600",
        },
        {
            title: "Active Users",
            value: stats?.activeUsers,
            subtitle: "Currently enabled accounts",
            icon: UserCheck,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20",
            trend: stats?.activeUsers ?? 0,
            trendLabel: `${stats?.activeUsers ?? 0} active`,
            gradient: "from-cyan-400 to-cyan-500",
        },
        {
            title: "Disabled Users",
            value: stats?.disabledUsers,
            subtitle: "Access blocked accounts",
            icon: UserX,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            trend: -(stats?.disabledUsers ?? 0),
            trendLabel: `${stats?.disabledUsers ?? 0} blocked`,
            gradient: "from-rose-400 to-rose-500",
        },
        {
            title: "Total Chats",
            value: stats?.totalChats,
            subtitle: `+${stats?.chatsToday ?? 0} today`,
            icon: Bot,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
            trend: stats?.chatsToday ?? 0,
            trendLabel: `+${stats?.chatsToday ?? 0} today`,
            gradient: "from-indigo-500 to-indigo-600",
        },
        {
            title: "Quizzes Taken",
            value: stats?.totalQuizzes,
            subtitle: stats?.passRate ? `${stats.passRate}% pass rate` : "No quiz data yet",
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            trend: stats?.totalQuizzes ?? 0,
            trendLabel: stats?.avgScore ? `Avg ${stats.avgScore}%` : "N/A",
            gradient: "from-blue-400 to-blue-500",
        },
        {
            title: "Wizard Generations",
            value: stats?.totalWizardContent,
            subtitle: "AI-generated content items",
            icon: BookOpenText,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
            trend: stats?.totalWizardContent ?? 0,
            trendLabel: `${stats?.totalWizardContent ?? 0} total`,
            gradient: "from-indigo-400 to-indigo-500",
        },
        {
            title: "New This Week",
            value: stats?.newUsersThisWeek,
            subtitle: "User registrations (7d)",
            icon: UserPlus,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20",
            trend: stats?.newUsersThisWeek ?? 0,
            trendLabel: `+${stats?.newUsersThisWeek ?? 0} users`,
            gradient: "from-cyan-400 to-cyan-500",
        },
        {
            title: "Avg RAG Latency",
            value: stats?.avgLatencyMs ? `${stats.avgLatencyMs}ms` : "N/A",
            subtitle: "Mean AI response time",
            icon: Gauge,
            color: "text-slate-500",
            bg: "bg-slate-500/10",
            border: "border-slate-500/20",
            trend: undefined,
            gradient: "from-slate-400 to-slate-500",
        },
    ];

    const pieData = [
        { name: "Active", value: stats?.activeUsers || 0, color: palette.cyan },
        { name: "Disabled", value: stats?.disabledUsers || 0, color: palette.rose },
    ];

    return (
        <div className="pb-12 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className={`relative overflow-hidden mb-8 p-6 md:p-8 rounded-3xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="absolute -top-24 -right-12 w-64 h-64 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">CognitiveWizard Control Room</div>
                    <h1 className={`text-3xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Dashboard</h1>
                    <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Real-time platform KPIs and performance insights</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {kpiCards.map((card, idx) => {
                    const isPositive = card.trend > 0;
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                            className={`relative overflow-hidden rounded-3xl p-5 border shadow-sm group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`} />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${card.bg} ${card.border} ${card.color}`}>
                                    <card.icon size={24} strokeWidth={2.5} />
                                </div>
                                {card.trend !== undefined && (
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        isPositive 
                                            ? (isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100')
                                            : (isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-100')
                                    }`}>
                                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {card.trendLabel || Math.abs(card.trend)}
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className={`h-10 w-24 rounded-lg mb-2 ${isDark ? 'bg-slate-700 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
                            ) : (
                                <div className={`text-3xl font-black mb-1 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {card.value ?? "—"}
                                </div>
                            )}
                            
                            <div className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{card.title}</div>
                            {card.subtitle && (
                                <div className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{card.subtitle}</div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Registrations Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className={`lg:col-span-2 rounded-3xl p-5 md:p-6 border shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>New User Registrations</h3>
                            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Daily signups — last 7 days</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-[240px]">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.dailyRegistrations || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={palette.primary} stopOpacity={0.4} />
                                            <stop offset="95%" stopColor={palette.primary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} allowDecimals={false} dx={-10} />
                                    <RTooltip {...tooltipStyle} formatter={(v) => [v, "New Users"]} cursor={{ stroke: palette.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="users" stroke={palette.primary} strokeWidth={3} fill="url(#userGrad)" dot={{ fill: palette.primary, r: 4, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#ffffff' }} activeDot={{ r: 6, fill: palette.cyan, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>

                {/* User Status Pie */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className={`rounded-3xl p-5 md:p-6 border shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-500'}`}>
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>User Status</h3>
                            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active vs. disabled</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-[200px]">
                            <Loader2 size={32} className="animate-spin text-cyan-500" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RTooltip {...tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={`w-full h-px my-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                            <div className="flex justify-center gap-8 w-full">
                                {pieData.map((d) => (
                                    <div key={d.name} className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d.name}</span>
                                        </div>
                                        <div className="text-xl font-black" style={{ color: d.color }}>{d.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Activity Chart */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className={`lg:col-span-2 rounded-3xl p-5 md:p-6 border shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Chat Activity</h3>
                            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Daily AI sessions — last 7 days</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-[220px]">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.dailyChatActivity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={36}>
                                    <defs>
                                        <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={palette.indigo} stopOpacity={1} />
                                            <stop offset="100%" stopColor={palette.indigo} stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }} allowDecimals={false} dx={-10} />
                                    <RTooltip {...tooltipStyle} formatter={(v) => [v, "Chat Sessions"]} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
                                    <Bar dataKey="chats" fill="url(#chatGrad)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>

                {/* Quiz Summary */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className={`rounded-3xl p-5 md:p-6 border shadow-sm flex flex-col ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Quiz Insights</h3>
                            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Performance summary</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        {[
                            { label: "Total Quizzes", value: loading ? null : (stats?.totalQuizzes ?? 0), colorClass: "text-blue-500", bgClass: isDark ? "bg-blue-500/10" : "bg-blue-50", borderClass: isDark ? "border-blue-500/20" : "border-blue-100" },
                            { label: "Avg Score", value: loading ? null : (stats?.avgScore ? `${stats.avgScore}%` : "N/A"), colorClass: "text-indigo-500", bgClass: isDark ? "bg-indigo-500/10" : "bg-indigo-50", borderClass: isDark ? "border-indigo-500/20" : "border-indigo-100" },
                            { label: "Pass Rate", value: loading ? null : (stats?.passRate ? `${stats.passRate}%` : "N/A"), colorClass: "text-cyan-500", bgClass: isDark ? "bg-cyan-500/10" : "bg-cyan-50", borderClass: isDark ? "border-cyan-500/20" : "border-cyan-100" },
                            { label: "Wizard Content", value: loading ? null : (stats?.totalWizardContent ?? 0), colorClass: "text-slate-500", bgClass: isDark ? "bg-slate-500/10" : "bg-slate-50", borderClass: isDark ? "border-slate-500/20" : "border-slate-200" },
                        ].map((item, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-3.5 rounded-2xl border ${item.bgClass} ${item.borderClass}`}>
                                <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                                {loading ? (
                                    <div className={`w-12 h-6 rounded ${isDark ? 'bg-slate-700 animate-pulse' : 'bg-slate-200 animate-pulse'}`} />
                                ) : (
                                    <span className={`text-base font-black ${item.colorClass}`}>{item.value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
