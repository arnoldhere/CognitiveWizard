import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Tooltip,
    Chip,
    useMediaQuery,
    ThemeProvider,
    CssBaseline,
    Divider,
} from "@mui/material";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { darkAdminTheme, lightAdminTheme } from "../../theme/adminTheme";
import logoSrc from "../../assets/logo.png";

const drawerWidth = 264;
const MotionBox = motion(Box);

// Lucide icon wrapper for consistent MUI sizing
function LucideIcon({ icon: Icon, size = 18, ...rest }) {
    return <Icon size={size} strokeWidth={2} {...rest} />;
}

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [isDark, setIsDark] = useState(true);

    const theme = isDark ? darkAdminTheme : lightAdminTheme;
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleMenu = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleLogout = () => { logout(); navigate("/login"); };

    const menuItems = [
        { text: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
        { text: "User Management", icon: Users, path: "/admin/users" },
        { text: "Wizard Questions", icon: Sparkles, path: "/admin/wizard-questions" },
        { text: "LLM Config", icon: SlidersHorizontal, path: "/admin/llm-configs" },
    ];

    const avatarLetter = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "A";

    const drawer = (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Brand with logo */}
            <Box sx={{ px: 2.5, py: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                    component="img"
                    src={logoSrc}
                    alt="CognitiveWizard"
                    sx={{ width: 38, height: 38, borderRadius: 2, objectFit: "contain" }}
                />
                <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        CognitiveWizard
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>
                        Admin Portal
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mx: 2, opacity: 0.5 }} />

            {/* Nav Links */}
            <List sx={{ px: 1, py: 2, flex: 1 }}>
                <Typography variant="overline" sx={{ px: 2, color: "text.secondary", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.1em" }}>
                    Navigation
                </Typography>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                selected={isActive}
                                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                                sx={{ py: 1.25, px: 2 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <LucideIcon icon={item.icon} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: isActive ? 700 : 500 }}
                                />
                                {isActive && (
                                    <Box sx={{
                                        width: 3, height: 20, borderRadius: 2,
                                        background: "linear-gradient(180deg, #F26F67, #D14E46)",
                                        ml: 1,
                                    }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <Divider sx={{ mx: 2, opacity: 0.5 }} />

            {/* Bottom: user info */}
            <Box sx={{ p: 2 }}>
                <Box sx={{
                    display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
                    borderRadius: 2.5, bgcolor: isDark ? "rgba(242,111,103,0.06)" : "rgba(242,111,103,0.04)",
                    border: "1px solid", borderColor: isDark ? "rgba(242,111,103,0.12)" : "rgba(242,111,103,0.10)",
                }}>
                    <Avatar sx={{
                        width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700,
                        background: "linear-gradient(135deg, #F26F67, #D14E46)",
                    }}>{avatarLetter}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                            {user?.full_name || "Admin"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {user?.email}
                        </Typography>
                    </Box>
                    <Tooltip title="Logout">
                        <IconButton size="small" onClick={handleLogout} sx={{ color: "text.secondary" }}>
                            <LucideIcon icon={LogOut} size={16} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>

                {/* Top bar */}
                <Box
                    component="header"
                    sx={{
                        position: "fixed", top: 0, right: 0, zIndex: 1200,
                        width: { md: `calc(100% - ${drawerWidth}px)` },
                        left: { md: drawerWidth },
                        px: { xs: 2, md: 3 }, py: 1,
                        display: "flex", alignItems: "center", gap: 2,
                        bgcolor: isDark ? "rgba(8,8,15,0.85)" : "rgba(255,255,255,0.88)",
                        backdropFilter: "blur(12px)",
                        borderBottom: "1px solid",
                        borderColor: isDark ? "rgba(176,176,200,0.08)" : "rgba(220,220,230,0.8)",
                        height: 64,
                    }}
                >
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ display: { md: "none" } }}
                    >
                        <LucideIcon icon={MenuIcon} />
                    </IconButton>

                    <Typography variant="h6" fontWeight={700} sx={{ display: { xs: "none", sm: "block" }, color: "text.primary" }}>
                        {menuItems.find(m => m.path === location.pathname)?.text || "Dashboard"}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    {/* Theme toggle */}
                    <Tooltip title={isDark ? "Switch to Light" : "Switch to Dark"}>
                        <IconButton onClick={() => setIsDark(!isDark)} size="small" sx={{
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: "1px solid", borderColor: "divider",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" },
                        }}>
                            {isDark ? <LucideIcon icon={Sun} size={16} /> : <LucideIcon icon={Moon} size={16} />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Notifications">
                        <IconButton size="small" sx={{
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: "1px solid", borderColor: "divider",
                        }}>
                            <LucideIcon icon={Bell} size={16} />
                        </IconButton>
                    </Tooltip>

                    {/* Avatar */}
                    <Tooltip title="Account">
                        <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                            <Avatar sx={{
                                width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700,
                                background: "linear-gradient(135deg, #F26F67, #D14E46)",
                                boxShadow: "0 2px 8px rgba(242,111,103,0.35)",
                            }}>{avatarLetter}</Avatar>
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                        PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 2.5 } }}
                    >
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography variant="body2" fontWeight={600}>{user?.full_name || "Admin"}</Typography>
                            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                        </Box>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: "error.main", mt: 0.5 }}>
                            <LucideIcon icon={LogOut} size={16} />
                            <Typography variant="body2" fontWeight={600}>Logout</Typography>
                        </MenuItem>
                    </Menu>
                </Box>

                {/* Sidebar */}
                <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: 0 }}>
                    <Drawer
                        variant={isMobile ? "temporary" : "permanent"}
                        open={isMobile ? mobileOpen : true}
                        onClose={handleDrawerToggle}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                            },
                        }}
                    >
                        {drawer}
                    </Drawer>
                </Box>

                {/* Main content */}
                <Box
                    component="main"
                    sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: "64px", width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: "calc(100vh - 64px)" }}
                >
                    <AnimatePresence mode="wait">
                        <MotionBox
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            <Outlet />
                        </MotionBox>
                    </AnimatePresence>
                </Box>
            </Box>
        </ThemeProvider>
    );
}
