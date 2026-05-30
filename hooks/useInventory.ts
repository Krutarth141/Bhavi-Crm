import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem, StockMovement, TransactionData } from '@/types/inventory';

export const useInventory = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('item_name', { ascending: true });

            if (error) throw error;
            setInventory(data || []);
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('category')
                .not('category', 'is', null);

            if (error) throw error;

            const uniqueCategories = [...new Set((data || []).map(item => item.category).filter(Boolean))] as string[];
            setCategories(uniqueCategories.sort());
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchStockMovements = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_movements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error?.code === 'PGRST205') {
                console.debug('Stock movements table not available');
                setStockMovements([]);
                return;
            }

            if (error) throw error;
            setStockMovements(data || []);
        } catch (err) {
            console.warn('Stock movements not available:', err);
            setStockMovements([]);
        }
    };

    const saveInventoryItem = async (itemData: Partial<InventoryItem>, itemId?: string) => {
        try {
            // Normalize empty part_code to null (PostgreSQL treats null differently in unique constraints)
            if (itemData.part_code === '') {
                itemData.part_code = null as any;
            }
            if (itemData.item_code === '') {
                itemData.item_code = null as any;
            }

            // When creating a new item, check for duplicate part_code
            if (!itemId && itemData.part_code) {
                const { data, error: checkError } = await supabase
                    .from('inventory')
                    .select('id')
                    .eq('part_code', itemData.part_code)
                    .single();

                if (checkError?.code !== 'PGRST116' && data) {
                    // PGRST116 = no rows found (expected), any other result means duplicate exists
                    return { success: false, error: `⚠️ Part Code "${itemData.part_code}" already exists. Please use a different part code.` };
                }
            }

            // Also check for duplicate item_code
            if (!itemId && itemData.item_code) {
                const { data, error: checkError } = await supabase
                    .from('inventory')
                    .select('id')
                    .eq('item_code', itemData.item_code)
                    .single();

                if (checkError?.code !== 'PGRST116' && data) {
                    return { success: false, error: `⚠️ Item Code "${itemData.item_code}" already exists. Please use a different item code.` };
                }
            }

            if (itemId) {
                const { error } = await supabase
                    .from('inventory')
                    .update(itemData)
                    .eq('id', itemId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('inventory')
                    .insert([{ ...itemData, created_at: new Date().toISOString() }]);
                if (error) throw error;
            }
            await fetchInventory();
            await fetchCategories();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const saveStockTransaction = async (selectedItem: InventoryItem, transactionData: TransactionData, transactionType: 'in' | 'out' | 'sell') => {
        try {
            let newQty = selectedItem.qty_in_stock;

            if (transactionType === 'in') {
                newQty += transactionData.quantity;
            } else if (transactionType === 'out' || transactionType === 'sell') {
                newQty = Math.max(0, newQty - transactionData.quantity);
            }

            const { error } = await supabase
                .from('inventory')
                .update({ qty_in_stock: newQty, updated_at: new Date().toISOString() })
                .eq('id', selectedItem.id);

            if (error) throw error;

            // Log transaction
            try {
                await supabase.from('inventory_movements').insert({
                    inventory_id: selectedItem.id,
                    movement_type: transactionType,
                    quantity: transactionData.quantity,
                    note: transactionData.note || null,
                    supplier: transactionData.supplier || null,
                    invoice: transactionData.invoice || null,
                    customer: transactionData.customer || null,
                    sell_price: transactionData.sell_price || null,
                    created_at: new Date().toISOString(),
                });
            } catch (e) {
                console.warn('Could not log transaction:', e);
            }

            await fetchInventory();
            await fetchStockMovements();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteInventoryItem = async (itemId: string) => {
        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            await fetchInventory();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchCategories();
        fetchStockMovements();
    }, []);

    return {
        inventory,
        loading,
        categories,
        stockMovements,
        fetchInventory,
        fetchCategories,
        fetchStockMovements,
        saveInventoryItem,
        saveStockTransaction,
        deleteInventoryItem,
    };
};
