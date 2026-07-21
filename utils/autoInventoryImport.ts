import * as XLSX from 'xlsx';
import { ImportInventoryRow } from '@/types/autoInventory';

export const downloadInventoryTemplate = () => {
    const sample = [
        { Brand: 'Hikvision', 'Made In': 'China', 'Model No': 'DS-2CD2143G2-I', 'Item Name': '4MP AcuSense Camera', Category: 'Camera', Description: 'Fixed dome IR 40m', Unit: 'pcs', 'Purchase Price (Basic)': 3500, 'GST %': 18, 'Selling Price (Basic)': 5500, 'Opening Stock': 2 },
        { Brand: 'CP Plus', 'Made In': 'China', 'Model No': 'CP-UNC-DA21PL3-MH', 'Item Name': '2MP HD Camera', Category: 'Camera', Description: 'Dome night vision', Unit: 'pcs', 'Purchase Price (Basic)': 1800, 'GST %': 18, 'Selling Price (Basic)': 3200, 'Opening Stock': 5 },
        { Brand: 'Legrand', 'Made In': 'India', 'Model No': '', 'Item Name': 'CAT6 UTP Cable', Category: 'Cable', Description: '305m roll', Unit: 'Roll', 'Purchase Price (Basic)': 2200, 'GST %': 18, 'Selling Price (Basic)': 3800, 'Opening Stock': 3 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = Array(11).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'auto_inventory_template.xlsx');
};

export const parseInventoryFile = (file: File): Promise<ImportInventoryRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
                const rows: ImportInventoryRow[] = rawRows
                    .map(r => ({
                        brand: r['Brand'] || undefined,
                        made_in: r['Made In'] || undefined,
                        model_no: r['Model No'] || undefined,
                        item_name: String(r['Item Name'] || '').trim(),
                        category: r['Category'] || undefined,
                        description: r['Description'] || undefined,
                        unit: r['Unit'] || 'pcs',
                        purchase_price: parseFloat(r['Purchase Price (Basic)']) || 0,
                        gst_percent: parseFloat(r['GST %']) || 0,
                        selling_price: parseFloat(r['Selling Price (Basic)']) || 0,
                        stock_qty: parseFloat(r['Opening Stock']) || 0,
                    }))
                    .filter(i => i.item_name);
                resolve(rows);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
};