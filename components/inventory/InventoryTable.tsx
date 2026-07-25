import { InventoryItem } from '@/types/inventory';
import { inventoryStyles, inventoryColors } from '@/styles/inventoryStyles';

interface InventoryTableProps {
    filteredInventory: InventoryItem[];
    onViewItem: (item: InventoryItem) => void;
    onAdjustStock: (item: InventoryItem) => void;
    onEditItem: (item: InventoryItem) => void;
    onDeleteItem: (item: InventoryItem) => void;
    onOpenHistory: (item: InventoryItem) => void;
}

export function InventoryTable({
    filteredInventory,
    onViewItem,
    onAdjustStock,
    onEditItem,
    onDeleteItem,
    onOpenHistory
}: InventoryTableProps) {
    return (
        <div style={inventoryStyles.card}>
            <table style={inventoryStyles.table}>
                <thead>
                    <tr>
                        <th style={inventoryStyles.tableHeader}>Part Code</th>
                        <th style={inventoryStyles.tableHeader}>Item Name</th>
                        <th style={inventoryStyles.tableHeader}>Category</th>
                        <th style={{ ...inventoryStyles.tableHeader, textAlign: 'center' }}>Stock</th>
                        <th style={{ ...inventoryStyles.tableHeader, textAlign: 'center' }}>Min</th>
                        <th style={{ ...inventoryStyles.tableHeader, textAlign: 'right' }}>Price ₹</th>
                        <th style={{ ...inventoryStyles.tableHeader, textAlign: 'center' }}>GST %</th>
                        <th style={{ ...inventoryStyles.tableHeader, textAlign: 'center' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredInventory.map((item) => {
                        const isLowStock = item.qty_in_stock <= item.min_stock;
                        const isOutOfStock = item.qty_in_stock <= 0;
                        return (
                            <tr
                                key={item.id}
                                style={inventoryStyles.tableRow}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = inventoryColors.bg)}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = inventoryColors.card)}
                            >
                                <td style={inventoryStyles.tableCell}>
                                    <strong style={{ color: inventoryColors.primary }}>{item.part_code || item.item_code}</strong>
                                </td>
                                <td style={inventoryStyles.tableCell}>
                                    <span
                                        style={{ cursor: 'pointer', color: inventoryColors.primary, fontWeight: 600 }}
                                        onClick={() => onOpenHistory(item)}
                                        title="View history"
                                    >
                                        {item.item_name}
                                    </span>
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, fontSize: '12px', color: inventoryColors.textMuted }}>
                                    {item.category || '—'}
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, textAlign: 'center' }}>
                                    <strong style={{ color: isOutOfStock ? inventoryColors.danger : isLowStock ? inventoryColors.warning : inventoryColors.success }}>
                                        {item.qty_in_stock}
                                    </strong>
                                    {(item.warranty_qty || 0) > 0 && (
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                            🛒 {Math.max(0, item.qty_in_stock - (item.warranty_qty || 0))} + 🏭 {item.warranty_qty}
                                        </div>
                                    )}
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, textAlign: 'center', fontSize: '12px' }}>
                                    {item.min_stock}
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, textAlign: 'right', fontWeight: 600 }}>
                                    ₹{(item.unit_price || 0).toLocaleString()}
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, textAlign: 'center', fontSize: '12px' }}>
                                    {item.gst_pct || 18}%
                                </td>
                                <td style={{ ...inventoryStyles.tableCell, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                        <ActionButton emoji="👁" onClick={() => onViewItem(item)} color="#4338ca" bgColor="#e0e7ff" />
                                        <ActionButton emoji="📋" onClick={() => onOpenHistory(item)} color="#1d4ed8" bgColor="#dbeafe" />
                                        <ActionButton emoji="📦" onClick={() => onAdjustStock(item)} color="#065f46" bgColor="#dcfce7" />
                                        <ActionButton emoji="✏️" onClick={() => onEditItem(item)} color="#92400e" bgColor="#fef3c7" />
                                        <ActionButton emoji="🗑" onClick={() => onDeleteItem(item)} color="#dc2626" bgColor="#fee2e2" />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ActionButton({
    emoji,
    onClick,
    color,
    bgColor
}: {
    emoji: string;
    onClick: () => void;
    color: string;
    bgColor: string;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 10px',
                fontSize: '12px',
                background: bgColor,
                color,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 600,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
            {emoji}
        </button>
    );
}
