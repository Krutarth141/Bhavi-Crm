'use client';

import { Ticket, statusBadges } from '@/types/tickets';
import { getBadgeStyle } from '@/utils/printTicket';
import Modal from '@/components/Modal';

interface Props {
    title: string;
    tickets: Ticket[];
    onClose: () => void;
    onView: (ticket: Ticket) => void;
}

export default function KpiDetailModal({ title, tickets, onClose, onView }: Props) {
    return (
        <Modal isOpen title={`${title} — ${tickets.length} calls`} onClose={onClose}>
            {tickets.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No tickets.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Ticket', 'Customer', 'Model', 'Problem', 'Engineer', 'Status', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.id}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{t.cname || '-'}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{t.model || '-'}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.problem || '-'}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{t.assigned_name || <span style={{ color: '#f05252', fontSize: 11 }}>Unassigned</span>}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, ...getBadgeStyle(statusBadges[t.status] || 'badge-open') }}>{t.status}</span></td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <button onClick={() => onView(t)} style={{ background: '#1d4ed8', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}