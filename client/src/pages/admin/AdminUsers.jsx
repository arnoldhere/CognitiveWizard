import { useState, useEffect } from "react";
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Switch, CircularProgress 
} from "@mui/material";
import { getAdminUsers, updateUserStatus } from "../../services/admin";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
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
        try {
            const newStatus = !currentStatus;
            await updateUserStatus(id, newStatus);
            setUsers(users.map(u => u.id === id ? { ...u, is_active: newStatus } : u));
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
                User Management
            </Typography>
            
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #eee' }}>
                <Table sx={{ minWidth: 650 }} aria-label="users table">
                    <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Active Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell component="th" scope="row">{user.id}</TableCell>
                                <TableCell>{user.full_name || '-'}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{user.role}</TableCell>
                                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <Switch
                                        checked={user.is_active}
                                        onChange={() => handleToggleStatus(user.id, user.is_active)}
                                        color="primary"
                                        disabled={user.role === 'admin'}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
