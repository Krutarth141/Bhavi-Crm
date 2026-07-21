'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { TCItem, TCList, getTCItems, saveTCItems, getTCLists, saveTCList, deleteTCListAt } from '@/utils/tcStorage';

interface Props {
    onClose: () => void;
    onApply: (selectedLines: string[]) => void;
}

const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };

export default function TCSelectorModal({ onClose, onApply }: Props) {
    const [tab, setTab] = useState<'select' | 'lists'>('select');
    const [tcItems, setTcItems] = useState<TCItem[]>([]);
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [customInput, setCustomInput] = useState('');
    const [listName, setListName] = useState('');
    const [lists, setLists] = useState<TCList[]>([]);

    useEffect(() => {
        const items = getTCItems();
        setTcItems(items);
        setChecked(Object.fromEntries(items.map((_, i) => [i, true])));
        setLists(getTCLists());
    }, []);

    const addCustom = () => {
        const val = customInput.trim();
        if (!val) return;
        const updated = [...tcItems, { text: val, isDefault: false }];
        setTcItems(updated);
        saveTCItems(updated);
        setChecked(c => ({ ...c, [updated.length - 1]: true }));
        setCustomInput('');
    };

    const removeCustom = (idx: number) => {
        if (tcItems[idx]?.isDefault) return;
        const updated = tcItems.filter((_, i) => i !== idx);
        setTcItems(updated);
        saveTCItems(updated);
        const newChecked: Record<number, boolean> = {};
        updated.forEach((_, i) => { newChecked[i] = i < idx ? checked[i] : checked[i + 1]; });
        setChecked(newChecked);
    };

    const selectedTexts = () => tcItems.filter((_, i) => checked[i]).map(t => t.text);

    const handleSaveList = () => {
        const name = listName.trim();
        if (!name) { alert('Please enter a name for this list.'); return; }
        const selected = selectedTexts();
        if (!selected.length) { alert('Please select at least one T&C item.'); return; }
        if (getTCLists().find(l => l.name === name) && !confirm(`A list named "${name}" already exists. Replace it?`)) return;
        saveTCList({ name, items: selected, savedAt: new Date().toLocaleDateString('en-IN') });
        setLists(getTCLists());
        alert(`✅ T&C list "${name}" saved successfully!`);
    };

    const loadList = (idx: number) => {
        const list = lists[idx];
        if (!list) return;
        let items = tcItems;
        list.items.forEach(text => {
            if (!items.find(t => t.text === text)) {
                items = [...items, { text, isDefault: false }];
            }
        });
        setTcItems(items);
        saveTCItems(items);
        setChecked(Object.fromEntries(items.map((t, i) => [i, list.items.includes(t.text)])));
        setTab('select');
    };

    const removeList = (idx: number) => {
        if (!confirm('Delete this saved list?')) return;
        deleteTCListAt(idx);
        setLists(getTCLists());
    };

    const footer = (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button onClick={() => onApply(selectedTexts())} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>📄 Apply & Print Quotation</button>
        </div>
    );

    return (
        <Modal isOpen title="📄 Terms & Conditions" onClose={onClose} footer={footer} size="lg">
            <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid #e5e7eb' }}>
                <button onClick={() => setTab('select')} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === 'select' ? '#eff6ff' : '#f9fafb', color: tab === 'select' ? '#1d4ed8' : '#6b7280', borderBottom: tab === 'select' ? '2px solid #1d4ed8' : '2px solid transparent' }}>Select T&amp;C</button>
                <button onClick={() => setTab('lists')} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === 'lists' ? '#eff6ff' : '#f9fafb', color: tab === 'lists' ? '#1d4ed8' : '#6b7280', borderBottom: tab === 'lists' ? '2px solid #1d4ed8' : '2px solid transparent' }}>Saved Lists</button>
            </div>

            {tab === 'select' ? (
                <div>
                    <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12, border: '1px solid #f1f5f9', borderRadius: 8 }}>
                        {tcItems.map((tc, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 12, lineHeight: 1.5 }}>
                                <input type="checkbox" checked={!!checked[i]} onChange={e => setChecked(c => ({ ...c, [i]: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span style={{ flex: 1 }}>{tc.text}</span>
                                {!tc.isDefault && <button onClick={() => removeCustom(i)} style={{ marginLeft: 'auto', flexShrink: 0, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }} title="Remove">✕</button>}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Add custom T&C line..." style={fieldStyle} onKeyDown={e => { if (e.key === 'Enter') addCustom(); }} />
                        <button onClick={addCustom} style={{ padding: '8px 16px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>+ Add</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input value={listName} onChange={e => setListName(e.target.value)} placeholder="Name this selection to save it..." style={fieldStyle} />
                        <button onClick={handleSaveList} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>💾 Save List</button>
                    </div>
                </div>
            ) : (
                <div>
                    {lists.length === 0 ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>No saved lists yet.<br />Create one from the &quot;Select T&amp;C&quot; tab.</div> : (
                        lists.map((l, i) => (
                            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div><b style={{ fontSize: 13 }}>{l.name}</b> <span style={{ fontSize: 11, color: '#9ca3af' }}>— Saved {l.savedAt} | {l.items.length} items</span></div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => loadList(i)} style={{ padding: '4px 10px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Load</button>
                                        <button onClick={() => removeList(i)} style={{ padding: '4px 10px', border: '1px solid #e5e7eb', background: 'white', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                    {l.items.slice(0, 2).map((t, j) => <div key={j}>• {t.slice(0, 70)}{t.length > 70 ? '…' : ''}</div>)}
                                    {l.items.length > 2 && <div>… and {l.items.length - 2} more</div>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </Modal>
    );
}