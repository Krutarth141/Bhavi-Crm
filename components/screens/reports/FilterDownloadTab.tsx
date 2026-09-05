'use client';

import { Ticket } from '@/types/reports';
import { isTicketClosed } from '@/types/ticketStatus';
import { FilterSearchFields } from '@/hooks/useReports';

// index.html:9422-9426 — Filter tab's own Call Type list (no "Other").
const FILTER_CALL_TYPES = ['Warranty', 'Non-Warranty', 'AMC', 'Warranty Repeat', 'Non-Warranty Repeat'];

// index.html:9430-9440 — Filter tab's own Status list.
const FILTER_STATUSES = [
    'Pending Customer Arrival', 'Pending Allocation', 'Assigned', 'In Progress',
    'Pending Parts', 'Pending Engineer Stock', 'Pending Repair Carry In', 'Pending Repair On Site',
    'Pending Customer Approval', 'Customer Approved', 'Repaired', 'Delivered',
    'Sent to MSC', 'Pending for Delivery', 'Closed', 'Customer Reject', 'Call Cancel',
];

// index.html:3098-3101 statusBadge()
const STATUS_BADGE_CLASS: Record<string, string> = {
    'Pending Customer Arrival': 'badge-pending', 'Pending Allocation': 'badge-pending', 'Assigned': 'badge-open',
    'In Progress': 'badge-progress', 'Closed': 'badge-closed', 'Delivered': 'badge-closed',
    'Pending Customer Approval': 'badge-pending', 'Customer Approved': 'badge-approve', 'Customer Reject': 'badge-reject',
    'Call Cancel': 'badge-cancel', 'Pending Parts': 'badge-pending', 'Pending Engineer Stock': 'badge-pending',
    'Pending Repair Carry In': 'badge-progress', 'Pending Repair On Site': 'badge-progress', 'Repaired': 'badge-progress',
    'Sent to MSC': 'badge-progress', 'Pending for Delivery': 'badge-progress', 'Resolved By Phone': 'badge-closed',
};

interface FilterDownloadTabProps {
    fields: FilterSearchFields;
    setFields: React.Dispatch<React.SetStateAction<FilterSearchFields>>;
    engineers: string[];
    searched: boolean;
    results: Ticket[];
    runSearch: () => void;
    handleDownload: () => void;
    handlePrint: () => void;
}

export default function FilterDownloadTab({
    fields, setFields,
    engineers,
    searched,
    results,
    runSearch,
    handleDownload,
    handlePrint,
}: FilterDownloadTabProps) {
    const set = <K extends keyof FilterSearchFields>(k: K, v: FilterSearchFields[K]) =>
        setFields((f) => ({ ...f, [k]: v }));

    // index.html:9571-9577 — KPI revenue uses the final_charges fallback, over
    // the FULL result set (not the 100-row display cap).
    const totalRev = results.reduce((a, t) => {
        const sp = (t.spares || []).reduce((s, p: any) => s + (p.qty || 0) * (p.price || 0), 0);
        const svc = parseFloat(String(t.service_charges)) || parseFloat(String(t.labor)) || 0;
        const fin = parseFloat(String(t.final_charges)) || 0;
        const other = parseFloat(String((t as any).other_charge)) || 0;
        return a + (fin > 0 ? fin : svc + sp + other);
    }, 0);
    const closedCount = results.filter((t) => isTicketClosed(t.status)).length;

    return (
        <div>
            {/* Filter fields — index.html:9379-9456 */}
            <div className="card" style={{ marginBottom: '14px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>🔍 Filter Report</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group">
                        <label>Date By</label>
                        <select value={fields.dateType} onChange={(e) => set('dateType', e.target.value as FilterSearchFields['dateType'])} style={fieldStyle}>
                            <option value="created">Created Date</option>
                            <option value="closed">Closed Date</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Date From</label>
                        <input type="date" value={fields.from} onChange={(e) => set('from', e.target.value)} style={fieldStyle} />
                    </div>
                    <div className="form-group">
                        <label>Date To</label>
                        <input type="date" value={fields.to} onChange={(e) => set('to', e.target.value)} style={fieldStyle} />
                    </div>
                    <div className="form-group">
                        <label>Engineer</label>
                        <select value={fields.engineer} onChange={(e) => set('engineer', e.target.value)} style={fieldStyle}>
                            <option value="">All Engineers</option>
                            {engineers.map((e) => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Model No</label>
                        <input type="text" placeholder="Model number..." value={fields.model} onChange={(e) => set('model', e.target.value)} style={fieldStyle} />
                    </div>
                    <div className="form-group">
                        <label>Call Type</label>
                        <select value={fields.callType} onChange={(e) => set('callType', e.target.value)} style={fieldStyle}>
                            <option value="">All Types</option>
                            {FILTER_CALL_TYPES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select value={fields.status} onChange={(e) => set('status', e.target.value)} style={fieldStyle}>
                            <option value="">All Status</option>
                            {FILTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Customer Mobile / Name</label>
                        <input type="text" placeholder="Mobile or name..." value={fields.customer} onChange={(e) => set('customer', e.target.value)} style={fieldStyle} />
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" placeholder="City name..." value={fields.city} onChange={(e) => set('city', e.target.value)} style={fieldStyle} />
                    </div>
                    <div className="form-group">
                        <label>Service Type</label>
                        <select value={fields.service} onChange={(e) => set('service', e.target.value)} style={fieldStyle}>
                            <option value="">All</option>
                            <option>On Site</option>
                            <option>Carry In</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={runSearch}>🔍 Search</button>
                    <button className="btn btn-success" onClick={handleDownload}>📊 Excel</button>
                    <button className="btn btn-outline" onClick={handlePrint}>📄 Print</button>
                </div>
            </div>

            {/* Results — empty until Search is run (index.html:9463 empty div, 9579-9602) */}
            {searched && (
                <>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div className="kpi-card" style={{ flex: 1, minWidth: '120px', padding: '12px' }}>
                            <div className="kpi-label">Results</div>
                            <div className="kpi-value" style={{ fontSize: '22px' }}>{results.length}</div>
                        </div>
                        <div className="kpi-card" style={{ flex: 1, minWidth: '120px', padding: '12px', borderColor: '#0e9f6e' }}>
                            <div className="kpi-label">Closed</div>
                            <div className="kpi-value" style={{ fontSize: '22px', color: '#0e9f6e' }}>{closedCount}</div>
                        </div>
                        <div className="kpi-card" style={{ flex: 1, minWidth: '120px', padding: '12px', borderColor: '#7c3aed' }}>
                            <div className="kpi-label">Revenue</div>
                            <div className="kpi-value" style={{ fontSize: '18px' }}>₹{totalRev.toFixed(0)}</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ticket</th><th>Date</th><th>Customer</th><th>Mobile</th><th>City</th>
                                        <th>Model</th><th>Type</th><th>Engineer</th><th>Status</th><th>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.length === 0 ? (
                                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No results found</td></tr>
                                    ) : (
                                        results.slice(0, 100).map((t) => {
                                            // index.html:9588 — row Revenue excludes "requested" spares and does
                                            // NOT use the final_charges fallback (unlike the KPI card above).
                                            const rev = (t.spares || []).filter((s: any) => !s.requested).reduce((a, s: any) => a + (s.qty || 0) * (s.price || 0), 0)
                                                + (parseFloat(String(t.labor)) || 0) + (parseFloat(String((t as any).other_charge)) || 0);
                                            return (
                                                <tr key={t.id}>
                                                    <td><b>{t.id}</b></td>
                                                    <td>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '-'}</td>
                                                    <td>{t.cname || '-'}</td>
                                                    <td>
                                                        <a href={`tel:${t.mobile}`} className="clickable-phone">{t.mobile || '-'}</a>{' '}
                                                        <a href={`https://wa.me/91${(t.mobile || '').replace(/\D/g, '')}`} target="_blank" style={{ color: '#25D366', fontSize: '12px', textDecoration: 'none' }}>💬</a>
                                                    </td>
                                                    <td>{t.city || '-'}</td>
                                                    <td>{t.model || '-'}</td>
                                                    <td><span className="badge badge-warranty">{t.call_type || '-'}</span></td>
                                                    <td>{t.assigned_name || '-'}</td>
                                                    <td><span className={`badge ${STATUS_BADGE_CLASS[t.status] || 'badge-open'}`}>{t.status || 'Open'}</span></td>
                                                    <td>{rev > 0 ? `₹${rev.toFixed(0)}` : '-'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {results.length > 100 && (
                            <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                Showing first 100 of {results.length} results. Download Excel for all.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

const fieldStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
};