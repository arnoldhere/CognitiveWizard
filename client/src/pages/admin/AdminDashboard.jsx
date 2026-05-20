import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Analytics,
    CheckCircle,
    ErrorOutlineOutlined,
    Groups,
    HealthAndSafety,
    Refresh,
    Save,
    Settings,
    ToggleOff,
    ToggleOn,
} from '@mui/icons-material';
import {
    getAllUsers,
    getDashboardStats,
    getSystemConfig,
    updateSystemConfig,
    updateUserStatus,
} from '../../services/admin';
import RAGEvalDashboard from './RAG_Eval';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [statsRes, usersRes, configRes] = await Promise.allSettled([
                getDashboardStats(),
                getAllUsers(),
                getSystemConfig(),
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
            if (configRes.status === 'fulfilled') setConfig(configRes.value.data);

            const failed = [statsRes, usersRes, configRes].some((result) => result.status === 'rejected');
            if (failed) setError('Unable to load some admin data. Please refresh.');
        } catch (loadError) {
            console.error('Error loading dashboard:', loadError);
            setError('Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const kpis = useMemo(() => ([
        { label: 'Total Users', value: stats.total_users ?? 0, icon: <Groups /> },
        { label: 'Active Users', value: stats.active_users ?? 0, icon: <CheckCircle /> },
        { label: 'Admins', value: stats.admin_users ?? 0, icon: <HealthAndSafety /> },
        { label: 'New This Week', value: stats.recent_users ?? 0, icon: <Analytics /> },
    ]), [stats]);

    const handleUserStatusChange = async (userId, isActive) => {
        setError('');
        try {
            await updateUserStatus(userId, isActive);
            setUsers((currentUsers) => currentUsers.map((user) => (
                user.id === userId ? { ...user, is_active: isActive } : user
            )));
        } catch (statusError) {
            console.error('Error updating user status:', statusError);
            setError('Unable to update user status.');
        }
    };

    const handleConfigChange = (key, value) => {
        setConfig((currentConfig) => ({ ...currentConfig, [key]: value }));
    };

    const handleConfigSubmit = async (event) => {
        event.preventDefault();
        setSavingConfig(true);
        setMessage('');
        setError('');
        try {
            const payload = {
                max_chat_limit: Number(config.max_chat_limit) || 0,
                default_chat_limit: Number(config.default_chat_limit) || 0,
                maintenance_mode: Boolean(config.maintenance_mode),
            };
            const response = await updateSystemConfig(payload);
            setConfig(response.data.config);
            setMessage('System config saved.');
        } catch (configError) {
            console.error('Error saving config:', configError);
            setError('Unable to save system config.');
        } finally {
            setSavingConfig(false);
        }
    };

    if (loading) {
        return <div className="admin-dashboard admin-loading">Loading admin dashboard...</div>;
    }

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div>
                    <p className="admin-eyebrow">Admin Console</p>
                    <h1>System Dashboard</h1>
                </div>
                <button className="icon-button" type="button" onClick={loadDashboard} title="Refresh dashboard">
                    <Refresh />
                </button>
            </header>

            {(message || error) && (
                <div className={`admin-alert ${error ? 'error' : 'success'}`}>
                    {error || message}
                </div>
            )}

            <section className="admin-kpi-grid">
                {kpis.map((kpi) => (
                    <article className="admin-kpi" key={kpi.label}>
                        <div className="kpi-icon">{kpi.icon}</div>
                        <div>
                            <span>{kpi.label}</span>
                            <strong>{kpi.value}</strong>
                        </div>
                    </article>
                ))}
            </section>

            <section className="admin-main-grid">
                <form className="admin-panel" onSubmit={handleConfigSubmit}>
                    <div className="panel-title">
                        <Settings />
                        <h2>System Config</h2>
                    </div>
                    <label>
                        Max Chat Limit
                        <input
                            type="number"
                            min="0"
                            value={config.max_chat_limit ?? ''}
                            onChange={(event) => handleConfigChange('max_chat_limit', event.target.value)}
                        />
                    </label>
                    <label>
                        Default Chat Limit
                        <input
                            type="number"
                            min="0"
                            value={config.default_chat_limit ?? ''}
                            onChange={(event) => handleConfigChange('default_chat_limit', event.target.value)}
                        />
                    </label>
                    <label className="admin-toggle">
                        <input
                            type="checkbox"
                            checked={Boolean(config.maintenance_mode)}
                            onChange={(event) => handleConfigChange('maintenance_mode', event.target.checked)}
                        />
                        Maintenance Mode
                    </label>
                    <button className="admin-primary-button" type="submit" disabled={savingConfig}>
                        <Save />
                        {savingConfig ? 'Saving...' : 'Save Config'}
                    </button>
                </form>
            </section>

            {/* RAG Evaluation Dashboard - New Component */}
            <section className="admin-evaluation-section">
                <RAGEvalDashboard />
            </section>

            <section className="admin-panel users-panel">
                <div className="panel-title">
                    <Groups />
                    <h2>User Management</h2>
                </div>
                <div className="table-wrap">
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
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>{user.full_name || '-'}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <span className={`status-pill ${user.is_active ? 'pass' : 'fail'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="icon-button table-action"
                                            type="button"
                                            onClick={() => handleUserStatusChange(user.id, !user.is_active)}
                                            title={user.is_active ? 'Deactivate user' : 'Activate user'}
                                        >
                                            {user.is_active ? <ToggleOn /> : <ToggleOff />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminDashboard;
