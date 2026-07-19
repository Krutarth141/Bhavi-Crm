'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { SalesProduct } from '@/types/sales';
import { fetchAllSalesProducts, saveSalesProduct, deactivateSalesProduct, bulkImportSalesProducts } from '@/services/salesService';
import ProductFormModal from './ProductFormModal';

interface Props {
    onProductsChanged: () => void;
}

export default function ProductsTab({ onProductsChanged }: Props) {
    const [products, setProducts] = useState<SalesProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [formProduct, setFormProduct] = useState<SalesProduct | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const importRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        setProducts(await fetchAllSalesProducts());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => { setFormProduct(null); setFormOpen(true); };
    const openEdit = (p: SalesProduct) => { setFormProduct(p); setFormOpen(true); };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        const r = await deactivateSalesProduct(id);
        if (r.success) { await load(); onProductsChanged(); }
        else alert(r.error);
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([
            ['Name *', 'Model', 'Category', 'Selling Price * (₹) — Final price incl. all taxes', 'GST % (for invoice breakdown only)', 'Stock Status (available / out_of_stock)', 'Description', 'Features (semicolon separated)', 'Specifications (Key:Value ; Key:Value)', 'Image URL'],
            ['Canon GI-790 BK Ink', 'GI-790-BK', 'Ink', '595', '18', 'available', 'Black ink for Canon Pixma G series', 'Page yield 6000; Compatible G series', 'Volume: 135ml; Colour: Black', ''],
            ['Canon PIXMA G3010', 'G3010', 'Printer', '12500', '18', 'available', 'Wireless ink tank printer', 'WiFi; Duplex; Print Scan Copy', 'Speed: 9ipm; Resolution: 4800x1200', ''],
        ]);
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, 'BhaviElectronics_Products_Template.xlsx');
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: 'binary' });
                const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
                if (!rows.length) { alert('No data found in the file.'); return; }
                const products = rows.map(r => {
                    const features = String(r['Features (semicolon separated)'] || r['Features'] || '').split(';').map((s: string) => s.trim()).filter(Boolean);
                    const specsRaw = String(r['Specifications (Key:Value ; Key:Value)'] || r['Specifications'] || '').split(';');
                    const specifications: Record<string, string> = {};
                    specsRaw.forEach((s: string) => { const kv = s.split(':'); if (kv.length >= 2) specifications[kv[0].trim()] = kv.slice(1).join(':').trim(); });
                    const priceKey = Object.keys(r).find(k => k.toLowerCase().includes('selling price'));
                    return {
                        name: r['Name *'] || r['Name'] || '',
                        model: r['Model'] || '',
                        category: r['Category'] || '',
                        price: parseFloat(r[priceKey || '']) || 0,
                        gst_percent: parseFloat(r['GST %'] || r['GST % (for invoice breakdown only)']) || 18,
                        stock_status: (r['Stock Status (available / out_of_stock)'] || r['Stock Status'] || 'available').trim(),
                        description: r['Description'] || '',
                        features, specifications,
                        image_url: r['Image URL'] || '',
                    };
                }).filter(p => p.name);
                if (!products.length) { alert('No valid products found.'); return; }
                const r = await bulkImportSalesProducts(products as any);
                if (r.success) { alert(`${r.count} products uploaded successfully!`); await load(); onProductsChanged(); }
                else alert('Error: ' + r.error);
            } catch (ex: any) {
                alert('Error: ' + ex.message);
            } finally {
                if (importRef.current) importRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading products...</div>;

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={openAdd} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Product</button>
                <button onClick={downloadTemplate} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>📥 Template</button>
                <label style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
                    📤 Bulk Upload
                    <input ref={importRef} type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>{products.length} products</span>
            </div>

            {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No products yet. Add your first product!</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                    {products.map(p => (
                        <div key={p.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                            {p.image_url ? (
                                <img src={p.image_url} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: 100, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 28 }}>📦</div>
                            )}
                            <div style={{ padding: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 2 }}>{p.name}</div>
                                {p.model && <div style={{ fontSize: 11, color: '#6b7280' }}>{p.model}</div>}
                                <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: '#111' }}>₹{Number(p.price).toLocaleString('en-IN')}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>Selling Price (all taxes incl.)</div>
                                <div style={{ marginTop: 4 }}>
                                    <span style={{ background: p.stock_status === 'available' ? '#d1fae5' : '#fee2e2', color: p.stock_status === 'available' ? '#065f46' : '#991b1b', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                                        {p.stock_status === 'available' ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                    <button onClick={() => openEdit(p)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>✏️</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ flex: 1, background: '#fee2e2', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {formOpen && (
                <ProductFormModal
                    product={formProduct}
                    onClose={() => setFormOpen(false)}
                    onSave={async (id, data) => {
                        const r = await saveSalesProduct(id, data);
                        if (r.success) { setFormOpen(false); await load(); onProductsChanged(); }
                        return r;
                    }}
                />
            )}
        </div>
    );
}