'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('general');
  const [companyName, setCompanyName] = useState('BHAVI ELECTRONICS');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="content-section">
      <h2>⚙️ Settings</h2>

      <div className="tabs" style={{ marginBottom: '18px' }}>
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ General
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          className={`tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Company Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="contact@bhavi.com" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input type="text" placeholder="https://bhavi.com" />
            </div>
            <div className="form-group form-full">
              <label>Address</label>
              <textarea placeholder="Company address..." rows={3}></textarea>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '12px' }}>
            💾 Save Changes
          </button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Notification Preferences</h3>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <span>Email Notifications</span>
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '24px' }}>
              Receive email updates for new tickets and assignments
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
              />
              <span>SMS Notifications</span>
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '24px' }}>
              Receive SMS alerts for urgent tickets
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '12px' }}>
            💾 Save Preferences
          </button>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Account Settings</h3>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>Change Password</label>
            <input type="password" placeholder="Current Password" style={{ marginBottom: '8px' }} />
            <input type="password" placeholder="New Password" style={{ marginBottom: '8px' }} />
            <input type="password" placeholder="Confirm New Password" />
          </div>
          <button className="btn btn-primary" style={{ marginBottom: '14px' }}>
            🔐 Update Password
          </button>

          <hr style={{ margin: '14px 0' }} />

          <h3 style={{ marginTop: 0 }}>Danger Zone</h3>
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <button
              className="btn btn-danger"
              onClick={handleLogout}
              style={{ marginBottom: '8px' }}
            >
              🚪 Logout
            </button>
            <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
              This will end your current session.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
