'use client';

import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { InventoryItem } from '@/types/inventory';
import { Brand } from '@/types/masters';
import { deleteInventoryItems, bulkStockOutRows, importInventoryRows } from '@/services/inventoryBulkService';

interface Props {
    inventory: InventoryItem[];
    brands: Brand[];
    selectedIds: string[];
    addedBy: string;
    onClearSelection: () => void;
    onRefresh: () => void;
}

const btnStyle = { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' };

export default function BulkActionsBar({ inventory, brands, selectedIds, addedBy, onClearSelection, onRefresh }: Props) {
    const stockOutFileRef = useRef<HTMLInputElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleDeleteSelected = async () => {
        if (!selectedIds.length) { alert('Please select at least one part'); return; }
        if (!confirm(`Delete ${selectedIds.length} selected part(s)?`)) return;
        const r = await deleteInventoryItems(selectedIds, inventory);
        let msg = '';
        if (r.deleted > 0) msg += `✅ ${r.deleted} part(s) deleted.`;
        if (r.skipped.length) msg += `\n\n⚠️ ${r.skipped.length} part(s) have usage history and cannot be deleted:\n` + r.skipped.slice(0, 5).join('\n') + (r.skipped.length > 5 ? `\n...and ${r.skipped.length - 5} more` : '');
        if (msg) alert(msg);
        onClearSelection();
        onRefresh();
    };

    const downloadStockOutTemplate = () => {
        const data = inventory.slice(0, 5).map(i => ({ 'Part Code': i.part_code || '', 'Part Name': i.item_name, 'Current Stock': i.qty_in_stock, 'Stock Out Qty': 0, 'Note': '' }));
        if (!data.length) data.push({ 'Part Code': 'CG2-5007-000', 'Part Name': 'Example Part', 'Current Stock': 10, 'Stock Out Qty': 2, 'Note': 'Reason for stock out' });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Out');
        XLSX.writeFile(wb, 'stock_out_template.xlsx');
    };

    const handleBulkStockOut = () => {
        const file = stockOutFileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const rows = data.map(row => ({
                code: String(row['Part Code'] || '').trim(),
                qty: parseInt(row['Stock Out Qty']) || 0,
                note: row['Note'] || 'Bulk Stock Out',
            })).filter(r => r.code && r.qty > 0);
            const r = await bulkStockOutRows(rows, addedBy);
            let msg = `✅ Stock Out Complete!\nSuccess: ${r.success} parts`;
            if (r.errors > 0) msg += `\nErrors: ${r.errors}\n` + r.errorList.slice(0, 5).join('. ');
            alert(msg);
            if (stockOutFileRef.current) stockOutFileRef.current.value = '';
            onRefresh();
        };
        reader.readAsBinaryString(file);
    };

    const exportInvExcel = () => {
        const brandMap: Record<string, string> = {};
        brands.forEach(b => { brandMap[b.id] = b.name; });
        const rows = inventory.map(i => {
            const dtp = i.purchase_price || 0;
            const mrp = i.unit_price || 0;
            const gst = i.gst_pct || 0;
            const wQty = i.warranty_qty || 0;
            const val = (i.qty_in_stock || 0) * dtp * (1 + gst / 100);
            return {
                'Part Code': i.part_code || '', 'Part Name': i.item_name || '', 'Brand': i.brand_id ? (brandMap[i.brand_id] || '') : '',
                'Model No': i.category || '', 'Stock': i.qty_in_stock || 0, 'Min Stock': i.min_stock || 0,
                'Purchase Stock': Math.max(0, (i.qty_in_stock || 0) - wQty), 'Warranty Stock': wQty,
                'DTP Price ₹': dtp, 'MRP Price ₹': mrp, 'GST%': gst,
                'Stock Value ₹ (DTP+GST)': dtp > 0 ? Math.round(val) : Math.round((i.qty_in_stock || 0) * mrp),
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 16 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 6 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
        const date = new Date().toLocaleDateString('en-CA');
        XLSX.writeFile(wb, 'inventory_stock_' + date + '.xlsx');
    };

    const downloadInvTemplate = () => {
        const data = [{ 'Part Code': 'CG2-6007-000', 'Item Name': 'LCD ASSY', 'Brand': 'Canon', 'Model No': 'MF3010', 'Stock': 5, 'Min Stock': 2, 'DTP Price ₹': 4200, 'MRP Price ₹': 5399, 'GST%': 18 }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
        XLSX.writeFile(wb, 'inventory_template.xlsx');
    };

    const handleImportInv = () => {
        const file = importFileRef.current?.files?.[0];
        if (!file) { alert('Select a file first'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const wb = XLSX.read(e.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const rows = data.map(row => ({
                part_code: row['Part Code'] || null,
                item_name: row['Item Name'] || '',
                brand: row['Brand'] || '',
                category: row['Model No'] || '',
                qty_in_stock: parseInt(row['Stock']) || 0,
                min_stock: parseInt(row['Min Stock']) || 2,
                purchase_price: parseFloat(row['DTP Price ₹'] ?? row['DTP Price'] ?? row['Purchase Price'] ?? row['Price']) || 0,
                unit_price: parseFloat(row['MRP Price ₹'] ?? row['MRP Price'] ?? row['MRP'] ?? row['Selling Price'] ?? row['Price']) || 0,
                gst_pct: row['GST%'] != null ? parseFloat(row['GST%']) : (row['GST %'] != null ? parseFloat(row['GST %']) : 18),
            }));
            const r = await importInventoryRows(rows, brands);
            alert(`✅ Imported ${r.count} parts${r.errors > 0 ? ' | ⚠️ ' + r.errors + ' skipped (duplicate code?)' : ''}`);
            if (importFileRef.current) importFileRef.current.value = '';
            onRefresh();
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{selectedIds.length} selected</span>
            <button style={{ ...btnStyle, color: '#dc2626', borderColor: '#fecaca' }} onClick={handleDeleteSelected}>🗑️ Delete Selected</button>
            <span style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <button style={btnStyle} onClick={downloadStockOutTemplate}>📥 Stock Out Template</button>
            <input ref={stockOutFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ fontSize: 12, maxWidth: 160 }} />
            <button style={btnStyle} onClick={handleBulkStockOut}>⬆️ Bulk Stock Out</button>
            <span style={{ width: 1, height: 20, background: '#e2e8f0' }} />
            <button style={btnStyle} onClick={exportInvExcel}>📤 Export Excel</button>
            <button style={btnStyle} onClick={downloadInvTemplate}>📥 Import Template</button>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ fontSize: 12, maxWidth: 160 }} />
            <button style={btnStyle} onClick={handleImportInv}>📤 Import Excel</button>
        </div>
    );
}