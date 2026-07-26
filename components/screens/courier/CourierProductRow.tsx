'use client';

import { CourierProduct, ACCESSORIES_LIST, CONDITION_LIST } from '@/types/courier';
import { colors, styles } from '@/styles/ticketsStyles';

interface Props {
    index: number;
    product: CourierProduct;
    isOutward: boolean;
    showCondition: boolean;
    modelOptions: string[];
    onChange: (product: CourierProduct) => void;
    onRemove?: () => void;
}

const rowInput: React.CSSProperties = {
    border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff',
};

export default function CourierProductRow({ index, product, isOutward, showCondition, modelOptions, onChange, onRemove }: Props) {
    const toggleAcc = (a: string) => {
        const has = product.accessories.includes(a);
        onChange({ ...product, accessories: has ? product.accessories.filter(x => x !== a) : [...product.accessories, a] });
    };
    const toggleCond = (c: string) => {
        const cur = product.condition || [];
        const has = cur.includes(c);
        onChange({ ...product, condition: has ? cur.filter(x => x !== c) : [...cur, c] });
    };

    const dlId = `cr-model-list-${index}-${isOutward ? 'out' : 'in'}`;

    return (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${colors.border}`, borderLeft: '3px solid #1d4ed8', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Product {index + 1}</span>
                {onRemove && (
                    <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, fontSize: 16 }}>✕</button>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                <div>
                    <label style={styles.formLabel}>Model No</label>
                    <input list={dlId} type="text" value={product.model} onChange={e => onChange({ ...product, model: e.target.value })} placeholder="Type model..." style={rowInput} />
                    <datalist id={dlId}>{modelOptions.map((m, i) => <option key={`${m}-${i}`} value={m} />)}</datalist>
                </div>
                <div>
                    <label style={styles.formLabel}>Serial No</label>
                    <input type="text" value={product.serial} onChange={e => onChange({ ...product, serial: e.target.value })} placeholder="Serial number" style={rowInput} />
                </div>
                <div>
                    <label style={styles.formLabel}>Call ID</label>
                    <input type="text" value={product.call_id} onChange={e => onChange({ ...product, call_id: e.target.value })} placeholder="Ticket/Call ID" style={rowInput} />
                </div>
            </div>
            <div style={{ marginBottom: 8 }}>
                <label style={styles.formLabel}>Warranty</label>
                <select value={product.warranty} onChange={e => onChange({ ...product, warranty: e.target.value as any })} style={rowInput}>
                    <option value="In Warranty">✅ In Warranty</option>
                    <option value="Out of Warranty">❌ Out of Warranty</option>
                    <option value="Other">🔄 Other</option>
                </select>
            </div>
            {isOutward && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                            <label style={styles.formLabel}>Faulty Part Available</label>
                            <select value={product.faulty_part || 'No'} onChange={e => onChange({ ...product, faulty_part: e.target.value as any })} style={rowInput}>
                                <option value="Yes">✅ Yes</option>
                                <option value="No">❌ No</option>
                            </select>
                        </div>
                        <div>
                            <label style={styles.formLabel}>Invoice Available</label>
                            <select value={product.invoice_avail || 'No'} onChange={e => onChange({ ...product, invoice_avail: e.target.value as any })} style={rowInput}>
                                <option value="No">❌ No</option>
                                <option value="Yes">✅ Yes</option>
                            </select>
                        </div>
                    </div>
                    {product.invoice_avail === 'Yes' && (
                        <div style={{ marginBottom: 8, maxWidth: 200 }}>
                            <label style={styles.formLabel}>Invoice Amount (₹)</label>
                            <input type="number" value={product.invoice_amount || ''} onChange={e => onChange({ ...product, invoice_amount: e.target.value })} placeholder="e.g. 2500" style={rowInput} />
                        </div>
                    )}
                </>
            )}
            <div style={{ marginBottom: showCondition ? 6 : 0 }}>
                <label style={styles.formLabel}>Accessories {isOutward ? 'Received' : ''}</label>
                <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '4px 6px' }}>
                    {ACCESSORIES_LIST.map(a => (
                        <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>
                            <input type="checkbox" checked={product.accessories.includes(a)} onChange={() => toggleAcc(a)} />
                            {a}
                        </label>
                    ))}
                </div>
            </div>
            {showCondition && (
                <div>
                    <label style={styles.formLabel}>Product Condition</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px' }}>
                        {CONDITION_LIST.map(c => (
                            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={(product.condition || []).includes(c)} onChange={() => toggleCond(c)} />
                                {c}
                            </label>
                        ))}
                        <input type="text" value={product.condition_note || ''} onChange={e => onChange({ ...product, condition_note: e.target.value })} placeholder="Condition notes..." style={{ flex: 1, minWidth: 160, border: 'none', borderLeft: `1px solid ${colors.border}`, padding: '2px 8px', fontSize: 13, outline: 'none', background: 'transparent' }} />
                    </div>
                </div>
            )}
        </div>
    );
}