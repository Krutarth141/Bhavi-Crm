import { InventoryItem } from '@/types/inventory';

interface InventoryStatsProps {
    inventory: InventoryItem[];
}

export function InventoryStats({ inventory }: InventoryStatsProps) {
    const stats = {
        totalItems: inventory.length,
        lowStockItems: inventory.filter(item => item.qty_in_stock > 0 && item.qty_in_stock <= item.min_stock).length,
        outOfStock: inventory.filter(item => item.qty_in_stock <= 0).length,
        totalValue: inventory.reduce((sum, item) => sum + (item.qty_in_stock * item.unit_price), 0),
        avgStockLevel: inventory.length > 0 ? Math.round(inventory.reduce((sum, item) => sum + item.qty_in_stock, 0) / inventory.length) : 0,
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
        }}>
            <StatCard
                label="Total Items"
                value={stats.totalItems}
                color="#3b82f6"
                background="#f0f9ff"
            />
            <StatCard
                label="Low Stock"
                value={stats.lowStockItems}
                color="#f59e0b"
                background="#fef3c7"
            />
            <StatCard
                label="Out of Stock"
                value={stats.outOfStock}
                color="#dc2626"
                background="#fee2e2"
            />
            <StatCard
                label="Avg Stock Level"
                value={stats.avgStockLevel}
                color="#10b981"
                background="#f0fdf4"
            />
            <StatCard
                label="Total Value ₹"
                value={`₹${stats.totalValue.toLocaleString()}`}
                color="#ec4899"
                background="#fce7f3"
                valueSize="16px"
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
