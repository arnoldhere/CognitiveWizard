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
    Toolbar,
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
    DashboardRounded,
    PeopleRounded,
    TuneRounded,
    MenuRounded,
    LogoutRounded,
    LightModeRounded,
    DarkModeRounded,
    AdminPanelSettingsRounded,
    NotificationsNoneRounded,
    AutoAwesomeRounded,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { darkAdminTheme, lightAdminTheme } from "../../theme/adminTheme";

const drawerWidth = 264;

const MotionBox = motion(Box);

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
        { text: "Dashboard", icon: <DashboardRounded />, path: "/admin/dashboard", badge: null },
        { text: "User Management", icon: <PeopleRounded />, path: "/admin/users", badge: null },
        { text: "Wizard Questions", icon: <AutoAwesomeRounded />, path: "/admin/wizard-questions", badge: null },
        { text: "LLM Config", icon: <TuneRounded />, path: "/admin/llm-configs", badge: null },
    ];

    const avatarLetter = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "A";

    const drawer = (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Brand */}
            <Box sx={{ px: 3, py: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{
                    width: 38, height: 38, borderRadius: 2.5,
                    background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(99,102,241,0.4)"
                }}>
                    <AdminPanelSettingsRounded sx={{ color: "#fff", fontSize: 20 }} />
                </Box>
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
                                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: isActive ? 700 : 500 }}
                                />
                                {item.badge && (
                                    <Chip label={item.badge} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} />
                                )}
                                {isActive && (
                                    <Box sx={{
                                        width: 3, height: 20, borderRadius: 2,
                                        background: "linear-gradient(180deg, #6366F1, #4F46E5)",
                                        ml: 1
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
                    borderRadius: 2.5, bgcolor: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
                    border: "1px solid", borderColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)"
                }}>
                    <Avatar sx={{
                        width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700,
                        background: "linear-gradient(135deg, #6366F1, #4F46E5)"
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
                            <LogoutRounded fontSize="small" />
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

                {/* Top AppBar */}
                <Box
                    component="header"
                    sx={{
                        position: "fixed", top: 0, right: 0, zIndex: 1200,
                        width: { md: `calc(100% - ${drawerWidth}px)` },
                        left: { md: drawerWidth },
                        px: { xs: 2, md: 3 }, py: 1,
                        display: "flex", alignItems: "center", gap: 2,
                        bgcolor: isDark ? "rgba(2,6,23,0.85)" : "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(12px)",
                        borderBottom: "1px solid",
                        borderColor: isDark ? "rgba(148,163,184,0.08)" : "rgba(226,232,240,0.8)",
                        height: 64,
                    }}
                >
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ display: { md: "none" } }}
                    >
                        <MenuRounded />
                    </IconButton>

                    {/* Page title - derived from route */}
                    <Typography variant="h6" fontWeight={700} sx={{ display: { xs: "none", sm: "block" }, color: "text.primary" }}>
                        {menuItems.find(m => m.path === location.pathname)?.text || "Dashboard"}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    {/* Theme toggle */}
                    <Tooltip title={isDark ? "Switch to Light" : "Switch to Dark"}>
                        <IconButton onClick={() => setIsDark(!isDark)} size="small" sx={{
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: "1px solid", borderColor: "divider",
                            "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }
                        }}>
                            {isDark ? <LightModeRounded sx={{ fontSize: 18 }} /> : <DarkModeRounded sx={{ fontSize: 18 }} />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Notifications">
                        <IconButton size="small" sx={{
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                            border: "1px solid", borderColor: "divider",
                        }}>
                            <NotificationsNoneRounded sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>

                    {/* Avatar menu */}
                    <Tooltip title="Account">
                        <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                            <Avatar sx={{
                                width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700,
                                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                                boxShadow: "0 2px 8px rgba(99,102,241,0.4)"
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
                            <LogoutRounded fontSize="small" />
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
