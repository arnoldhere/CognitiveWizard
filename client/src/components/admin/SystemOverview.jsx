import React, { useEffect, useState } from 'react';
import {
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  HealthAndSafety as HealthAndSafetyIcon,
  TrendingUp as TrendingUpIcon,
  Cloud as CloudIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import '../../styles/AdminDashboard.css';

/**
 * SystemOverview Component
 *
 * Displays key performance indicators and system health metrics
 * in an animated, responsive grid layout.
 *
 * @param {Object} stats - Statistics object containing dashboard metrics
 *   - total_users: Total number of users in system
 *   - active_users: Currently active users
 *   - admin_users: Number of admin accounts
 *   - new_users_week: New users registered this week
 *   - system_health: System health percentage (0-100)
 *   - chat_availability: Chat service availability percentage (0-100)
 * @param {boolean} loading - Loading state for skeleton/spinner display
 */
export default function SystemOverview({ stats = {}, loading = false }) {
  const [displayValues, setDisplayValues] = useState({
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    new_users_week: 0,
    system_health: 0,
    chat_availability: 0,
  });

  // Animate number counters on stats update
  useEffect(() => {
    if (loading || !stats) return;

    const animationDuration = 800; // ms
    const startTime = Date.now();

    const animateValues = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      setDisplayValues({
        total_users: Math.floor((stats.total_users || 0) * progress),
        active_users: Math.floor((stats.active_users || 0) * progress),
        admin_users: Math.floor((stats.admin_users || 0) * progress),
        new_users_week: Math.floor((stats.new_users_week || 0) * progress),
        system_health: Math.floor((stats.system_health || 0) * progress),
        chat_availability: Math.floor((stats.chat_availability || 0) * progress),
      });

      if (progress < 1) {
        requestAnimationFrame(animateValues);
      }
    };

    animateValues();
  }, [stats, loading]);

  /**
   * KPI configuration with icons, labels, and styling
   */
  const kpis = [
    {
      id: 'total-users',
      label: 'Total Users',
      value: displayValues.total_users,
      icon: <GroupsIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--primary',
      unit: '',
    },
    {
      id: 'active-users',
      label: 'Active Users',
      value: displayValues.active_users,
      icon: <CheckCircleIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--success',
      unit: '',
    },
    {
      id: 'admin-users',
      label: 'Admin Users',
      value: displayValues.admin_users,
      icon: <HealthAndSafetyIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--danger',
      unit: '',
    },
    {
      id: 'new-users-week',
      label: 'New Users This Week',
      value: displayValues.new_users_week,
      icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--warning',
      unit: '',
    },
    {
      id: 'system-health',
      label: 'System Health',
      value: displayValues.system_health,
      icon: <CloudIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--info',
      unit: '%',
    },
    {
      id: 'chat-availability',
      label: 'Chat Availability',
      value: displayValues.chat_availability,
      icon: <SettingsIcon sx={{ fontSize: 32 }} />,
      iconClass: 'kpi-icon--secondary',
      unit: '%',
    },
  ];

  return (
    <section className="system-overview">
      <div className="admin-kpi-grid admin-kpi-grid--system">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="admin-kpi">
            <div className={`kpi-icon ${kpi.iconClass}`}>
              {kpi.icon}
            </div>
            <div className="kpi-content">
              <span>{kpi.label}</span>
              <strong>
                {displayValues[kpi.id.replace(/-/g, '_')] || 0}
                {kpi.unit && <span className="kpi-unit">{kpi.unit}</span>}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
