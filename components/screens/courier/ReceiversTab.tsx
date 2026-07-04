'use client';

import { useState } from 'react';
import { CourierReceiver } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';

interface ReceiversTabProps {
  receivers: CourierReceiver[];
  onAdd: (data: { name: string; address: string; mobile: string }) => Promise<void>;
  onEdit: (id: string, data: Partial<CourierReceiver>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '13px',
  color: colors.text,
  backgroundColor: colors.card,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  color: colors.danger,
  fontSize: '11px',
  marginTop: '3px',
};

export default function ReceiversTab({ receivers, onAdd, onEdit, onDelete }: ReceiversTabProps) {
  const [addForm, setAddForm] = useState({ name: '', address: '', mobile: '' });
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; address: string; mobile: string }>({
    name: '',
    address: '',
    mobile: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const validateAdd = () => {
    const errors: Record<string, string> = {};
    if (!addForm.name.trim()) errors.name = 'Name is required';
    return errors;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitted(true);
    const errors = validateAdd();
    if (Object.keys(errors).length > 0) return;
    setAddLoading(true);
    try {
      await onAdd({ name: addForm.name.trim(), address: addForm.address.trim(), mobile: addForm.mobile.trim() });
      setAddForm({ name: '', address: '', mobile: '' });
      setAddSubmitted(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditStart = (receiver: CourierReceiver) => {
    setEditId(receiver.id);
    setEditForm({ name: receiver.name, address: receiver.address, mobile: receiver.mobile });
  };

  const handleEditSave = async () => {
    if (!editId) return;
    setEditLoading(true);
    try {
      await onEdit(editId, { name: editForm.name.trim(), address: editForm.address.trim(), mobile: editForm.mobile.trim() });
      setEditId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receiver?')) return;
    await onDelete(id);
  };

  const addErrors = addSubmitted ? validateAdd() : {};

  return (
    <div>
      {/* Add Form */}
      <div style={{ ...styles.card, marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: colors.text, marginTop: 0, marginBottom: '14px' }}>
          ➕ Add Receiver
        </h3>
        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={styles.formLabel}>Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                style={{ ...inputStyle, borderColor: addErrors.name ? colors.danger : colors.border }}
                placeholder="Receiver name"
              />
              {addErrors.name && <div style={errorStyle}>{addErrors.name}</div>}
            </div>
            <div>
              <label style={styles.formLabel}>Address</label>
              <input
                type="text"
                value={addForm.address}
                onChange={(e) => setAddForm((p) => ({ ...p, address: e.target.value }))}
                style={inputStyle}
                placeholder="Address"
              />
            </div>
            <div>
              <label style={styles.formLabel}>Mobile</label>
              <input
                type="text"
                value={addForm.mobile}
                onChange={(e) => setAddForm((p) => ({ ...p, mobile: e.target.value }))}
                style={inputStyle}
                placeholder="Mobile number"
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={addLoading}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                opacity: addLoading ? 0.7 : 1,
                cursor: addLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {addLoading ? '⏳ Adding...' : '➕ Add Receiver'}
            </button>
          </div>
        </form>
      </div>

      {/* Receivers Table */}
      <div style={{ ...styles.card, overflowX: 'auto' }}>
        {receivers.length === 0 ? (
          <div style={styles.emptyMessage}>No receivers added yet</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Name</th>
                <th style={styles.tableHeader}>Address</th>
                <th style={styles.tableHeader}>Mobile</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receivers.map((r) => (
                <tr
                  key={r.id}
                  style={styles.tableRow}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.card)}
                >
                  {editId === r.id ? (
                    <>
                      <td style={styles.tableCell}>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          style={{ ...inputStyle, minWidth: '120px' }}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                          style={{ ...inputStyle, minWidth: '150px' }}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm((p) => ({ ...p, mobile: e.target.value }))}
                          style={{ ...inputStyle, minWidth: '120px' }}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleEditSave}
                            disabled={editLoading}
                            style={{
                              ...styles.btn,
                              ...styles.btnSm,
                              backgroundColor: colors.success,
                              color: '#fff',
                              opacity: editLoading ? 0.7 : 1,
                              cursor: editLoading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {editLoading ? '⏳' : '✅ Save'}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...styles.tableCell, fontWeight: 600 }}>{r.name}</td>
                      <td style={styles.tableCell}>{r.address || '—'}</td>
                      <td style={styles.tableCell}>{r.mobile || '—'}</td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleEditStart(r)}
                            style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
                            onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            style={{
                              ...styles.btn,
                              ...styles.btnSm,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                            }}
                          >
                            🗑️ Delete
                          </button>
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
