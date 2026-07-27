import { useState, useEffect } from "react";
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Switch, CircularProgress,
    Chip, Avatar, Tooltip, IconButton, TextField, InputAdornment
} from "@mui/material";
import {
    Search, User, ShieldCheck, Ban, CheckCircle, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAdminUsers, updateUserStatus } from "../../services/admin";

export default function AdminUsers() {
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
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2, p: { xs: 2.5, md: 3 }, borderRadius: 4, border: "1px solid", borderColor: "divider", background: "linear-gradient(115deg, rgba(20,140,255,0.15), rgba(118,85,246,0.10) 58%, rgba(30,217,242,0.06))" }}>
                <Box>
                    <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 800, letterSpacing: "0.14em" }}>Access control</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>User Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage platform users and control access permissions
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <TextField
                        size="small"
                        placeholder="Search users..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search size={18} style={{ opacity: 0.6 }} /></InputAdornment>,
                            sx: { borderRadius: 2.5, minWidth: 220 }
                        }}
                    />
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchUsers} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                            <RefreshCw size={16} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                    <CircularProgress color="primary" />
                </Box>
            ) : (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Joined</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="center">Toggle</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filtered.map((userItem, i) => (
                                    <motion.tr
                                        key={userItem.id}
                                        component="tr"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25 }}
                                        style={{ display: "table-row" }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <Avatar sx={{
                                                    width: 34, height: 34, fontSize: "0.8rem", fontWeight: 700,
                                                    bgcolor: userItem.role === "admin" ? "rgba(20,140,255,0.16)" : "rgba(30,217,242,0.14)",
                                                    color: userItem.role === "admin" ? "#56B5FF" : "#1ED9F2",
                                                }}>
                                                    {userItem.full_name?.charAt(0) || userItem.email?.charAt(0)?.toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600} noWrap>{userItem.full_name || "—"}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" noWrap>{userItem.email}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={userItem.role === "admin" ? <ShieldCheck size={14} /> : <User size={14} />}
                                                label={userItem.role}
                                                size="small"
                                                sx={{
                                                    textTransform: "capitalize",
                                                    fontWeight: 700,
                                                    bgcolor: userItem.role === "admin" ? "rgba(20,140,255,0.14)" : "rgba(168,199,255,0.10)",
                                                    color: userItem.role === "admin" ? "#56B5FF" : "text.secondary",
                                                    border: "none",
                                                    gap: 0.5,
                                                    "& .MuiChip-icon": { marginLeft: "4px" }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {new Date(userItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={userItem.is_active ? <CheckCircle size={14} /> : <Ban size={14} />}
                                                label={userItem.is_active ? "Active" : "Blocked"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    bgcolor: userItem.is_active ? "rgba(30,217,242,0.14)" : "rgba(255,99,126,0.12)",
                                                    color: userItem.is_active ? "#1ED9F2" : "#FF637E",
                                                    border: "none",
                                                    gap: 0.5,
                                                    "& .MuiChip-icon": { marginLeft: "4px" }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {updating === userItem.id ? (
                                                <CircularProgress size={20} color="primary" />
                                            ) : (
                                                <Switch
                                                    checked={userItem.is_active}
                                                    onChange={() => handleToggleStatus(userItem.id, userItem.is_active)}
                                                    disabled={userItem.role === "admin"}
                                                    size="small"
                                                    sx={{
                                                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#1ED9F2" },
                                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#1ED9F2" },
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    </motion.tr>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block", textAlign: "right" }}>
                        Showing {filtered.length} of {users.length} users
                    </Typography>
                </motion.div>
            )}
        </Box>
    );
}
