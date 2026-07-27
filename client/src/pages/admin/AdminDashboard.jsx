import { useState, useEffect } from "react";
import {
    Box, Grid, Typography, Card, CardContent, CircularProgress,
    Chip, Skeleton, Divider,
} from "@mui/material";
import {
    Users, UserCheck, UserX, Bot, GraduationCap, BookOpenText,
    Gauge, UserPlus, TrendingUp, TrendingDown, Activity, Trophy,
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { getAdminStats } from "../../services/admin";

const MotionCard = motion(Card);

// Brand palette
const palette = {
    azure:   "#148CFF",
    cyan:    "#1ED9F2",
    violet:  "#7655F6",
    navy:    "#050D1E",
    ice:     "#A8C7FF",
    danger:  "#FF637E",
};

// Lucide icon wrapper
function LucideIcon({ icon: Icon, size = 22, color, style, ...rest }) {
    return <Icon size={size} strokeWidth={2} color={color} style={style} {...rest} />;
}

// ─── Shared chart tooltip styling ─────────────────────────────────────────────
const TOOLTIP_STYLE = {
    contentStyle: {
        background: "#1E1E2C",
        border: "1px solid rgba(176,176,200,0.12)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        color: "#F0F0F5",
        fontSize: 12,
    },
    labelStyle: { color: "#7A7A9C", fontWeight: 600 },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon, accent, trend, trendLabel, delay = 0, loading }) {
    const isPositive = trend > 0;
    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            sx={{
                borderRadius: 3, height: "100%", position: "relative", overflow: "hidden",
                cursor: "default",
                transition: "all 0.25s ease",
                "&:hover": { transform: "translateY(-3px)", boxShadow: `0 12px 32px ${accent}28` },
            }}
        >
            <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}66)` }} />
            <CardContent sx={{ p: { xs: 2, sm: 3 }, "&:last-child": { pb: { xs: 2, sm: 3 } } }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{
                        width: 42, height: 42, borderRadius: 2.5,
                        bgcolor: `${accent}18`, border: `1px solid ${accent}28`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <LucideIcon icon={icon} color={accent} size={20} />
                    </Box>
                    {trend !== undefined && (
                        <Box sx={{
                            display: "flex", alignItems: "center", gap: 0.5,
                            bgcolor: isPositive ? `${palette.cyan}18` : `${palette.danger}18`,
                            color: isPositive ? palette.cyan : palette.danger,
                            px: 1, py: 0.3, borderRadius: 1.5,
                            fontSize: "0.68rem", fontWeight: 700,
                        }}>
                            <LucideIcon icon={isPositive ? TrendingUp : TrendingDown} size={13} />
                            {trendLabel || `${Math.abs(trend)}`}
                        </Box>
                    )}
                </Box>
                {loading
                    ? <Skeleton variant="text" width="50%" height={44} />
                    : <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1, mb: 0.5 }}>{value ?? "—"}</Typography>
                }
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography>
                {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>{subtitle}</Typography>}
            </CardContent>
        </MotionCard>
    );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ icon, title, subtitle, color = palette.azure }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LucideIcon icon={icon} color={color} size={20} />
            </Box>
            <Box>
                <Typography variant="h6" fontWeight={700}>{title}</Typography>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
        </Box>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdminStats()
            .then(setStats)
            .catch((err) => console.error("Failed to load stats", err))
            .finally(() => setLoading(false));
    }, []);

    // ── KPI card definitions ───────────────────────────────────────────────────
    const kpiCards = [
        {
            title: "Total Users",
            value: stats?.totalUsers,
            subtitle: `+${stats?.newUsersToday ?? 0} today`,
            icon: Users,
            accent: palette.azure,
            trend: stats?.newUsersToday ?? 0,
            trendLabel: `+${stats?.newUsersToday ?? 0} today`,
            delay: 0,
        },
        {
            title: "Active Users",
            value: stats?.activeUsers,
            subtitle: "Currently enabled accounts",
            icon: UserCheck,
            accent: palette.cyan,
            trend: stats?.activeUsers ?? 0,
            trendLabel: `${stats?.activeUsers ?? 0} active`,
            delay: 0.07,
        },
        {
            title: "Disabled Users",
            value: stats?.disabledUsers,
            subtitle: "Access blocked accounts",
            icon: UserX,
            accent: palette.danger,
            trend: -(stats?.disabledUsers ?? 0),
            trendLabel: `${stats?.disabledUsers ?? 0} blocked`,
            delay: 0.14,
        },
        {
            title: "Total Chats",
            value: stats?.totalChats,
            subtitle: `+${stats?.chatsToday ?? 0} today`,
            icon: Bot,
            accent: palette.violet,
            trend: stats?.chatsToday ?? 0,
            trendLabel: `+${stats?.chatsToday ?? 0} today`,
            delay: 0.21,
        },
        {
            title: "Quizzes Taken",
            value: stats?.totalQuizzes,
            subtitle: stats?.passRate ? `${stats.passRate}% pass rate` : "No quiz data yet",
            icon: GraduationCap,
            accent: palette.azure,
            trend: stats?.totalQuizzes ?? 0,
            trendLabel: stats?.avgScore ? `Avg ${stats.avgScore}%` : "N/A",
            delay: 0.28,
        },
        {
            title: "Wizard Generations",
            value: stats?.totalWizardContent,
            subtitle: "AI-generated content items",
            icon: BookOpenText,
            accent: palette.violet,
            trend: stats?.totalWizardContent ?? 0,
            trendLabel: `${stats?.totalWizardContent ?? 0} total`,
            delay: 0.35,
        },
        {
            title: "New This Week",
            value: stats?.newUsersThisWeek,
            subtitle: "User registrations (7d)",
            icon: UserPlus,
            accent: palette.cyan,
            trend: stats?.newUsersThisWeek ?? 0,
            trendLabel: `+${stats?.newUsersThisWeek ?? 0} users`,
            delay: 0.42,
        },
        {
            title: "Avg RAG Latency",
            value: stats?.avgLatencyMs ? `${stats.avgLatencyMs}ms` : "N/A",
            subtitle: "Mean AI response time",
            icon: Gauge,
            accent: palette.ice,
            trend: undefined,
            delay: 0.49,
        },
    ];

    // ── Pie data for user status ───────────────────────────────────────────────
    const pieData = [
        { name: "Active", value: stats?.activeUsers || 0, color: palette.cyan },
        { name: "Disabled", value: stats?.disabledUsers || 0, color: palette.danger },
    ];

    return (
        <Box sx={{ pb: 6 }}>
            {/* Page Header */}
            <Box sx={{ mb: 4, p: { xs: 2.5, md: 3 }, borderRadius: 4, overflow: "hidden", position: "relative", border: "1px solid", borderColor: "divider", background: "linear-gradient(115deg, rgba(20,140,255,0.17), rgba(118,85,246,0.13) 52%, rgba(30,217,242,0.08))" }}>
                <Box sx={{ position: "absolute", width: 180, height: 180, right: -46, top: -90, borderRadius: "50%", bgcolor: "rgba(30,217,242,0.12)", filter: "blur(10px)" }} />
                <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 800, letterSpacing: "0.14em" }}>CognitiveWizard control room</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, position: "relative" }}>Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">
                    Real-time platform KPIs and performance insights
                </Typography>
            </Box>

            {/* ── KPI Score Cards ─────────────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {kpiCards.map((card) => (
                    <Grid item xs={6} sm={6} md={3} key={card.title}>
                        <StatCard {...card} loading={loading} />
                    </Grid>
                ))}
            </Grid>

            {/* ── Charts ──────────────────────────────────────────────────────── */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>

                {/* Daily Registrations Area Chart */}
                <Grid item xs={12} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
                        <Card sx={{ borderRadius: 3, p: 3 }}>
                            <SectionHeading icon={UserPlus} title="New User Registrations" subtitle="Daily signups — last 7 days" color={palette.azure} />
                            {loading
                                ? <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                                : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart data={stats?.dailyRegistrations || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={palette.azure} stopOpacity={0.42} />
                                                    <stop offset="95%" stopColor={palette.azure} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,176,200,0.08)" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A7A9C" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "#7A7A9C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <RTooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "New Users"]} />
                                            <Area type="monotone" dataKey="users" stroke={palette.azure} strokeWidth={2.5} fill="url(#userGrad)" dot={{ fill: palette.azure, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: palette.cyan }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )
                            }
                        </Card>
                    </motion.div>
                </Grid>

                {/* User Status Pie */}
                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}>
                        <Card sx={{ borderRadius: 3, p: 3, height: "100%" }}>
                            <SectionHeading icon={Users} title="User Status" subtitle="Active vs. disabled" color={palette.cyan} />
                            {loading
                                ? <Skeleton variant="circular" width={140} height={140} sx={{ mx: "auto" }} />
                                : (
                                    <Box>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={5} dataKey="value">
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} stroke="transparent" />
                                                    ))}
                                                </Pie>
                                                <RTooltip {...TOOLTIP_STYLE} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <Divider sx={{ my: 1.5, opacity: 0.5 }} />
                                        <Box sx={{ display: "flex", justifyContent: "center", gap: 3 }}>
                                            {pieData.map((d) => (
                                                <Box key={d.name} sx={{ textAlign: "center" }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, justifyContent: "center" }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: d.color }} />
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{d.name}</Typography>
                                                    </Box>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: d.color }}>{d.value}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )
                            }
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Chat Activity Bar Chart */}
            <Grid container spacing={2.5}>
                <Grid item xs={12} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
                        <Card sx={{ borderRadius: 3, p: 3 }}>
                            <SectionHeading icon={Activity} title="Chat Activity" subtitle="Daily AI sessions — last 7 days" color={palette.violet} />
                            {loading
                                ? <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                                : (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={stats?.dailyChatActivity || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={palette.violet} stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor={palette.violet} stopOpacity={0.35} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,176,200,0.08)" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A7A9C" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "#7A7A9C" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <RTooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Chat Sessions"]} />
                                            <Bar dataKey="chats" fill="url(#chatGrad)" radius={[5, 5, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )
                            }
                        </Card>
                    </motion.div>
                </Grid>

                {/* Quiz Summary Card */}
                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.4 }}>
                        <Card sx={{ borderRadius: 3, p: 3, height: "100%" }}>
                            <SectionHeading icon={Trophy} title="Quiz Insights" subtitle="Performance summary" color={palette.azure} />
                            <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                                {[
                                    { label: "Total Quizzes", value: loading ? null : (stats?.totalQuizzes ?? 0), color: palette.azure },
                                    { label: "Avg Score", value: loading ? null : (stats?.avgScore ? `${stats.avgScore}%` : "N/A"), color: palette.violet },
                                    { label: "Pass Rate", value: loading ? null : (stats?.passRate ? `${stats.passRate}%` : "N/A"), color: palette.cyan },
                                    { label: "Wizard Content", value: loading ? null : (stats?.totalWizardContent ?? 0), color: palette.ice },
                                ].map(({ label, value, color }) => (
                                    <Box key={label} sx={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        p: 1.5, borderRadius: 2, bgcolor: `${color}0d`,
                                        border: "1px solid", borderColor: `${color}22`
                                    }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                                        {loading
                                            ? <Skeleton width={40} />
                                            : <Typography variant="body2" fontWeight={800} sx={{ color }}>{value}</Typography>
                                        }
                                    </Box>
                                ))}
                            </Box>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
}
