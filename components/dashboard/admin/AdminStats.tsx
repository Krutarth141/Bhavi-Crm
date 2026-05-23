'use client';

import { useState, useEffect } from 'react';

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatCard[]>([
    { title: 'Total Users', value: 0, icon: '👥', color: '#3b82f6' },
    { title: 'Active Engineers', value: 0, icon: '🔧', color: '#10b981' },
    { title: 'Work Controllers', value: 0, icon: '📋', color: '#f59e0b' },
    { title: 'Active Tasks', value: 0, icon: '✅', color: '#8b5cf6' },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // TODO: Fetch real stats from your API
      // const response = await fetch('/api/admin/stats');
      // const data = await response.json();
      setStats([
        { title: 'Total Users', value: 12, icon: '👥', color: '#3b82f6' },
        { title: 'Active Engineers', value: 8, icon: '🔧', color: '#10b981' },
        { title: 'Work Controllers', value: 2, icon: '📋', color: '#f59e0b' },
        { title: 'Active Tasks', value: 24, icon: '✅', color: '#8b5cf6' },
      ]);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

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
