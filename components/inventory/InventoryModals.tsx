'use client';

import { InventoryItem, TransactionData } from '@/types/inventory';
import Modal from '@/components/Modal';

interface InventoryModalsProps {
    showAddForm: boolean;
    showViewModal: boolean;
    showStockTransactionModal: boolean;
    selectedItem: InventoryItem | null;
    formData: any;
    transactionData: TransactionData;
    transactionType: 'in' | 'out' | 'sell';
    submitting: boolean;
    onCloseAddForm: () => void;
    onCloseViewModal: () => void;
    onCloseStockModal: () => void;
    onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onTransactionChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onTransactionTypeChange: (type: 'in' | 'out' | 'sell') => void;
    onSaveForm: (e: React.FormEvent) => Promise<void>;
    onSaveTransaction: () => Promise<void>;
}

export function InventoryModals({
    showAddForm,
    showViewModal,
    showStockTransactionModal,
    selectedItem,
    formData,
    transactionData,
    transactionType,
    submitting,
    onCloseAddForm,
    onCloseViewModal,
    onCloseStockModal,
    onFormChange,
    onTransactionChange,
    onTransactionTypeChange,
    onSaveForm,
    onSaveTransaction,
}: InventoryModalsProps) {
    return (
        <>
            {/* Add/Edit Inventory Modal */}
            <Modal
                isOpen={showAddForm}
                title={selectedItem ? '✏️ Edit Item' : '➕ Add New Part'}
                onClose={onCloseAddForm}
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={onCloseAddForm}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={onSaveForm} disabled={submitting}>
                            {submitting ? 'Saving...' : '💾 Save Item'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={onSaveForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                        <label>Item Name *</label>
                        <input
                            type="text"
                            name="item_name"
                            value={formData.item_name || ''}
                            onChange={onFormChange}
                            placeholder="Item name"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Part Code</label>
                        <input
                            type="text"
                            name="part_code"
                            value={formData.part_code || ''}
                            onChange={onFormChange}
                            placeholder="OEM part code"
                        />
                    </div>
                    <div className="form-group">
                        <label>Item Code</label>
                        <input
                            type="text"
                            name="item_code"
                            value={formData.item_code || ''}
                            onChange={onFormChange}
                            placeholder="IC-001"
                        />
                    </div>
                    <div className="form-group">
                        <label>Category / Model No</label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category || ''}
                            onChange={onFormChange}
                            placeholder="Electronics, Spare Parts"
                        />
                    </div>
                    <div className="form-group">
                        <label>Qty in Stock</label>
                        <input
                            type="number"
                            name="qty_in_stock"
                            value={formData.qty_in_stock || 0}
                            onChange={onFormChange}
                            min="0"
                            step="1"
                        />
                    </div>
                    <div className="form-group">
                        <label>Min Stock Level</label>
                        <input
                            type="number"
                            name="min_stock"
                            value={formData.min_stock || 0}
                            onChange={onFormChange}
                            min="0"
                            step="1"
                        />
                    </div>
                    <div className="form-group">
                        <label>Unit Price ₹</label>
                        <input
                            type="number"
                            name="unit_price"
                            value={formData.unit_price || 0}
                            onChange={onFormChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label>GST %</label>
                        <input
                            type="number"
                            name="gst_pct"
                            value={formData.gst_pct || 18}
                            onChange={onFormChange}
                            min="0"
                            max="100"
                            step="0.01"
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={onFormChange}
                            placeholder="Item description"
                            rows={2}
                        />
                    </div>
                </form>
            </Modal>

            {/* View Item Modal */}
            <Modal
                isOpen={showViewModal}
                title="ℹ️ Item Details"
                onClose={onCloseViewModal}
                footer={
                    <button className="btn btn-outline" onClick={onCloseViewModal}>
                        Close
                    </button>
                }
            >
                {selectedItem && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <DetailRow label="Item Code" value={selectedItem.item_code} />
                            <DetailRow label="Part Code" value={selectedItem.part_code || '—'} />
                            <DetailRow label="Item Name" value={selectedItem.item_name} />
                            <DetailRow label="Category" value={selectedItem.category || '—'} />
                            <DetailRow label="Stock Qty" value={selectedItem.qty_in_stock} />
                            <DetailRow label="Min Stock" value={selectedItem.min_stock} />
                            <DetailRow label="Unit Price" value={`₹${(selectedItem.unit_price || 0).toLocaleString()}`} />
                            <DetailRow label="Brand" value={selectedItem.brand_id || '—'} />
                        </div>
                        <div>
                            <strong>Description:</strong> {selectedItem.description || '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            <strong>Updated:</strong> {new Date(selectedItem.updated_at).toLocaleString()}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Stock Transaction Modal */}
            <Modal
                isOpen={showStockTransactionModal}
                title="📦 Stock Update"
                onClose={onCloseStockModal}
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={onCloseStockModal}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={onSaveTransaction} disabled={submitting}>
                            {submitting ? 'Saving...' : '💾 Save'}
                        </button>
                    </div>
                }
            >
                {selectedItem && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {/* Part Info Card */}
                        <div
                            style={{
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                fontSize: '13px',
                            }}
                        >
                            <strong>{selectedItem.item_name}</strong> ({selectedItem.part_code || selectedItem.item_code})
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Current: <strong style={{ color: selectedItem.qty_in_stock > 0 ? '#065f46' : '#dc2626' }}>
                                    {selectedItem.qty_in_stock}
                                </strong>{' '}
                                | Min: {selectedItem.min_stock} | Price: ₹{selectedItem.unit_price}
                            </div>
                        </div>

                        {/* Transaction Type Tabs */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '0',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                marginBottom: '12px',
                            }}
                        >
                            {(['in', 'out', 'sell'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => onTransactionTypeChange(type)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        border: 'none',
                                        background:
                                            transactionType === type
                                                ? type === 'in'
                                                    ? '#dcfce7'
                                                    : type === 'sell'
                                                        ? '#fef3c7'
                                                        : '#fee2e2'
                                                : '#f3f4f6',
                                        color:
                                            transactionType === type
                                                ? type === 'in'
                                                    ? '#065f46'
                                                    : type === 'sell'
                                                        ? '#92400e'
                                                        : '#dc2626'
                                                : '#6b7280',
                                        cursor: 'pointer',
                                        borderRight: type !== 'sell' ? '1px solid #e2e8f0' : undefined,
                                    }}
                                >
                                    {type === 'in' ? '⬇️ Stock IN' : type === 'out' ? '⬆️ Stock OUT' : '💰 Sell'}
                                </button>
                            ))}
                        </div>

                        {/* Common Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div className="form-group">
                                <label>Quantity *</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={transactionData.quantity}
                                    onChange={onTransactionChange}
                                    min="1"
                                    step="1"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={transactionData.date}
                                    onChange={onTransactionChange}
                                />
                            </div>
                        </div>

                        {/* Stock In Fields */}
                        {transactionType === 'in' && (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div className="form-group">
                                        <label>Supplier / Dealer</label>
                                        <input
                                            type="text"
                                            name="supplier"
                                            value={transactionData.supplier}
                                            onChange={onTransactionChange}
                                            placeholder="e.g. Rashmi Traders"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Invoice No</label>
                                        <input
                                            type="text"
                                            name="invoice"
                                            value={transactionData.invoice}
                                            onChange={onTransactionChange}
                                            placeholder="e.g. INV-001"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Note</label>
                                    <input
                                        type="text"
                                        name="note"
                                        value={transactionData.note}
                                        onChange={onTransactionChange}
                                        placeholder="e.g. New stock arrived"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Stock Out Fields */}
                        {transactionType === 'out' && (
                            <div className="form-group">
                                <label>Purpose / Note</label>
                                <input
                                    type="text"
                                    name="note"
                                    value={transactionData.note}
                                    onChange={onTransactionChange}
                                    placeholder="e.g. Used in ticket #1234, Damaged"
                                />
                            </div>
                        )}

                        {/* Stock Sell Fields */}
                        {transactionType === 'sell' && (
                            <div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '10px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    <div className="form-group">
                                        <label>Customer Name *</label>
                                        <input
                                            type="text"
                                            name="customer"
                                            value={transactionData.customer}
                                            onChange={onTransactionChange}
                                            placeholder="e.g. Rajesh Patel"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Invoice No</label>
                                        <input
                                            type="text"
                                            name="invoice"
                                            value={transactionData.invoice}
                                            onChange={onTransactionChange}
                                            placeholder="e.g. INV-2026-001"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>Selling Price / Unit ₹</label>
                                        <input
                                            type="number"
                                            name="sell_price"
                                            value={transactionData.sell_price}
                                            onChange={onTransactionChange}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Note</label>
                                        <input
                                            type="text"
                                            name="note"
                                            value={transactionData.note}
                                            onChange={onTransactionChange}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}

function DetailRow({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <strong>{label}:</strong> {value}
        </div>
    );
}
