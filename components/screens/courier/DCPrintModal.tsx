'use client';

import { useState } from 'react';
import { CourierEntry, CourierReceiver } from '@/types/courier';
import { genDCNo, updateCourierEntry } from '@/services/courierService';
import { printCourierDC } from '@/utils/printCourierDC';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    entry: CourierEntry;
    receivers: CourierReceiver[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}

const fieldStyle: React.CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 6 };

export default function DCPrintModal({ entry, receivers, onClose, onSaved }: Props) {
    const initialName = entry.receiver_data?.name || entry.person_name || '';
    const initial = receivers.find(r => r.name === initialName) || null;
    const [receiverId, setReceiverId] = useState(initial?.id || '');
    const [amount, setAmount] = useState(entry.dc_amount || entry.receiver_data?.dc_amount || '');
    const [desc, setDesc] = useState('CAMERA AND LENS AFTER REPAIRING');
    const [printing, setPrinting] = useState(false);

    const selected = receivers.find(r => r.id === receiverId) || null;

    const handlePrint = async () => {
        if (!selected) { alert('Please select a receiver'); return; }
        setPrinting(true);
        try {
            let dcNo = entry.dc_no;
            if (!dcNo) dcNo = await genDCNo();

            const receiverData = {
                name: selected.name, address: selected.address, city: selected.city,
                state: selected.state, pin: selected.pin, phone: selected.phone, dc_amount: amount || '',
            };

            await updateCourierEntry(entry.id, {
                person_name: selected.name,
                place: selected.city,
                receiver_id: selected.id,
                receiver_data: receiverData,
                dc_no: dcNo,
                dc_amount: amount || null,
            });

            printCourierDC({
                dcNo,
                entryDate: entry.entry_date,
                awbNo: entry.awb_no,
                agency: entry.agency,
                wcName: entry.wc_name,
                products: entry.products || [],
                receiver: receiverData,
                amount,
                description: desc,
            });

            await onSaved();
            onClose();
        } catch (err: any) {
            alert('Error: ' + (err.message ?? String(err)));
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ ...styles.modal, maxWidth: 500 }}>
                <div style={styles.modalHeader}>
                    <div style={styles.modalTitle}>🖨️ DC — {entry.dc_no || '(will be generated)'}</div>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div style={styles.modalBody}>
                    <label style={styles.formLabel}>TO (Receiver) *</label>
                    <select value={receiverId} onChange={e => setReceiverId(e.target.value)} style={fieldStyle}>
                        <option value="">-- Select Receiver --</option>
                        {receivers.map(r => <option key={r.id} value={r.id}>{r.name} — {r.city}</option>)}
                    </select>
                    {selected && (
                        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
                            <b>{selected.name}</b><br />
                            {selected.address && <>{selected.address}<br /></>}
                            {selected.city}{selected.state ? ` — ${selected.state}` : ''}{selected.pin ? `, ${selected.pin}` : ''}
                            {selected.phone && <><br />📞 {selected.phone}</>}
                        </div>
                    )}
                    <label style={styles.formLabel}>Approximate Value (₹)</label>
                    <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 48000" style={fieldStyle} />
                    <label style={styles.formLabel}>Description</label>
                    <input type="text" value={desc} onChange={e => setDesc(e.target.value)} style={fieldStyle} />
                    <button onClick={handlePrint} disabled={printing} style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', marginTop: 8, opacity: printing ? 0.7 : 1 }}>
                        {printing ? 'Preparing...' : '🖨️ Print DC'}
                    </button>
                </div>
            </div>
        </div>
    );
}