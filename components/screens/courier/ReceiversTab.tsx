'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CourierReceiver } from '@/types/courier';
import { importReceivers } from '@/services/courierService';
import { colors, styles } from '@/styles/ticketsStyles';

interface ReceiversTabProps {
  receivers: CourierReceiver[];
  onAdd: (data: { name: string; address: string; city: string; state: string; pin: string; phone: string }) => Promise<void>;
  onEdit: (id: string, data: Partial<CourierReceiver>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 10px', fontSize: '13px',
  color: colors.text, backgroundColor: colors.card, outline: 'none', width: '100%', boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = { color: colors.danger, fontSize: '11px', marginTop: '3px' };

export default function ReceiversTab({ receivers, onAdd, onEdit, onDelete, onRefresh }: ReceiversTabProps) {
  const emptyForm = { name: '', address: '', city: '', state: '', pin: '', phone: '' };
  const [addForm, setAddForm] = useState(emptyForm);
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const validateAdd = () => {
    const errors: Record<string, string> = {};
    if (!addForm.name.trim()) errors.name = 'Name is required';
    if (!addForm.city.trim()) errors.city = 'City is required';
    return errors;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitted(true);
    if (Object.keys(validateAdd()).length > 0) return;
    setAddLoading(true);
    try {
      await onAdd({ ...addForm, name: addForm.name.trim(), address: addForm.address.trim(), city: addForm.city.trim(), state: addForm.state.trim(), pin: addForm.pin.trim(), phone: addForm.phone.trim() });
      setAddForm(emptyForm);
      setAddSubmitted(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditStart = (r: CourierReceiver) => {
    setEditId(r.id);
    setEditForm({ name: r.name, address: r.address || '', city: r.city || '', state: r.state || '', pin: r.pin || '', phone: r.phone || '' });
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setEditLoading(true);
    try {
      await onEdit(editId, { ...editForm, name: editForm.name.trim() });
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receiver?')) return;
    await onDelete(id);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'BOSS COLOR LAB', Address: 'SARDAR NAGAR MAIN ROAD', City: 'RAJKOT', State: 'Gujarat', PIN: '360001', Phone: '0281-2464321' },
    ]);
    ws['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receivers');
    XLSX.writeFile(wb, 'receiver_template.xlsx');
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('Select a file'); return; }
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
        const rows = data.filter((r: any) => r['Name']).map((r: any) => ({
          name: r['Name'] || '', address: r['Address'] || '', city: r['City'] || '',
          state: r['State'] || '', pin: String(r['PIN'] || ''), phone: String(r['Phone'] || ''),
        }));
        const count = await importReceivers(rows);
        alert(`✅ ${count} receivers imported!`);
        await onRefresh();
        if (fileRef.current) fileRef.current.value = '';
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const addErrors = addSubmitted ? validateAdd() : {};

  return (
    <div>
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: colors.text, marginTop: 0, marginBottom: '14px' }}>➕ Add New Receiver</h3>
        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={styles.formLabel}>Name *</label>
              <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                style={{ ...inputStyle, borderColor: addErrors.name ? colors.danger : colors.border }} placeholder="e.g. BOSS COLOR LAB" />
              {addErrors.name && <div style={errorStyle}>{addErrors.name}</div>}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={styles.formLabel}>Address</label>
              <textarea value={addForm.address} onChange={(e) => setAddForm((p) => ({ ...p, address: e.target.value }))} rows={1}
                style={{ ...inputStyle, resize: 'vertical' as const }} placeholder="Street address" />
            </div>
            <div>
              <label style={styles.formLabel}>City *</label>
              <input type="text" value={addForm.city} onChange={(e) => setAddForm((p) => ({ ...p, city: e.target.value }))}
                style={{ ...inputStyle, borderColor: addErrors.city ? colors.danger : colors.border }} placeholder="e.g. Rajkot" />
              {addErrors.city && <div style={errorStyle}>{addErrors.city}</div>}
            </div>
            <div>
              <label style={styles.formLabel}>State</label>
              <input type="text" value={addForm.state} onChange={(e) => setAddForm((p) => ({ ...p, state: e.target.value }))} style={inputStyle} placeholder="e.g. Gujarat" />
            </div>
            <div>
              <label style={styles.formLabel}>PIN Code</label>
              <input type="text" value={addForm.pin} onChange={(e) => setAddForm((p) => ({ ...p, pin: e.target.value }))} maxLength={6} style={inputStyle} placeholder="e.g. 360001" />
            </div>
            <div>
              <label style={styles.formLabel}>Phone</label>
              <input type="text" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="e.g. 0281-2464321" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={addLoading} style={{ ...styles.btn, ...styles.btnPrimary, opacity: addLoading ? 0.7 : 1 }}>
              {addLoading ? '⏳ Saving...' : '💾 Save Receiver'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={downloadTemplate}>📄 Template Download</button>
        <label style={{ ...styles.btn, ...styles.btnOutline, cursor: 'pointer' }}>
          {importing ? '⏳ Importing...' : '📥 Import Excel'}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImport} />
        </label>
      </div>

      <div style={{ ...styles.card, overflowX: 'auto' }}>
        {receivers.length === 0 ? (
          <div style={styles.emptyMessage}>No receivers yet. Import Excel to add.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Name</th>
                <th style={styles.tableHeader}>Address</th>
                <th style={styles.tableHeader}>City</th>
                <th style={styles.tableHeader}>PIN</th>
                <th style={styles.tableHeader}>Phone</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receivers.map((r) => (
                <tr key={r.id} style={styles.tableRow}>
                  {editId === r.id ? (
                    <>
                      <td style={styles.tableCell}><input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, minWidth: 120 }} /></td>
                      <td style={styles.tableCell}><input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} style={{ ...inputStyle, minWidth: 150 }} /></td>
                      <td style={styles.tableCell}><input value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} style={{ ...inputStyle, minWidth: 100 }} /></td>
                      <td style={styles.tableCell}><input value={editForm.pin} onChange={(e) => setEditForm((p) => ({ ...p, pin: e.target.value }))} style={{ ...inputStyle, minWidth: 70 }} /></td>
                      <td style={styles.tableCell}><input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} style={{ ...inputStyle, minWidth: 120 }} /></td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={handleEditSave} disabled={editLoading} style={{ ...styles.btn, ...styles.btnSm, backgroundColor: colors.success, color: '#fff' }}>{editLoading ? '⏳' : '✅ Save'}</button>
                          <button onClick={() => setEditId(null)} style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}>✕ Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...styles.tableCell, fontWeight: 600 }}>{r.name}</td>
                      <td style={styles.tableCell}>{r.address || '—'}</td>
                      <td style={styles.tableCell}>{r.city || '—'}</td>
                      <td style={styles.tableCell}>{r.pin || '—'}</td>
                      <td style={styles.tableCell}>{r.phone || '—'}</td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleEditStart(r)} style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}>✏️ Edit</button>
                          <button onClick={() => handleDelete(r.id)} style={{ ...styles.btn, ...styles.btnSm, backgroundColor: '#fee2e2', color: '#dc2626', border: 'none' }}>🗑️ Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}