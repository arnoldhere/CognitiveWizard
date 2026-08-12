import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, User, ShieldCheck, Ban, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getAdminUsers, updateUserStatus } from "../../services/admin";

export default function AdminUsers() {
    const { isDark } = useOutletContext() || { isDark: false };
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        setUpdating(id);
        try {
            const newStatus = !currentStatus;
            await updateUserStatus(id, newStatus);
            setUsers(users.map(u => u.id === id ? { ...u, is_active: newStatus } : u));
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setUpdating(null);
        }
    };

    const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="pb-12 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div className={`relative overflow-hidden mb-6 p-6 md:p-8 rounded-3xl border flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="absolute -top-24 -right-12 w-64 h-64 bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Access Control</div>
                    <h1 className={`text-2xl font-extrabold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>User Management</h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage platform users and control access permissions
                    </p>
                </div>
                
                <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 text-sm rounded-full border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${isDark ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>
                    <button 
                        onClick={fetchUsers} 
                        disabled={loading}
                        className={`p-2 rounded-xl border shadow-sm transition-colors shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50'}`}
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin text-primary" : ""} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className={`text-xs uppercase font-bold tracking-wider ${isDark ? 'bg-slate-900/50 text-slate-400 border-b border-slate-700' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Joined</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Access</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                    {filtered.map((userItem, i) => (
                                        <motion.tr
                                            key={userItem.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04, duration: 0.25 }}
                                            className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                                                        userItem.role === "admin" 
                                                            ? (isDark ? 'bg-primary/20 text-blue-400' : 'bg-primary/10 text-primary')
                                                            : (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
                                                    }`}>
                                                        {userItem.full_name?.charAt(0) || userItem.email?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <div className={`font-bold truncate max-w-[150px] sm:max-w-[200px] ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                                        {userItem.full_name || "—"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-sm truncate max-w-[200px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {userItem.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                    userItem.role === "admin"
                                                        ? (isDark ? 'bg-primary/10 text-blue-400 border-primary/20' : 'bg-primary/10 text-primary border-primary/20')
                                                        : (isDark ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200')
                                                }`}>
                                                    {userItem.role === "admin" ? <ShieldCheck size={12} /> : <User size={12} />}
                                                    {userItem.role}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(userItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                    userItem.is_active
                                                        ? (isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100')
                                                        : (isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-100')
                                                }`}>
                                                    {userItem.is_active ? <CheckCircle size={12} /> : <Ban size={12} />}
                                                    {userItem.is_active ? "Active" : "Blocked"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center h-full">
                                                    {updating === userItem.id ? (
                                                        <Loader2 size={20} className="animate-spin text-primary" />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleToggleStatus(userItem.id, userItem.is_active)}
                                                            disabled={userItem.role === "admin"}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'} disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                userItem.is_active ? 'bg-cyan-500' : (isDark ? 'bg-slate-600' : 'bg-slate-300')
                                                            }`}
                                                            role="switch"
                                                            aria-checked={userItem.is_active}
                                                        >
                                                            <span
                                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                                    userItem.is_active ? 'translate-x-4.5' : 'translate-x-1'
                                                                }`}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className={`px-6 py-12 text-center font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                No users found matching "{search}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className={`mt-3 text-right text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Showing {filtered.length} of {users.length} users
                    </div>
                </motion.div>
            )}
        </div>
    );
}
