import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAllUsers, updateUserStatus } from '../services/admin';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                getDashboardStats(),
                getAllUsers()
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserStatusChange = async (userId, isActive) => {
        try {
            await updateUserStatus(userId, isActive);
            setUsers(users.map(user =>
                user.id === userId ? { ...user, is_active: isActive } : user
            ));
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <p>{stats.total_users}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Users</h3>
                    <p>{stats.active_users}</p>
                </div>
                <div className="stat-card">
                    <h3>Admin Users</h3>
                    <p>{stats.admin_users}</p>
                </div>
                <div className="stat-card">
                    <h3>Recent Users (7 days)</h3>
                    <p>{stats.recent_users}</p>
                </div>
            </div>

            <div className="users-section">
                <h2>Users Management</h2>
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Full Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.email}</td>
                                <td>{user.full_name || '-'}</td>
                                <td>{user.role}</td>
                                <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                                <td>
                                    <button
                                        onClick={() => handleUserStatusChange(user.id, !user.is_active)}
                                        className={user.is_active ? 'deactivate' : 'activate'}
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;