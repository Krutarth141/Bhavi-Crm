'use client';

import { useState } from 'react';
import { useEngineers } from '@/hooks/useEngineers';
import EngineerTable from './engineers/EngineerTable';
import EngineerFormModal from './engineers/EngineerFormModal';

type FilterTab = 'all' | 'active' | 'inactive';

export default function EngineersScreen() {
    const {
        engineers, activeEngineers, inactiveEngineers,
        loading, error, loadEngineers,
    } = useEngineers();

    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEngineer, setSelectedEngineer] = useState<any>(null);

    // ── derived list based on filter ──────────────────────────────────────────
    const displayList =
        filterTab === 'active' ? activeEngineers :
            filterTab === 'inactive' ? inactiveEngineers :
                engineers;

    const handleAdd = () => { setSelectedEngineer(null); setModalOpen(true); };
    const handleEdit = (eng: any) => { setSelectedEngineer(eng); setModalOpen(true); };

    const handleSave = async (form: any, id?: string) => {
        const res = await fetch(
            id ? `/api/admin/engineers/${id}` : '/api/admin/engineers',
            {
                method: id ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            }
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Save failed');
        }
        await loadEngineers();
    };

    const handleToggleActive = async (id: string, current: boolean) => {
        if (!confirm(`${current ? 'Deactivate' : 'Activate'} this engineer?`)) return;
        try {
            const res = await fetch(`/api/admin/engineers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !current }),
            });
            if (!res.ok) throw new Error('Failed to update');
            await loadEngineers();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this engineer? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/engineers/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Delete failed');
            await loadEngineers();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="screen-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: 0 }}>👷 Engineers</h2>
                <button className="btn btn-primary" onClick={handleAdd}>➕ Add Engineer</button>
            </div>

            {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                {[
                    { label: 'Total', value: engineers.length, color: '#185FA5' },
                    { label: 'Active', value: activeEngineers.length, color: '#065f46' },
                    { label: 'Inactive', value: inactiveEngineers.length, color: '#991b1b' },
                ].map(stat => (
                    <div key={stat.label} className="card" style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="tabs" style={{ marginBottom: 14 }}>
                {([
                    { id: 'all', label: `All (${engineers.length})` },
                    { id: 'active', label: `✅ Active (${activeEngineers.length})` },
                    { id: 'inactive', label: `❌ Inactive (${inactiveEngineers.length})` },
                ] as { id: FilterTab; label: string }[]).map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${filterTab === tab.id ? 'active' : ''}`}
                        onClick={() => setFilterTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading engineers...</p>
                ) : (
                    <EngineerTable
                        engineers={displayList}
                        onEdit={handleEdit}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* Modal */}
            <EngineerFormModal
                isOpen={modalOpen}
                engineer={selectedEngineer}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
}