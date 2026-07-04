'use client';

import { useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

export default function AdminStats() {
  const { allUsers, engineers, workControllers } = useUsers();
  const { tasks } = useTasks();

  const stats = useMemo<StatCard[]>(() => {
    const activeTasks = tasks.filter((task) => task.status !== 'Closed').length;

    return [
      { title: 'Total Users', value: allUsers.length, icon: '👥', color: '#3b82f6' },
      { title: 'Active Engineers', value: engineers.length, icon: '🔧', color: '#10b981' },
      { title: 'Work Controllers', value: workControllers.length, icon: '📋', color: '#f59e0b' },
      { title: 'Active Tasks', value: activeTasks, icon: '✅', color: '#8b5cf6' },
    ];
  }, [allUsers.length, engineers.length, workControllers.length, tasks]);

  return (
    <div className="content-section">
      <h2>Dashboard Overview</h2>
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <h3>{stat.title}</h3>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
