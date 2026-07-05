'use client';

import { useState } from 'react';
import { useFaultFinder } from '@/hooks/useFaultFinder';
import FaultKnowledgeTab from '@/components/screens/fault-finder/FaultKnowledgeTab';
import ErrorCodesTab from '@/components/screens/fault-finder/ErrorCodesTab';
import { FaultFinderTab } from '@/types/faultFinder';

export default function FaultFinderScreen() {
    const { faults, errors, loading, error, addFault } = useFaultFinder();
    const [activeTab, setActiveTab] = useState<FaultFinderTab>('fault-knowledge');
    const [search, setSearch] = useState('');

    const filteredFaults = faults.filter(f => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return f.model_name?.toLowerCase().includes(q) ||
            f.fault_type?.toLowerCase().includes(q) ||
            f.description?.toLowerCase().includes(q) ||
            f.part_required?.toLowerCase().includes(q);
    });

    const filteredErrors = errors.filter(e => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return e.model_name?.toLowerCase().includes(q) ||
            e.error_code?.toLowerCase().includes(q) ||
            e.brand?.toLowerCase().includes(q) ||
            e.cause?.toLowerCase().includes(q);
    });

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔍 Fault Finder</h1>
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>Error: {error}</div>}

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="Search by model, fault type, error code, cause..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
                {([
                    { id: 'fault-knowledge', label: `🧠 Fault Knowledge (${filteredFaults.length})` },
                    { id: 'error-codes', label: `❌ Error Codes (${filteredErrors.length})` },
                ] as { id: FaultFinderTab; label: string }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 16px', border: 'none', background: 'none',
                            cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                            color: activeTab === tab.id ? '#185FA5' : '#6b7280',
                            borderBottom: activeTab === tab.id ? '2px solid #185FA5' : '2px solid transparent',
                            marginBottom: -1,
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : activeTab === 'fault-knowledge' ? (
                    <FaultKnowledgeTab faults={filteredFaults} onAdd={addFault} />
                ) : (
                    <ErrorCodesTab errors={filteredErrors} />
                )}
            </div>
        </div>
    );
}