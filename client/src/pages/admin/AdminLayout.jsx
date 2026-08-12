import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Sparkles,
    SlidersHorizontal,
    Menu as MenuIcon,
    LogOut,
    Sun,
    Moon,
    Bell,
    BookOpen,
    ChevronUp,
    ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import logoSrc from "../../assets/logo.png";

const drawerWidth = 264;

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);
    const [openGenerated, setOpenGenerated] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    
    const menuRef = useRef(null);
    const avatarRef = useRef(null);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Close user dropdown menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target) &&
                avatarRef.current &&
                !avatarRef.current.contains(event.target)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => { logout(); navigate("/login"); };

    const menuItems = [
        { text: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
        { text: "User Management", icon: Users, path: "/admin/users" },
        { 
            text: "Generated Content", 
            icon: BookOpen, 
            subItems: [
                { text: "Published Courses", path: "/admin/courses" },
                { text: "Learner Content", path: "/admin/learner-content" }
            ] 
        },
        { text: "Wizard Questions", icon: Sparkles, path: "/admin/wizard-questions" },
        { text: "LLM Config", icon: SlidersHorizontal, path: "/admin/llm-configs" },
    ];

    const avatarLetter = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "A";

    const sidebarClasses = `fixed inset-y-0 left-0 z-50 flex flex-col w-[264px] transition-transform duration-300 ease-in-out ${isDark ? 'bg-slate-900 border-r border-slate-800 text-slate-300' : 'bg-white border-r border-slate-200 text-slate-600'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`;

    const drawer = (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Brand */}
            <div className="flex items-center gap-3 px-6 py-5 shrink-0">
                <img src={logoSrc} alt="CognitiveWizard" className="w-9 h-9 rounded-lg object-contain" />
                <div>
                    <div className={`text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>CognitiveWizard</div>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Admin Portal</div>
                </div>
            </div>

            <div className={`h-px w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Nav Links */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <div className={`px-4 mb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Navigation</div>
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        if (item.subItems) {
                            return (
                                <li key={item.text}>
                                    <button
                                        onClick={() => setOpenGenerated(!openGenerated)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                            <span>{item.text}</span>
                                        </div>
                                        {openGenerated ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <AnimatePresence>
                                        {openGenerated && (
                                            <motion.ul
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden pl-11 pr-2 mt-1 space-y-1"
                                            >
                                                {item.subItems.map((subItem) => {
                                                    const isSubActive = location.pathname === subItem.path;
                                                    return (
                                                        <li key={subItem.text}>
                                                            <button
                                                                onClick={() => navigate(subItem.path)}
                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isSubActive ? (isDark ? 'text-white font-bold' : 'text-slate-900 font-bold bg-slate-100') : (isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}`}
                                                            >
                                                                <span>{subItem.text}</span>
                                                                {isSubActive && <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 via-primary to-indigo-500" />}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </motion.ul>
                                        )}
                                    </AnimatePresence>
                                </li>
                            );
                        }
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.text}>
                                <button
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-primary/10 text-primary font-bold') : (isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600 font-medium')}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={isActive ? (isDark ? 'text-cyan-400' : 'text-primary') : (isDark ? 'text-slate-400' : 'text-slate-500')} />
                                        <span>{item.text}</span>
                                    </div>
                                    {isActive && <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 via-primary to-indigo-500" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className={`h-px w-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Bottom user info */}
            <div className="p-4 shrink-0">
                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 via-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                        {avatarLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.full_name || "Admin"}</div>
                        <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</div>
                    </div>
                    <button onClick={handleLogout} className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`} title="Logout">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen font-sans flex ${isDark ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
            
            {/* Mobile backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={sidebarClasses}>
                {drawer}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:ml-[264px]">
                
                {/* Top Header */}
                <header className={`sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-16 border-b backdrop-blur-md ${isDark ? 'bg-[#0b0f19]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setMobileOpen(true)}
                            className={`md:hidden p-2 -ml-2 rounded-lg ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <MenuIcon size={20} />
                        </button>
                        <h1 className={`hidden sm:block text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {menuItems.find(m => m.path === location.pathname)?.text || "Dashboard"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button 
                            onClick={() => setIsDark(!isDark)}
                            className={`p-2 rounded-xl transition-colors border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        
                        <button 
                            className={`p-2 rounded-xl transition-colors border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                            title="Notifications"
                        >
                            <Bell size={18} />
                        </button>

                        <div className="relative">
                            <button 
                                ref={avatarRef}
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 via-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20 hover:ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent transition-all"
                            >
                                {avatarLetter}
                            </button>

                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        ref={menuRef}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl overflow-hidden origin-top-right ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                                    >
                                        <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                            <div className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.full_name || "Admin"}</div>
                                            <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</div>
                                        </div>
                                        <div className="p-2">
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            <Outlet context={{ isDark }} />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
