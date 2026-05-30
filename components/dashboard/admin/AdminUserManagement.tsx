'use client';

import { useState, useEffect } from 'react';

interface User {
    id: string;
    user_id: string;
    name: string;
    role: string;
    role_type: string;
    is_active: boolean;
    created_at: string;
}

export default function AdminUserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showMigrationTool, setShowMigrationTool] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'engineer',
        role_type: 'engineer',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create user');
            }

            setSuccess('User created successfully!');
            setFormData({ email: '', password: '', name: '', role: 'engineer', role_type: 'engineer' });
            setShowForm(false);
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <div className="content-section">
            <div className="section-header">
                <h2>User Management</h2>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✖ Cancel' : '➕ Add User'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {showForm && (
                <form className="user-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-row">
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                        <select name="role" value={formData.role} onChange={handleInputChange}>
                            <option value="admin">Admin</option>
                            <option value="engineer">Engineer</option>
                            <option value="work_controller">Work Controller</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary">
                        Create User
                    </button>
                </form>
            )}

            <div className="users-table-container">
                {loading ? (
                    <p>Loading users...</p>
                ) : users.length === 0 ? (
                    <p className="empty-message">No users found. Create one to get started!</p>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.user_id}</td>
                                    <td>{user.name}</td>
                                    <td>
                                        <span className="badge" style={{ background: getUserRoleColor(user.role) }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: user.is_active ? '#10b981' : '#ef4444' }}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button className="btn-small">Edit</button>
                                        <button className="btn-small btn-danger">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function getUserRoleColor(role: string): string {
    const colors: Record<string, string> = {
        admin: '#3b82f6',
        engineer: '#10b981',
        work_controller: '#f59e0b',
    };
    return colors[role] || '#6b7280';
}
