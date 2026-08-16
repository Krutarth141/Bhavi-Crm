import { useEffect, useState } from 'react';
import { InventoryItem } from '@/types/inventory';
import { fetchPurchases } from '@/services/inventoryPurchaseService';
import { fetchSales } from '@/services/inventorySaleService';

interface InventoryStatsProps {
    inventory: InventoryItem[];
}

export function InventoryStats({ inventory }: InventoryStatsProps) {
    const [totalPurchaseVal, setTotalPurchaseVal] = useState(0);
    const [totalSaleVal, setTotalSaleVal] = useState(0);

    useEffect(() => {
        Promise.all([fetchPurchases(), fetchSales()]).then(([purchases, sales]) => {
            setTotalPurchaseVal(purchases.reduce((a, p) => a + (p.qty || 0) * (p.unit_cost || 0), 0));
            setTotalSaleVal(sales.reduce((a, s) => a + (s.qty || 0) * (s.unit_price || 0), 0));
        });
    }, []);

    const stats = {
        totalItems: inventory.length,
        lowStockItems: inventory.filter(item => item.qty_in_stock > 0 && item.qty_in_stock <= item.min_stock).length,
        outOfStock: inventory.filter(item => item.qty_in_stock <= 0).length,
        // Matches HTML: falls back to unit_price (MRP) when purchase_price (DTP) isn't set.
        stockVal: inventory.reduce((a, i) => a + (i.qty_in_stock || 0) * ((i.purchase_price || i.unit_price || 0)) * (1 + ((i.gst_pct || 0) / 100)), 0),
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
        }}>
            <StatCard
                label="Total Parts"
                value={stats.totalItems}
                color="#3b82f6"
                background="#f0f9ff"
            />
            <StatCard
                label="Stock Value (with GST)"
                value={`₹${stats.stockVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                color="#10b981"
                background="#f0fdf4"
                valueSize="16px"
            />
            <StatCard
                label="Total Purchase"
                value={`₹${totalPurchaseVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                color="#1d4ed8"
                background="#eff6ff"
                valueSize="16px"
            />
            <StatCard
                label="Total Sales"
                value={`₹${totalSaleVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                color="#7c3aed"
                background="#f5f3ff"
                valueSize="16px"
            />
            <StatCard
                label="Low / Out"
                value={`${stats.lowStockItems} / ${stats.outOfStock}`}
                color="#f59e0b"
                background="#fef3c7"
            />
        </div>
    );
}

function StatCard({
    label,
    value,
    color,
    background,
    valueSize = '28px',
}: {
    label: string;
    value: string | number;
    color: string;
    background: string;
    valueSize?: string;
}) {
    return (
        <div style={{
            background,
            padding: '14px',
            borderRadius: '8px',
            borderLeft: `4px solid ${color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                {label}
            </div>
            <div style={{
                fontSize: valueSize,
                fontWeight: '700',
                color,
            }}>
                {value}
            </div>
        </div>
    );
}