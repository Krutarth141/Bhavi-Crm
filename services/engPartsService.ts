import { supabase } from '@/lib/supabase';
import { EngMovement } from '@/types/engParts';
import { InventoryItem } from '@/types/inventory';

// ─── Internal helpers ──────────────────────────────────────────────────────────

const engStockAdjust = async (owner: string, partId: string, delta: number) => {
    const { data: existing } = await supabase.from('eng_stock').select('id, qty').eq('owner', owner).eq('part_id', partId).maybeSingle();
    const newQty = Math.max(0, (existing?.qty || 0) + delta);
    if (existing) {
        await supabase.from('eng_stock').update({ qty: newQty, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
        await supabase.from('eng_stock').insert([{ owner, part_id: partId, qty: newQty }]);
    }
};

const invQtyAdjust = async (partId: string, delta: number) => {
    const { data: item } = await supabase.from('inventory').select('qty_in_stock').eq('id', partId).single();
    const newQty = Math.max(0, (item?.qty_in_stock || 0) + delta);
    await supabase.from('inventory').update({ qty_in_stock: newQty, updated_at: new Date().toISOString() }).eq('id', partId);
};

const logMovement = async (m: Omit<EngMovement, 'id' | 'created_at'>) => {
    await supabase.from('eng_movements').insert([m]);
};

export const fetchEngMovements = async (): Promise<EngMovement[]> => {
    try {
        const { data, error } = await supabase.from('eng_movements').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchEngMovements:', err); return []; }
};

// ─── Issue parts to engineer (office → field) ─────────────────────────────────

export const advancePendingEngineerStockTickets = async (
    engName: string, partId: string, updatedBy: string, requireAllParts: boolean, actionLabel: string
) => {
    try {
        const { data: invItem } = await supabase.from('inventory').select('part_code').eq('id', partId).limit(1).maybeSingle();
        const partCode = invItem?.part_code;
        if (!partCode) return;
        const { data: pendingTickets } = await supabase
            .from('tickets')
            .select('id, spares, timeline, service_type')
            .eq('assigned_name', engName)
            .eq('status', 'Pending Engineer Stock');
        for (const t of (pendingTickets || [])) {
            const spares = t.spares || [];
            if (!spares.some((s: any) => s.code === partCode)) continue;
            if (requireAllParts) {
                const missing = await missingBagParts(engName, spares);
                if (missing.length) continue;
            }
            const newStatus = t.service_type === 'Carry In' ? 'Pending Repair Carry In' : 'Pending Repair On Site';
            const note = requireAllParts
                ? `Part ${partCode} issued to engineer bag via approved request. All required parts now in bag.`
                : `Part ${partCode} issued to engineer bag. Call ready to proceed.`;
            const tl = [...(t.timeline || []), { action: `${actionLabel} → ${newStatus}`, by: updatedBy, at: new Date().toISOString(), note }];
            await supabase.from('tickets').update({ status: newStatus, timeline: tl, updated_at: new Date().toISOString() }).eq('id', t.id);
        }
    } catch (e) { console.warn('Auto-status update error:', e); }
};

export const issueToEngineer = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string; by?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;
        await invQtyAdjust(part_id, -qty);
        await engStockAdjust(eng_name, part_id, qty);
        await logMovement({ type: 'ISSUE', part_id, qty, from_owner: 'MAIN', to_owner: eng_name, notes: note || null });
        await advancePendingEngineerStockTickets(eng_name, part_id, params.by || 'Admin', false, 'Parts Issued by Admin');
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Record usage (consumed on a job) ─────────────────────────────────────────

export const recordUsage = async (params: {
    part_id: string; eng_name: string; qty: number; ticket_id?: string; note?: string;
    warranty?: boolean; by?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note, warranty } = params;
        const jobSheet = (params.ticket_id || '').trim();
        if (warranty && !jobSheet) {
            return { success: false, error: 'SE Call ID is required for warranty parts.\n\nThis is needed to track the part return from company.' };
        }
        await engStockAdjust(eng_name, part_id, -qty);
        await logMovement({
            type: 'USE', part_id, qty, from_owner: eng_name, to_owner: null,
            job_sheet: jobSheet || null, notes: note || null,
            warranty: !!warranty, warranty_status: warranty ? 'PENDING' : null,
        } as any);

        if (warranty && jobSheet) {
            try {
                const trackKey = jobSheet.split('/').pop()!.trim().toUpperCase();
                const { data: matchTickets } = await supabase.from('tickets')
                    .select('id, spares, se_call_id, timeline').ilike('se_call_id', `%${trackKey}%`).limit(10);
                const matchTkt = (matchTickets || []).find((t: any) => {
                    const raw = (t.se_call_id || '').trim().toUpperCase();
                    return raw === trackKey || raw.endsWith('/' + trackKey) || raw.endsWith(trackKey);
                });
                if (matchTkt) {
                    const { data: invItem } = await supabase.from('inventory').select('*').eq('id', part_id).maybeSingle();
                    const existingSpares = matchTkt.spares || [];
                    const alreadyHas = existingSpares.some((s: any) => s.code && invItem && s.code === invItem.part_code);
                    if (!alreadyHas) {
                        const newSpare = {
                            code: invItem?.part_code || part_id, name: invItem?.item_name || 'Part',
                            qty, price: parseFloat(invItem?.unit_price) || 0,
                            gst_pct: invItem?.gst_pct != null ? parseFloat(String(invItem.gst_pct)) : 0,
                            requested: true, stock_deducted: false, warranty_supplied: true,
                        };
                        const linkTl = [...(matchTkt.timeline || []), {
                            action: 'Part Auto-Linked (Eng Use)', by: params.by || 'Admin', at: new Date().toISOString(),
                            note: `Part: ${newSpare.code || ''} ${newSpare.name || ''} × ${qty} | SE Call ID: ${jobSheet}`,
                        }];
                        await supabase.from('tickets').update({
                            spares: [...existingSpares, newSpare], timeline: linkTl, updated_at: new Date().toISOString(),
                        }).eq('id', matchTkt.id).then(() => undefined, () => undefined);
                    }
                }
            } catch (e) { console.log('Auto-link to ticket failed:', e); }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Engineer returns unused part → back to office stock ─────────────────────

export const engineerReturn = async (params: {
    part_id: string; eng_name: string; qty: number; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;
        await engStockAdjust(eng_name, part_id, -qty);
        await invQtyAdjust(part_id, qty);
        await logMovement({ type: 'ENG_RETURN', part_id, qty, from_owner: eng_name, to_owner: 'MAIN', notes: note || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// ─── Warranty return (Canon receives the part back) ───────────────────────────

export const warrantyReturn = async (params: {
    part_id: string; qty: number; job_sheet: string; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, qty, note } = params;
        const jobSheetRaw = params.job_sheet.trim().toUpperCase();
        if (!jobSheetRaw) {
            return { success: false, error: 'SE Call ID is required to match the warranty return.' };
        }
        const trackKey = jobSheetRaw.split('/').pop()!.trim();

        const { data: dup } = await supabase.from('eng_movements').select('id, qty, created_at')
            .eq('type', 'WARRANTY_RETURN').eq('warranty', true).eq('job_sheet', trackKey).eq('part_id', part_id);
        if (dup && dup.length) {
            const d = dup[0] as any;
            const existingDate = d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '-';
            const proceed = confirm(
                `A warranty return entry already exists for this SE Call ID (${jobSheetRaw}) and part.\n\n`
                + `Existing: Qty ${d.qty} on ${existingDate}.\n\nAdd another return entry anyway?`
            );
            if (!proceed) return { success: false, error: 'Cancelled' };
        }

        await invQtyAdjust(part_id, qty);
        await logMovement({
            type: 'WARRANTY_RETURN', part_id, qty, from_owner: 'COMPANY', to_owner: 'MAIN',
            job_sheet: trackKey, se_call_id_full: jobSheetRaw, warranty: true, notes: note || null,
        } as any);

        try {
            const { data: useEntries } = await supabase.from('eng_movements').select('id, qty, warranty_status')
                .eq('type', 'USE').eq('warranty', true).eq('job_sheet', trackKey).eq('part_id', part_id);
            const { data: retEntries } = await supabase.from('eng_movements').select('qty')
                .eq('type', 'WARRANTY_RETURN').eq('job_sheet', trackKey).eq('part_id', part_id);
            const usedQty = (useEntries || []).reduce((a: number, m: any) => a + (m.qty || 1), 0);
            const totalReceived = (retEntries || []).reduce((a: number, m: any) => a + (m.qty || 1), 0);
            const pendingEntries = (useEntries || []).filter((m: any) => ['PENDING', 'PARTIAL'].includes(m.warranty_status));
            if (pendingEntries.length) {
                const newStatus = totalReceived >= usedQty ? 'RECEIVED' : 'PARTIAL';
                const patch: any = { warranty_status: newStatus, warranty_received_qty: totalReceived };
                if (newStatus === 'RECEIVED') patch.warranty_received_at = new Date().toISOString();
                for (const ue of pendingEntries) {
                    await supabase.from('eng_movements').update(patch).eq('id', (ue as any).id).then(() => undefined, () => undefined);
                }
            }
            const extraQty = qty - usedQty;
            if (extraQty > 0) {
                const { data: invRow } = await supabase.from('inventory').select('warranty_qty').eq('id', part_id).maybeSingle();
                if (invRow) {
                    await supabase.from('inventory').update({
                        warranty_qty: (invRow.warranty_qty || 0) + extraQty, updated_at: new Date().toISOString(),
                    }).eq('id', part_id).then(() => undefined, () => undefined);
                }
            }
        } catch (e) { console.log('Auto-match err:', e); }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const checkDirectWarrantyDuplicate = async (jobSheet: string, partId: string): Promise<boolean> => {
    const trackKey = jobSheet.trim().toUpperCase().split('/').pop()!.trim();
    const { data } = await supabase.from('eng_movements').select('id').eq('type', 'USE').eq('warranty', true).eq('job_sheet', trackKey).eq('part_id', partId);
    return !!(data && data.length);
};

export const directWarrantyIssue = async (params: {
    part_id: string; eng_name: string; qty: number; job_sheet: string; note?: string;
}): Promise<{ success: boolean; error?: string }> => {
    try {
        const { part_id, eng_name, qty, note } = params;
        const trackKey = params.job_sheet.trim().toUpperCase().split('/').pop()!.trim();

        const { data: invItem } = await supabase.from('inventory').select('*').eq('id', part_id).single();
        const newQty = (invItem?.qty_in_stock || 0) + qty;
        const newWarrantyQty = (invItem?.warranty_qty || 0) + qty;
        await supabase.from('inventory').update({ qty_in_stock: newQty, warranty_qty: newWarrantyQty, updated_at: new Date().toISOString() }).eq('id', part_id);

        await logMovement({
            type: 'WARRANTY_DIRECT_IN', part_id, qty,
            from_owner: 'COMPANY (Canon Warranty)', to_owner: eng_name,
            job_sheet: trackKey, warranty: true, warranty_status: 'WITH_ENGINEER',
            notes: `Direct Canon dispatch to ${eng_name}${note ? ' | ' + note : ''}`,
        });

        try {
            const { data: matchTickets } = await supabase.from('tickets').select('id, spares, se_call_id').ilike('se_call_id', `%${trackKey}%`).limit(10);
            const matchTkt = (matchTickets || []).find((t: any) => {
                const raw = (t.se_call_id || '').trim().toUpperCase();
                return raw === trackKey || raw.endsWith('/' + trackKey) || raw.endsWith(trackKey);
            });
            if (matchTkt) {
                const existingSpares = matchTkt.spares || [];
                const alreadyHas = existingSpares.some((s: any) => s.code && s.code === invItem?.part_code);
                if (!alreadyHas) {
                    const newSpare = {
                        code: invItem?.part_code || part_id, name: invItem?.item_name || 'Part',
                        qty, price: parseFloat(invItem?.unit_price) || 0,
                        gst_pct: invItem?.gst_pct != null ? parseFloat(invItem.gst_pct) : 0,
                        requested: true, stock_deducted: false, warranty_supplied: true,
                    };
                    await supabase.from('tickets').update({ spares: [...existingSpares, newSpare], updated_at: new Date().toISOString() }).eq('id', matchTkt.id);
                }
            }
        } catch (autoErr) {
            console.log('Auto-link to ticket failed:', autoErr);
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export interface WarrantyTicketRow {
    ticket_id: string;
    cname?: string;
    model?: string;
    call_type?: string;
    assigned_name?: string;
    se_call_id?: string;
    spare_code: string;
    spare_name: string;
    qty: number;
    status?: string;
    created_at: string;
}

export const fetchWarrantyPending = async (
    showAll: boolean, inventory: InventoryItem[]
): Promise<{ used: EngMovement[]; ticketRows: WarrantyTicketRow[] }> => {
    try {
        let query = supabase.from('eng_movements').select('*').eq('warranty', true).in('type', ['USE', 'WARRANTY_DIRECT_IN']).order('created_at', { ascending: false });
        if (!showAll) query = query.neq('warranty_status', 'RECEIVED');
        const { data: used, error } = await query;
        if (error) throw error;

        const { data: returned } = await supabase.from('eng_movements').select('*').eq('warranty', true).eq('type', 'WARRANTY_RETURN').order('created_at', { ascending: false });

        let wTickets: any[] = [];
        {
            let from = 0;
            const PAGE = 1000;
            while (true) {
                const { data: page } = await supabase.from('tickets').select('id, cname, model, call_type, assigned_name, se_call_id, spares, status, created_at').in('call_type', ['Warranty', 'Warranty Repeat', 'AMC']).order('created_at', { ascending: false }).range(from, from + PAGE - 1);
                wTickets = wTickets.concat(page || []);
                if (!page || page.length < PAGE) break;
                from += PAGE;
            }
        }

        const usedList = used || [];
        const returnedList = returned || [];
        const ticketRows: WarrantyTicketRow[] = [];

        const matchesPart = (m: EngMovement, s: any) => {
            if (!m.part_id) return false;
            const inv = inventory.find(x => x.id === m.part_id);
            return !!inv && (inv.part_code === s.code || inv.item_name === s.name);
        };

        (wTickets || []).forEach((t: any) => {
            let spares = t.spares || [];
            if (typeof spares === 'string') { try { spares = JSON.parse(spares); } catch { spares = []; } }
            spares.forEach((s: any) => {
                if (!s.code) return;
                const trackKey = t.se_call_id ? t.se_call_id.split('/').pop().trim() : '';
                const matchesJob = (m: EngMovement) => m.job_sheet === trackKey || m.job_sheet === t.id || m.se_call_id_full === t.se_call_id;
                const alreadyTracked = usedList.some(m => matchesJob(m) && matchesPart(m, s));
                const alreadyReturned = !showAll && returnedList.some(m => matchesJob(m) && matchesPart(m, s));
                if (!alreadyTracked && !alreadyReturned) {
                    ticketRows.push({
                        ticket_id: t.id, cname: t.cname, model: t.model, call_type: t.call_type,
                        assigned_name: t.assigned_name, se_call_id: t.se_call_id || '',
                        spare_code: s.code, spare_name: s.name || s.code, qty: s.qty || 1,
                        status: t.status, created_at: t.created_at,
                    });
                }
            });
        });

        return { used: usedList, ticketRows };
    } catch (err) {
        console.error('fetchWarrantyPending:', err);
        return { used: [], ticketRows: [] };
    }
};

export const markWarrantyReceived = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        await supabase.from('eng_movements').update({ warranty_status: 'RECEIVED', warranty_received_at: new Date().toISOString() }).eq('id', id);
    }
};

// ─── Shared physical-stock checks (index.html:11474-11501) ────────────────────
// Used by the engineer close-guard (My Calls Update), the Approve-Estimate
// routing, and the Part Indent routing so all three agree on where a part is.

// On Site: a part must physically be in the assigned engineer's own bag
// (eng_stock). Returns the list of still-missing "CODE Name" strings
// (empty = fully stocked). Mirrors HTML's _missingBagParts().
export const missingBagParts = async (
    engineerName: string, spares: TicketSpareLike[]
): Promise<string[]> => {
    const needed = (spares || []).filter((s) => s.code);
    if (!needed.length) return [];
    let stock: { part_id: string; qty: number }[] = [];
    try {
        const { data } = await supabase.from('eng_stock').select('part_id, qty').eq('owner', engineerName);
        stock = (data as any) || [];
    } catch { stock = []; }
    const missing: string[] = [];
    for (const s of needed) {
        let pid: string | null = null;
        try {
            const { data } = await supabase.from('inventory').select('id').eq('part_code', s.code!).limit(1).maybeSingle();
            pid = data?.id ?? null;
        } catch { pid = null; }
        const have = pid ? (stock.find((x) => x.part_id === pid)?.qty || 0) : 0;
        if (have < (s.qty || 1)) missing.push(`${s.code} ${s.name || ''}`.trim());
    }
    return missing;
};

// Carry In has no personal engineer-bag concept — the device is repaired at
// the office, so the part just needs to be in COMPANY inventory.
// Mirrors HTML's _missingCompanyStockParts().
export const missingCompanyStockParts = async (spares: TicketSpareLike[]): Promise<string[]> => {
    const needed = (spares || []).filter((s) => s.code);
    if (!needed.length) return [];
    const missing: string[] = [];
    for (const s of needed) {
        let have = 0;
        try {
            const { data } = await supabase.from('inventory').select('qty_in_stock').eq('part_code', s.code!).limit(1).maybeSingle();
            have = data?.qty_in_stock || 0;
        } catch { have = 0; }
        if (have < (s.qty || 1)) missing.push(`${s.code} ${s.name || ''}`.trim());
    }
    return missing;
};

export interface TicketSpareLike { code?: string; name?: string; qty?: number }

// Fresh lookup of the master Inventory is_consumable flag for a set of part
// codes. HTML reads this off the in-memory allInventory cache
// (isConsumableCode, index.html:6114) — there is no such cache here, so the
// codes are fetched on demand. Returns UPPERCASED codes flagged consumable.
export const fetchConsumableCodes = async (codes: string[]): Promise<Set<string>> => {
    const uniq = Array.from(new Set(codes.filter(Boolean)));
    if (!uniq.length) return new Set();
    try {
        const { data } = await supabase.from('inventory').select('part_code, is_consumable').in('part_code', uniq);
        return new Set((data || []).filter((r: any) => r.is_consumable).map((r: any) => String(r.part_code).toUpperCase()));
    } catch { return new Set(); }
};