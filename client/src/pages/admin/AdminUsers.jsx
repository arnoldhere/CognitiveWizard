import { useState, useEffect } from "react";
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Switch, CircularProgress,
    Chip, Avatar, Tooltip, IconButton, TextField, InputAdornment
} from "@mui/material";
import {
    SearchRounded,
    PersonRounded,
    AdminPanelSettingsRounded,
    BlockRounded,
    CheckCircleOutlineRounded,
    RefreshRounded,
} from "@mui/icons-material";
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
            console.error("Failed to load users", err);
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
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2 }}>
                <Box>
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
                            startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>,
                            sx: { borderRadius: 2.5, minWidth: 220 }
                        }}
                    />
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchUsers} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                            <RefreshRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                    <CircularProgress />
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
                                {filtered.map((user, i) => (
                                    <motion.tr
                                        key={user.id}
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
                                                    bgcolor: user.role === "admin" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.12)",
                                                    color: user.role === "admin" ? "#818CF8" : "#34D399",
                                                }}>
                                                    {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600} noWrap>{user.full_name || "—"}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={user.role === "admin" ? <AdminPanelSettingsRounded sx={{ fontSize: "0.9rem !important" }} /> : <PersonRounded sx={{ fontSize: "0.9rem !important" }} />}
                                                label={user.role}
                                                size="small"
                                                sx={{
                                                    textTransform: "capitalize",
                                                    fontWeight: 700,
                                                    bgcolor: user.role === "admin" ? "rgba(99,102,241,0.12)" : "rgba(148,163,184,0.1)",
                                                    color: user.role === "admin" ? "#818CF8" : "text.secondary",
                                                    border: "none",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                icon={user.is_active ? <CheckCircleOutlineRounded sx={{ fontSize: "0.9rem !important" }} /> : <BlockRounded sx={{ fontSize: "0.9rem !important" }} />}
                                                label={user.is_active ? "Active" : "Blocked"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    bgcolor: user.is_active ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                                                    color: user.is_active ? "#10B981" : "#F43F5E",
                                                    border: "none",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {updating === user.id ? (
                                                <CircularProgress size={20} />
                                            ) : (
                                                <Switch
                                                    checked={user.is_active}
                                                    onChange={() => handleToggleStatus(user.id, user.is_active)}
                                                    disabled={user.role === "admin"}
                                                    size="small"
                                                    sx={{
                                                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#10B981" },
                                                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#10B981" },
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
