import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem, StockMovement, TransactionData } from '@/types/inventory';

// One report row of the Stock Tally Excel export / stock_tallies history
// record — mirrors HTML's reportRows shape exactly (index.html:8553-8560).
export interface TallyReportRow {
    'Part Code': string;
    'Item Name': string;
    'System Qty': number;
    'Physical Qty': number;
    'Variance': number;
    'Value Impact ₹': string;
}

export const useInventory = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

    // ── Stock Tally (index.html:8406-8587) ──────────────────────────────────
    // "With Engineers" per part (from eng_stock), and the cross-session draft
    // of in-progress physical counts (stock_tally_draft) — both loaded lazily
    // when the Stock Tally tab is opened (loadTallyData), matching HTML's
    // renderInvTallyTab().
    const [engStockByPart, setEngStockByPart] = useState<Record<string, number>>({});
    const [tallyDraft, setTallyDraft] = useState<Record<string, string>>({});
    const [tallyLoading, setTallyLoading] = useState(false);
    const tallyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const fetchInventory = async () => {
        try {
            setLoading(true);
            let all: InventoryItem[] = [];
            let from = 0;
            const PAGE = 1000;
            while (true) {
                const { data: page, error } = await supabase
                    .from('inventory')
                    .select('*')
                    .order('item_name', { ascending: true })
                    .range(from, from + PAGE - 1);
                if (error) throw error;
                all = all.concat(page || []);
                if (!page || page.length < PAGE) break;
                from += PAGE;
            }
            setInventory(all);
            checkPendingPartsAuto();
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    // Mirrors HTML's checkPendingPartsAuto(): once every requested spare on a
    // "Pending Parts" ticket is back in stock, auto-advance it to the repair
    // stage — fire-and-forget, matches HTML's non-blocking call site.
    const checkPendingPartsAuto = async () => {
        try {
            const { data: pendingTickets, error } = await supabase
                .from('tickets')
                .select('id, service_type, spares, timeline')
                .eq('status', 'Pending Parts');
            if (error || !pendingTickets) return;

            for (const t of pendingTickets) {
                const spares = t.spares || [];
                let allAvailable = true;
                for (const s of spares) {
                    if (s.requested && s.code) {
                        const { data: inv } = await supabase
                            .from('inventory')
                            .select('qty_in_stock')
                            .eq('part_code', s.code);
                        if (!inv || !inv.length || inv[0].qty_in_stock < (s.qty || 1)) {
                            allAvailable = false;
                            break;
                        }
                    }
                }
                if (allAvailable && spares.length) {
                    const newStatus = t.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site';
                    const tl = [...(t.timeline || []), { action: 'Parts Available — Auto Status Update', by: 'System', at: new Date().toISOString() }];
                    await supabase.from('tickets').update({ status: newStatus, timeline: tl, updated_at: new Date().toISOString() }).eq('id', t.id);
                }
            }
        } catch {
            // best-effort background check — never surface errors to the user
        }
    };

    const fetchCategories = async () => {
        try {
            let all: any[] = [];
            let from = 0;
            const PAGE = 1000;
            while (true) {
                const { data: page, error } = await supabase
                    .from('inventory')
                    .select('category')
                    .not('category', 'is', null)
                    .range(from, from + PAGE - 1);
                if (error) throw error;
                all = all.concat(page || []);
                if (!page || page.length < PAGE) break;
                from += PAGE;
            }

            const uniqueCategories = [...new Set(all.map(item => item.category).filter(Boolean))] as string[];
            setCategories(uniqueCategories.sort());
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchStockMovements = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setStockMovements((data || []).map((r: any) => ({
                id: r.id,
                inventory_id: r.inventory_id,
                movement_type: r.type,
                quantity: r.qty,
                note: r.note,
                created_at: r.created_at,
                created_by: r.done_by,
            })));
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
            if ((itemData.brand_id as any) === '') {
                itemData.brand_id = null;
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

    const saveStockTransaction = async (selectedItem: InventoryItem, transactionData: TransactionData, transactionType: 'in' | 'out' | 'sell', by: string) => {
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
                const noteParts = [transactionData.note, transactionData.supplier ? `Supplier: ${transactionData.supplier}` : '', transactionData.invoice ? `Invoice: ${transactionData.invoice}` : '', transactionData.customer ? `Customer: ${transactionData.customer}` : ''].filter(Boolean);
                await supabase.from('inventory_log').insert({
                    inventory_id: selectedItem.id,
                    type: transactionType === 'sell' ? 'out' : transactionType,
                    qty: transactionData.quantity,
                    note: noteParts.join(' | ') || null,
                    done_by: by,
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

    // Loads "With Engineers" totals (eng_stock, grouped by part) + restores
    // any in-progress physical counts saved earlier (stock_tally_draft) —
    // mirrors HTML's renderInvTallyTab() (index.html:8414-8428). Called by the
    // screen when the Stock Tally tab is opened, not on every screen mount.
    const loadTallyData = async () => {
        setTallyLoading(true);
        try {
            const { data, error } = await supabase.from('eng_stock').select('part_id, qty').order('owner');
            if (error) throw error;
            const totals: Record<string, number> = {};
            (data || []).forEach((r: any) => { totals[r.part_id] = (totals[r.part_id] || 0) + (r.qty || 0); });
            setEngStockByPart(totals);
        } catch {
            setEngStockByPart({});
        }
        try {
            let all: any[] = [];
            let from = 0;
            const PAGE = 1000;
            while (true) {
                const { data: page, error } = await supabase.from('stock_tally_draft').select('part_id, physical_qty').range(from, from + PAGE - 1);
                if (error) throw error;
                all = all.concat(page || []);
                if (!page || page.length < PAGE) break;
                from += PAGE;
            }
            const draft: Record<string, string> = {};
            all.forEach((d: any) => { draft[d.part_id] = String(d.physical_qty); });
            setTallyDraft(draft);
        } catch {
            // table not set up yet — tally still works, just without cross-session persistence
            setTallyDraft({});
        }
        setTallyLoading(false);
    };

    // Debounced draft save to DB (700ms per part, matching HTML's
    // _tallySaveTimers/tallySetPhysical at index.html:8493-8517) so typing
    // doesn't fire a request per keystroke; an empty value deletes the draft
    // row instead of writing physical_qty:NaN.
    const persistTallyDraft = async (partId: string, val: string, by: string) => {
        try {
            if (val === '' || val === undefined) {
                await supabase.from('stock_tally_draft').delete().eq('part_id', partId);
                return;
            }
            const qty = parseInt(val) || 0;
            const { data: existing } = await supabase.from('stock_tally_draft').select('id').eq('part_id', partId).maybeSingle();
            if (existing) {
                await supabase.from('stock_tally_draft').update({ physical_qty: qty, updated_by: by, updated_at: new Date().toISOString() }).eq('part_id', partId);
            } else {
                await supabase.from('stock_tally_draft').insert({ part_id: partId, physical_qty: qty, updated_by: by, updated_at: new Date().toISOString() });
            }
        } catch (e) {
            console.log('Tally draft save error (table may not be set up yet):', e);
        }
    };

    const setTallyPhysical = (partId: string, val: string, by: string) => {
        setTallyDraft(prev => ({ ...prev, [partId]: val }));
        clearTimeout(tallyTimers.current[partId]);
        tallyTimers.current[partId] = setTimeout(() => { persistTallyDraft(partId, val, by); }, 700);
    };

    // "Clear Counts" — wipes local + saved draft progress (index.html:8533-8538).
    const clearTallyDraft = async () => {
        Object.values(tallyTimers.current).forEach(t => clearTimeout(t));
        tallyTimers.current = {};
        setTallyDraft({});
        try {
            let all: any[] = [];
            let from = 0;
            const PAGE = 1000;
            while (true) {
                const { data: page, error } = await supabase.from('stock_tally_draft').select('id').range(from, from + PAGE - 1);
                if (error) throw error;
                all = all.concat(page || []);
                if (!page || page.length < PAGE) break;
                from += PAGE;
            }
            await Promise.all(all.map((r: any) => supabase.from('stock_tally_draft').delete().eq('id', r.id).then(() => undefined, () => undefined)));
        } catch {
            // best-effort — draft table may not exist
        }
    };

    // "Save Tally & Generate Report" (index.html:8539-8580) — proceeds as
    // long as at least one physical count was entered, even if every count
    // matches system stock (zero mismatches is still a valid, saveable tally
    // run). For every entry: builds one report row unconditionally; only a
    // non-zero variance additionally corrects inventory.qty_in_stock and logs
    // to inventory_log + eng_movements. Always records a stock_tallies
    // history row (best-effort — degrades silently if that table isn't set
    // up) and clears the entry's draft row once finalized.
    const saveStockTally = async (items: InventoryItem[], by: string): Promise<{ success: boolean; error?: string; reportRows?: TallyReportRow[]; countedCount?: number; mismatches?: number }> => {
        const entries = Object.keys(tallyDraft).filter(k => tallyDraft[k] !== '' && tallyDraft[k] !== undefined);
        if (!entries.length) {
            return { success: false, error: 'Enter at least one physical count before saving.' };
        }
        const today = new Date().toLocaleDateString('en-CA');
        const nowIso = new Date().toISOString();
        const reportRows: TallyReportRow[] = [];
        let mismatches = 0;
        try {
            for (const partId of entries) {
                const item = items.find(i => i.id === partId);
                if (!item) continue;
                const systemQty = item.qty_in_stock || 0;
                const physicalQty = parseInt(tallyDraft[partId]) || 0;
                const variance = physicalQty - systemQty;
                reportRows.push({
                    'Part Code': item.part_code || '',
                    'Item Name': item.item_name || '',
                    'System Qty': systemQty,
                    'Physical Qty': physicalQty,
                    'Variance': variance,
                    'Value Impact ₹': (variance * (item.purchase_price || item.unit_price || 0)).toFixed(0),
                });
                if (variance !== 0) {
                    mismatches++;
                    try { await supabase.from('inventory').update({ qty_in_stock: physicalQty, updated_at: nowIso }).eq('id', partId); } catch { /* best-effort, matches HTML's .catch(()=>{}) */ }
                    try {
                        await supabase.from('inventory_log').insert({
                            inventory_id: partId,
                            type: variance > 0 ? 'in' : 'out',
                            qty: Math.abs(variance),
                            note: `Weekly Stock Tally correction (${today}): System ${systemQty} → Physical ${physicalQty}`,
                            done_by: by,
                        });
                    } catch { /* best-effort */ }
                    try {
                        await supabase.from('eng_movements').insert({
                            type: 'ADJUST',
                            part_id: partId,
                            qty: Math.abs(variance),
                            from_owner: variance > 0 ? 'TALLY' : 'MAIN',
                            to_owner: variance > 0 ? 'MAIN' : 'TALLY',
                            notes: `Weekly Stock Tally (${today}): ${systemQty} → ${physicalQty}`,
                            created_by: by || 'Admin',
                        });
                    } catch { /* best-effort */ }
                }
                try { await supabase.from('stock_tally_draft').delete().eq('part_id', partId); } catch { /* best-effort */ }
            }
            try {
                await supabase.from('stock_tallies').insert({ tally_date: today, rows: reportRows, mismatches, done_by: by, created_at: nowIso });
            } catch {
                // optional history table — degrades silently if not set up yet
            }
            setTallyDraft({});
            await fetchInventory();
            return { success: true, reportRows, countedCount: entries.length, mismatches };
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
        // Stock Tally
        engStockByPart,
        tallyDraft,
        tallyLoading,
        loadTallyData,
        setTallyPhysical,
        clearTallyDraft,
        saveStockTally,
    };
};