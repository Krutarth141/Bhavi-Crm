'use client';

import { WalkInProduct, WalkInProductType } from '@/types/walkin';
import { colors, styles } from '@/styles/ticketsStyles';

interface Brand { id: string; name: string; }
interface Model { id: string; brand_id: string | null; model_no: string; model_name: string | null; }

interface Props {
    index: number;
    product: WalkInProduct;
    brands: Brand[];
    models: Model[];
    onChange: (p: WalkInProduct) => void;
    onRemove?: () => void;
}

const rowInput: React.CSSProperties = {
    border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 12px',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', background: '#fff',
};

const PURCHASE_TYPE_OPTIONS = ['Printer Ink / Cartridges', 'New Printer', 'Camera Accessories'];
const CONDITION_OPTIONS = ['Warranty', 'Non Warranty', 'Other', 'Very Old Products'];
const WARRANTY_OPTIONS = ['In Warranty', 'Out of Warranty', 'Other'];

export default function WalkInProductRow({ index, product, brands, models, onChange, onRemove }: Props) {
    const secondaryLabel = product.type === 'Purchase' ? 'Purchase Type' : product.type === 'For Checking Only' ? 'Condition' : 'Warranty';
    const secondaryOptions = product.type === 'Purchase' ? PURCHASE_TYPE_OPTIONS : product.type === 'For Checking Only' ? CONDITION_OPTIONS : WARRANTY_OPTIONS;
    const secondaryValue = (product.type === 'Purchase' || product.type === 'For Checking Only') ? product.subtype : product.warranty;

    const handleTypeChange = (type: WalkInProductType) => {
        onChange({ ...product, type, warranty: '', subtype: '' });
    };
    const handleSecondaryChange = (val: string) => {
        if (product.type === 'Purchase' || product.type === 'For Checking Only') onChange({ ...product, subtype: val });
        else onChange({ ...product, warranty: val });
    };

    const selectedBrandId = brands.find((b) => b.name === product.brand)?.id;
    const modelOptions = models
        .filter((m) => !product.brand || m.brand_id === selectedBrandId)
        .map((m) => m.model_name || m.model_no);
    const dlId = `wi-model-list-${index}`;

    return (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Product {index + 1}</span>
                {onRemove && (
                    <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, fontSize: 16 }}>✕</button>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                    <label style={styles.formLabel}>Brand</label>
                    <select value={product.brand} onChange={(e) => onChange({ ...product, brand: e.target.value, model: '' })} style={rowInput}>
                        <option value="">Select Brand</option>
                        {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={styles.formLabel}>Model No</label>
                    <input list={dlId} type="text" value={product.model} onChange={(e) => onChange({ ...product, model: e.target.value })} placeholder="Type to search model..." style={rowInput} />
                    <datalist id={dlId}>{modelOptions.map((m, i) => <option key={`${m}-${i}`} value={m} />)}</datalist>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                    <label style={styles.formLabel}>Type</label>
                    <select value={product.type} onChange={(e) => handleTypeChange(e.target.value as WalkInProductType)} style={rowInput}>
                        <option value="Inward">📥 Inward</option>
                        <option value="Outward">📤 Outward</option>
                        <option value="Other">🔄 Other</option>
                        <option value="Purchase">🛒 Purchase</option>
                        <option value="For Checking Only">🔍 For Checking Only</option>
                    </select>
                </div>
                <div>
                    <label style={styles.formLabel}>{secondaryLabel}</label>
                    <select value={secondaryValue} onChange={(e) => handleSecondaryChange(e.target.value)} style={rowInput}>
                        <option value="">— Select —</option>
                        {secondaryOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label style={styles.formLabel}>Remarks / Special Note</label>
                <input type="text" value={product.remarks} onChange={(e) => onChange({ ...product, remarks: e.target.value })} placeholder="e.g. Paper jam, Display issue, Physical damage..." style={rowInput} />
            </div>
        </div>
    );
}