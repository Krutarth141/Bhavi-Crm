'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFaultFinder } from '@/hooks/useFaultFinder';
import FaultKnowledgeTab from '@/components/screens/fault-finder/FaultKnowledgeTab';

export default function FaultFinderScreen() {
    const { data: session } = useSession();
    // index.html:28460 — Edit/Delete gate is a strict role==='admin' check, not
    // the broader isCspMgr/isAdminOrWC notions used elsewhere in this app.
    const isAdmin = (session?.user as any)?.role === 'admin';
    const { faults, ticketModels, loading, error, addFault, editFault, removeFault, refetch } = useFaultFinder();
    const [search, setSearch] = useState('');

    // Guided Model + Fault Type search — mirrors HTML's _ffModelSuggest()/
    // _ffFaultSuggest()/searchFaults() (index.html:28312-28432).
    const [modelQuery, setModelQuery] = useState('');
    const [faultQuery, setFaultQuery] = useState('');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showFaultDropdown, setShowFaultDropdown] = useState(false);
    const [guidedSearched, setGuidedSearched] = useState(false);

    const knownModels = useMemo(() => Array.from(new Set([
        ...(faults.map(f => f.model_name).filter(Boolean) as string[]),
        ...ticketModels,
    ])).sort(), [faults, ticketModels]);
    const knownFaultTypes = useMemo(() => Array.from(new Set(faults.map(f => f.fault_type).filter(Boolean) as string[])).sort(), [faults]);
    const modelSuggestions = useMemo(() => {
        const q = modelQuery.toLowerCase();
        return (q ? knownModels.filter(m => m.toLowerCase().includes(q)) : knownModels).slice(0, 10);
    }, [knownModels, modelQuery]);
    const faultSuggestions = useMemo(() => {
        const q = faultQuery.toLowerCase();
        return (q ? knownFaultTypes.filter(f => f.toLowerCase().includes(q)) : knownFaultTypes).slice(0, 10);
    }, [knownFaultTypes, faultQuery]);

    const guidedFaults = useMemo(() => {
        if (!guidedSearched) return null;
        const m = modelQuery.trim().toLowerCase();
        const f = faultQuery.trim().toLowerCase();
        return faults.filter(r => {
            const mMatch = !m || (r.model_name || '').toLowerCase().includes(m);
            const fMatch = !f || (r.fault_type || '').toLowerCase().includes(f) || (r.description || '').toLowerCase().includes(f);
            return mMatch && fMatch;
        });
    }, [faults, guidedSearched, modelQuery, faultQuery]);

    const SEV_COLOR: Record<string, string> = { Low: '#059669', Medium: '#d97706', High: '#dc2626', Critical: '#7c3aed' };
    const SEV_BG: Record<string, string> = { Low: '#f0fdf4', Medium: '#fffbeb', High: '#fef2f2', Critical: '#fdf4ff' };

    // index.html:28417-28418 — the guided-search results (#ff-results) are a
    // dedicated card view, entirely separate from the persistent Knowledge
    // Base table below (#ff-kb-list), which is unaffected by this search.
    const filteredFaults = faults.filter(f => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return f.model_name?.toLowerCase().includes(q) ||
            f.fault_type?.toLowerCase().includes(q) ||
            f.description?.toLowerCase().includes(q) ||
            f.part_required?.toLowerCase().includes(q);
    });

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔍 Fault Finder</h1>
                    {/* index.html:28306 — subtitle under the header */}
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Model select karo + fault type → known solutions</div>
                </div>
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

            {/* Guided Model + Fault Type search — mirrors HTML's "🔎 Fault Search" panel */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🔎 Fault Search</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Model Select Karo</label>
                        <input
                            type="text" placeholder="Type model name..." autoComplete="off"
                            value={modelQuery}
                            onChange={e => { setModelQuery(e.target.value); setShowModelDropdown(true); }}
                            onFocus={() => setShowModelDropdown(true)}
                            onBlur={() => setTimeout(() => setShowModelDropdown(false), 150)}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                        />
                        {showModelDropdown && modelSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                                {modelSuggestions.map(m => (
                                    <div key={m} onMouseDown={() => { setModelQuery(m); setShowModelDropdown(false); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>{m}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Fault / Error Type</label>
                        <input
                            type="text" placeholder="Type fault or error..." autoComplete="off"
                            value={faultQuery}
                            onChange={e => { setFaultQuery(e.target.value); setShowFaultDropdown(true); }}
                            onFocus={() => setShowFaultDropdown(true)}
                            onBlur={() => setTimeout(() => setShowFaultDropdown(false), 150)}
                            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                        />
                        {showFaultDropdown && faultSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                                {faultSuggestions.map(f => (
                                    <div key={f} onMouseDown={() => { setFaultQuery(f); setShowFaultDropdown(false); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>{f}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setGuidedSearched(true)}
                    style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}
                >
                    🔍 Search Faults
                </button>
                {guidedSearched && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{guidedFaults?.length || 0} known fault(s) found for this combination.</span>
                        <button onClick={() => { setGuidedSearched(false); setModelQuery(''); setFaultQuery(''); }} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Clear</button>
                    </div>
                )}
            </div>

            {/* Guided search results — index.html:28420-28449 */}
            {guidedSearched && (
                guidedFaults && guidedFaults.length ? (
                    <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                        {guidedFaults.map((r, i) => {
                            const sev = r.severity || 'Medium';
                            return (
                                <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, borderLeft: `4px solid ${SEV_COLOR[sev] || '#d97706'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>📱 {r.model_name}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', marginTop: 2 }}>🔧 {r.fault_type}</div>
                                        </div>
                                        <span style={{ background: SEV_BG[sev] || '#fffbeb', color: SEV_COLOR[sev] || '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{sev}</span>
                                    </div>
                                    {r.description && (
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>{r.description}</div>
                                    )}
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>✅ Solution</div>
                                        <div style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'pre-wrap' }}>{r.solution || 'No solution recorded yet'}</div>
                                    </div>
                                    {r.part_required && (
                                        <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>🔩 Part Required: {r.part_required}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                        ⚠️ No known faults found for this combination. Admin/Engineer ne report karva &quot;Add Fault Entry&quot; use karo.
                    </div>
                )
            )}

            {/* Knowledge Base table — index.html:28452+, always visible, independent of guided search */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Loading...</p>
                ) : (
                    <FaultKnowledgeTab faults={filteredFaults} isAdmin={isAdmin} onAdd={addFault} onEdit={editFault} onDelete={removeFault} onRefetch={refetch} />
                )}
            </div>
        </div>
    );
}