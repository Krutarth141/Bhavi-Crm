import { supabase } from '@/lib/supabase';
import { EngineerTicket, PhotoSlot, PaymentConfirmData } from '@/types/engineerUpdate';
import { TicketSpare, isChargeableSpare } from '@/types/tickets';
import { notifyTicketClosed } from './telegramNotify';
import { missingBagParts, missingCompanyStockParts, fetchConsumableCodes } from './engPartsService';
import { saveWorkLog, saveLocationEvent } from './myCallsService';

const TICKET_COLUMNS = 'id, job_sheet, cname, mobile, model, serial, brand_name, problem, fault_code, call_type, service_type, warranty_coverage, warranty_claim_pending, assigned_name, status, service_charges, labor, final_charges, charges_note, payment_mode, work_done, jobsheet_photo, attachments, address, area, city, pin, timeline, spares, rerepair, rerepair_foc, created_at, updated_at, visit_in, visit_date, visit_out, meter_start, meter_end, se_call_id, page_count, other_charge, wc_type';

const PHOTO_BUCKET = 'product-images';

// Mirrors HTML's uploadCrmPhoto() (index.html:25292) — same bucket, same
// public-URL shape, expressed through the Supabase JS storage client the rest
// of this port already uses (see kmTrackingService.uploadKmPhoto).
export const uploadCrmPhoto = async (dataUrl: string, fname: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(fname, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(fname).data.publicUrl;
};

export const fetchEngineerTickets = async (
    engineerName: string,
    statusFilter: 'active' | 'closed' | 'all'
): Promise<EngineerTicket[]> => {
    try {
        let query = supabase
            .from('tickets')
            .select(TICKET_COLUMNS)
            .order('updated_at', { ascending: false })
            .limit(100);

        if (engineerName) query = query.eq('assigned_name', engineerName);

        if (statusFilter === 'active') {
            query = query
                .neq('status', 'Closed')
                .neq('status', 'Call Cancel')
                .neq('status', 'Customer Reject');
        } else if (statusFilter === 'closed') {
            query = query.in('status', ['Closed', 'Call Cancel', 'Customer Reject']);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('fetchEngineerTickets:', err);
        return [];
    }
};

// Re-fetches a single ticket after a Visit/Work/Hold panel action so the open
// Update modal can reflect the fresh timeline without a full list reload.
export const fetchTicketById = async (id: string): Promise<EngineerTicket | null> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select(TICKET_COLUMNS)
            .eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('fetchTicketById:', err);
        return null;
    }
};

export interface UpdateExtra {
    seCallId?: string;
    pageCount?: string;
    pageCountSkip?: boolean;
    pageCountSkipReason?: string;
    otherCharge?: string;
    visitDate?: string;
    visitIn?: string;
    visitOut?: string;
    meterStart?: string;
    meterEnd?: string;
    mscCenter?: string;
    // ── Group 2 additions ───────────────────────────────────────────────────
    /** "Action Taken" — the work_done column. Required on a status change. */
    workDone?: string;
    /** Spares list as edited in the modal (removals included) — persisted to tickets.spares. */
    spares?: TicketSpare[];
    /** Attachments: slot 0 = Job Sheet, slots 1-2 = extra photos. */
    photos?: (PhotoSlot | null)[];
    /** Result of the Payment Confirmation popup, when one was shown. */
    payment?: PaymentConfirmData;
    /** Engineer login code (eng_id), for the auto work-log + location event. */
    engId?: string;
    /** 'WC' | 'Engineer' — member_role on the auto work-log row. */
    memberRole?: string;
    // ── Product Condition (index.html:7302-7316) ────────────────────────────
    /** condition_type — Normal / Physical Damage / Liquid-Leakage / Burnt / Missing Parts / Other. */
    conditionType?: string;
    /** Up to 3 condition photos → condition_photos (uploaded like the Job Sheet photos). */
    conditionPhotos?: (PhotoSlot | null)[];
    /**
     * Reason the engineer hand-edited Time In / Time Out away from the
     * auto-filled value. Logged as a 'Manual Time Update' timeline entry
     * (index.html:7809-7812); the caller enforces that it is non-empty.
     */
    manualTimeReason?: string;
}

const WARRANTY_CALL_TYPES = ['Warranty', 'Warranty Repeat', 'AMC'];

const isWarrantyCall = (t: { call_type?: string }) => WARRANTY_CALL_TYPES.includes(t.call_type || '');
const isOutOfCoverage = (t: EngineerTicket) => t.warranty_coverage === 'Out of Coverage' || t.out_of_coverage === true;

// Re-Repair FOC: the return visit for the same fault is free of service charge
// (index.html:7850). rerepair is a boolean in this schema; HTML also accepted
// the legacy string 'Yes', so both are handled.
const isRepeatFoc = (t: EngineerTicket) =>
    t.rerepair_foc === true || ((t.rerepair === true || (t.rerepair as unknown) === 'Yes') && !Number(t.service_charges));

// ─── Close guards (index.html:7710-7803) ─────────────────────────────────────
// Run BEFORE anything is written, so a blocked close leaves the ticket
// completely untouched. Returns null when the update may proceed.
//
// ⚠️ NOT ADMIN-CONFIGURABLE (known gap vs. HTML).
// In index.html every one of these close-form checks is wrapped in
// isFieldRequired('call_close', <field>) (index.html:12009-12041), which reads
// an admin-editable override map stored in the `company_info.field_rules`
// JSON column (`{ call_close: { action_taken: 'required'|'optional', … } }`,
// loaded by loadFieldRules(), edited in Settings → renderFieldRulesTab).
// This port reads company_info.field_rules NOWHERE, so what is hard-coded
// below is HTML's built-in DEFAULT for each field, not an admin's choice:
//   action_taken      → required   (default 'required')
//   jobsheet_photo    → required, CSP calls only (default 'required')
//   fault_code        → not enforced (default 'optional')
//   extra_attachments → not enforced (default 'optional')
//   se_call_id        → not enforced (default 'optional'; the modal marks the
//                       field with a * for warranty calls the way HTML's UI
//                       does, but HTML likewise does not block the close
//                       unless an admin flipped the rule to 'required')
//   km_arrival_photo  → default 'required', enforced in the KM/arrival flow
// Porting the override properly needs the company_info.field_rules read plus a
// real Settings UI to edit it; that is out of scope for this pass.
export const validateEngineerUpdate = async (
    ticket: EngineerTicket,
    newStatus: string,
    workDone: string,
    spares: TicketSpare[],
    engineerName: string,
    jobsheetPhotoUrl?: string
): Promise<string | null> => {
    const statusChanged = newStatus !== ticket.status;

    // Terminal states are never engineer-updatable (index.html:7677).
    if (['Closed', 'Customer Reject', 'Call Cancel', 'Delivered'].includes(ticket.status || '')) {
        return '❌ This call is closed — no updates allowed.';
    }

    // Statuses where the ball is in someone else's court (index.html:7694-7698).
    const engLocked = ['Pending Customer Approval', 'Pending Engineer Stock', 'Pending Parts', 'Pending Spare'];
    if (engLocked.includes(ticket.status || '')) {
        return `❌ This call is at the "${ticket.status}" stage — nothing can be updated from the engineer side.\n\n`
            + (ticket.status === 'Pending Customer Approval'
                ? 'Let the customer\'s Approve/Reject decision come through (via the "Approve / Reject Estimate" button).'
                : 'Wait for Admin/Office to issue/order the part, then continue.');
    }

    // Action Taken — required (Field Rules default 'required', index.html:7701).
    if (!workDone.trim()) {
        return '❌ Action Taken is required.\nPlease describe what was done.';
    }

    // Work Start must precede any status change except Resolved By Phone,
    // which by definition has no visit/work session (index.html:7710-7719).
    if (statusChanged && newStatus !== 'Resolved By Phone') {
        const tl = Array.isArray(ticket.timeline) ? ticket.timeline : [];
        const hasWorkStart = tl.some((e: any) => e && typeof e.action === 'string' && e.action.includes('Work Start'));
        if (!hasWorkStart) {
            return '🔧 Tap "Work Start" first — only then can the status be updated (everything except Resolved By Phone).';
        }
    }

    // A call must never Close/Repair while a part is still requested:true, i.e.
    // an estimate the customer never approved. Every Revenue report, Invoice and
    // Job Sheet filters spares by !s.requested, so a stuck requested:true part is
    // PERMANENTLY invisible to billing from that point on (index.html:7778-7784).
    if (statusChanged && (newStatus === 'Closed' || newStatus === 'Repaired')) {
        const unapproved = (spares || []).filter((s) => s.code && s.requested);
        if (unapproved.length) {
            return '❌ This call cannot be closed/marked repaired — the following part(s) are still pending customer approval '
                + '(their cost is not counted in billing/invoice/revenue until approved):\n\n'
                + unapproved.map((s) => `${s.code} ${s.name || ''}`.trim()).join('\n')
                + '\n\nSave the customer\'s decision via "Approve / Reject Estimate" first, then close the call.';
        }
    }

    // The engineer must not close a call with parts they do not physically have.
    // On Site checks their own bag; Carry In checks company inventory (the device
    // is at the office, there is no personal-bag concept) — index.html:7794-7803.
    if (statusChanged && ((ticket.service_type === 'On Site' && newStatus === 'Closed') || (ticket.service_type === 'Carry In' && newStatus === 'Repaired'))) {
        const physical = (spares || []).filter((s) => s.code && !s.requested);
        if (physical.length) {
            const missing = ticket.service_type === 'On Site'
                ? await missingBagParts(engineerName, physical)
                : await missingCompanyStockParts(physical);
            if (missing.length) {
                return `❌ These part(s) are not in stock — the call cannot be ${ticket.service_type === 'On Site' ? 'closed' : 'marked Repaired'}:\n\n`
                    + missing.join('\n')
                    + '\n\nRequest the part from Eng. Parts or ask Admin/Office to issue/order it, then continue.';
            }
        }
    }

    // Job Sheet photo is mandatory to close a CSP call — On Site or Carry In,
    // doesn't matter. ICP calls stay optional (index.html:7890-7893).
    if (newStatus === 'Closed' && ticket.wc_type === 'CSP' && !jobsheetPhotoUrl) {
        return '📄 Job Sheet Photo is required to close a CSP call!\n\nAttach the Job Sheet photo (camera or gallery) under "Attachments", then Save.';
    }

    return null;
};

// ─── Charges auto-calc (index.html:7846-7882) ────────────────────────────────
export interface ComputedCharges {
    serviceCharges: number;
    finalCharges: number;
    chargesNote: string;
    timelineAction: string;
    /** false when this call type produces no charges entry at all. */
    applies: boolean;
}

export const computeCloseCharges = (
    ticket: EngineerTicket, newStatus: string, spares: TicketSpare[], consumableCodes: Set<string>
): ComputedCharges => {
    const none: ComputedCharges = { serviceCharges: 0, finalCharges: 0, chargesNote: '', timelineAction: '', applies: false };
    if (newStatus !== 'Closed' && newStatus !== 'Resolved By Phone') return none;

    const ct = ticket.call_type || '';
    const isOOC = isOutOfCoverage(ticket);
    // HTML computes isNonWarranty and isNW separately; isNW additionally counts
    // call_type 'Other' as chargeable. Either one triggers the branch.
    const isNW = ct.includes('Non-Warranty') || ct === 'Other';

    if (isNW || isOOC) {
        const foc = isRepeatFoc(ticket);
        const partsCost = (spares || []).reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.qty) || 1), 0);
        const serviceCharges = foc ? 0 : (Number(ticket.service_charges) || 0);
        const finalCharges = partsCost + serviceCharges;
        return {
            serviceCharges,
            finalCharges,
            chargesNote: foc
                ? `Re-Repair FOC | Parts: ₹${partsCost.toFixed(0)} | Total: ₹${finalCharges.toFixed(0)}`
                : `Service: ₹${serviceCharges.toFixed(0)} + Parts: ₹${partsCost.toFixed(0)} = Total: ₹${finalCharges.toFixed(0)}`,
            timelineAction: `Charges Set${foc ? ' (Re-Repair FOC)' : ''}`,
            applies: true,
        };
    }

    // Warranty/AMC call — normally ₹0, but a Consumable part (ink/cartridge/
    // toner/print head etc.) is ALWAYS billed even under warranty; Canon does
    // not cover those. Service stays ₹0; only the consumable part(s) get charged.
    if (isWarrantyCall(ticket) && !isOOC) {
        const consumableCost = (spares || [])
            .filter((s) => isChargeableSpare(s, consumableCodes))
            .reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.qty) || 1), 0);
        if (consumableCost > 0) {
            return {
                serviceCharges: 0,
                finalCharges: consumableCost,
                chargesNote: `Warranty call — Consumable part(s) charged: ₹${consumableCost.toFixed(0)} (not covered under warranty)`,
                timelineAction: 'Charges Set (Consumable under Warranty)',
                applies: true,
            };
        }
    }
    return none;
};

// Payment Confirmation popup gate (index.html:7936-7942): Non-Warranty/'Other'
// On-Site closes, OR a Warranty On-Site call that ended up with nonzero
// final_charges (a consumable was used, per computeCloseCharges above).
export const needsPaymentConfirmation = (
    ticket: EngineerTicket, newStatus: string, charges: ComputedCharges
): boolean => {
    if (newStatus !== 'Closed' && newStatus !== 'Resolved By Phone') return false;
    if (ticket.service_type !== 'On Site') return false;
    const ct = ticket.call_type || '';
    const warrantyHasConsumableCharge = isWarrantyCall(ticket) && charges.finalCharges > 0;
    return ct.includes('Non-Warranty') || ct === 'Other' || warrantyHasConsumableCharge;
};

// Parts figure the Payment Confirmation popup pre-fills. On a Warranty/AMC call
// only a Consumable is billable — a normal warranty-covered spare must not be
// counted even though its inventory price is nonzero (index.html:16293-16296).
export const paymentPartsCost = (
    ticket: EngineerTicket, spares: TicketSpare[], consumableCodes: Set<string>
): number => {
    const warranty = isWarrantyCall(ticket);
    return (spares || [])
        .filter((s) => !warranty || isChargeableSpare(s, consumableCodes))
        .reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.qty) || 1), 0);
};

// Convenience for callers that need the consumable flags fresh from Inventory.
export const fetchSpareConsumableCodes = (spares: TicketSpare[]): Promise<Set<string>> =>
    fetchConsumableCodes((spares || []).map((s) => s.code || ''));

// ─── Inventory deduction on close (index.html:11010 _deductTicketParts) ──────
// Deducts every not-yet-deducted spare from the correct stock location. Which
// engineer's bag is decided by the TICKET's assigned_name, never by who is
// clicking — a WC/CSP Manager/Admin closing on an engineer's behalf must still
// deduct from THAT engineer's bag. Only codes that genuinely matched an
// Inventory row get marked stock_deducted, so a typo'd/deleted part code stays
// visible and fixable instead of silently vanishing.
export const deductTicketParts = async (
    ticketId: string, byUser: string
): Promise<{ ticket: EngineerTicket | null; notFound: string[] }> => {
    const { data: freshT } = await supabase.from('tickets').select('*').eq('id', ticketId).maybeSingle();
    if (!freshT) return { ticket: null, notFound: [] };
    const allSpares: TicketSpare[] = freshT.spares || [];
    const toDeduct = allSpares.filter((s) => s.code && !s.stock_deducted);
    if (!toDeduct.length) return { ticket: freshT, notFound: [] };

    const warrantyDeduct = WARRANTY_CALL_TYPES.includes(freshT.call_type || '');
    const bagOwner = freshT.service_type === 'On Site' ? (freshT.assigned_name || '') : '';
    const deducted = new Set<TicketSpare>();
    const notFound: string[] = [];

    for (const s of toDeduct) {
        try {
            // Case/whitespace-insensitive match — a stray space or different
            // casing from manual entry must not cause a silent skip.
            const { data: invRows } = await supabase.from('inventory').select('*').ilike('part_code', s.code!.trim());
            const inv = invRows && invRows[0];
            if (!inv) { notFound.push(s.code!); continue; }
            const qty = s.qty || 1;

            if (bagOwner) {
                // On Site: deduct from the assigned engineer's bag (eng_stock).
                // Office stock already went down when the part was issued to them.
                // Deliberately NOT swallowed — a failure here must skip the
                // stock_deducted mark rather than silently claim success.
                const { data: existing } = await supabase.from('eng_stock')
                    .select('id, qty').eq('owner', bagOwner).eq('part_id', inv.id).maybeSingle();
                const newQty = Math.max(0, (existing?.qty || 0) - qty);
                if (existing) {
                    const { error } = await supabase.from('eng_stock')
                        .update({ qty: newQty, updated_at: new Date().toISOString() }).eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('eng_stock').insert([{ owner: bagOwner, part_id: inv.id, qty: newQty }]);
                    if (error) throw error;
                }
            } else if ((inv.qty_in_stock || 0) > 0) {
                // Carry-In (or no assigned engineer): deduct office inventory directly.
                const newQty = Math.max(0, (inv.qty_in_stock || 0) - qty);
                const patch: Record<string, unknown> = { qty_in_stock: newQty, updated_at: new Date().toISOString() };
                if (warrantyDeduct && (inv.warranty_qty || 0) > 0) patch.warranty_qty = Math.max(0, (inv.warranty_qty || 0) - qty);
                const { error } = await supabase.from('inventory').update(patch).eq('id', inv.id);
                if (error) throw error;
                await supabase.from('inventory_log').insert([{
                    inventory_id: inv.id, type: 'out', qty,
                    note: `Used in ticket ${ticketId}${warrantyDeduct ? ' (Warranty)' : ''}`, done_by: byUser,
                }]).then(() => undefined, () => undefined);
            }

            // Movement Log — this is what Eng Parts > Movement Log reads, so
            // "which engineer used how many parts today, Warranty or not" stays
            // answerable.
            await supabase.from('eng_movements').insert([{
                type: 'USE', part_id: inv.id, qty,
                from_owner: bagOwner || 'MAIN', to_owner: null,
                job_sheet: ticketId, warranty: warrantyDeduct,
                notes: `Used in ticket ${ticketId}${freshT.cname ? ' — ' + freshT.cname : ''}`,
                created_by: byUser || 'Admin',
            }]).then(() => undefined, () => undefined);

            await supabase.from('inventory_sales').insert([{
                sale_date: new Date().toLocaleDateString('en-CA'),
                part_code: s.code, part_name: s.name || '',
                sale_type: 'call', reference: ticketId,
                customer_name: freshT.cname || '',
                qty, unit_price: s.price || 0, total_amount: qty * (s.price || 0),
                note: `Auto - Ticket ${ticketId}${bagOwner ? ' (Eng Bag: ' + bagOwner + ')' : ''}`,
                added_by: byUser, created_at: new Date().toISOString(),
            }]).then(() => undefined, () => undefined);

            deducted.add(s);
        } catch (e) { console.log('Inv deduct error:', e); }
    }

    const updatedSpares = allSpares.map((s) => (deducted.has(s) ? { ...s, stock_deducted: true } : s));
    await supabase.from('tickets').update({ spares: updatedSpares }).eq('id', ticketId).then(() => undefined, () => undefined);
    freshT.spares = updatedSpares;
    if (notFound.length) {
        console.warn(`Part code(s) not found in Inventory — stock NOT deducted for ticket ${ticketId}: ${notFound.join(', ')}`);
    }
    return { ticket: freshT, notFound };
};

export const updateTicketStatus = async (
    ticket: EngineerTicket,
    newStatus: string,
    note: string,
    labour: string,
    updatedBy: string,
    faultCode: string,
    extra?: UpdateExtra
): Promise<{ success: boolean; error?: string; finalStatus?: string; stockWarning?: string }> => {
    try {
        const existing = ticket.timeline || [];
        const isMsc = newStatus === 'Sent to MSC';
        const nowIso = new Date().toISOString();
        const workDone = (extra?.workDone ?? ticket.work_done ?? '').trim();
        // The charges calc below bills off this list, so it must be the real
        // current set of parts. Callers that render the spares list pass their
        // edited copy; the ones that don't (admin/dashboard status changes) get
        // a fresh read rather than whatever their ticket object happened to
        // carry — a stale/absent spares array would silently bill ₹0 of parts.
        let spares: TicketSpare[] = extra?.spares ?? (ticket.spares || []);
        if (!extra?.spares) {
            try {
                const { data } = await supabase.from('tickets').select('spares').eq('id', ticket.id).maybeSingle();
                if (data?.spares) spares = data.spares;
            } catch { /* fall back to whatever the caller had */ }
        }

        // Cancelling requires a mandatory reason, and Action Taken doubles as it
        // (index.html:7808-7810).
        const timelineNote = isMsc
            ? (extra?.mscCenter ? `MSC Center: ${extra.mscCenter}` : note || undefined)
            : (note || undefined);
        const firstEntry = newStatus === 'Call Cancel'
            ? { action: 'Call Cancelled by Engineer', by: updatedBy, at: nowIso, note: `Reason: ${workDone}` }
            : { action: isMsc ? 'Sent to MSC' : `Status → ${newStatus}`, by: updatedBy, at: nowIso, note: timelineNote };

        const updateData: any = {
            status: newStatus,
            fault_code: faultCode || '',
            updated_at: nowIso,
            last_status_by: updatedBy,
            timeline: [...existing, firstEntry],
        };
        // Only write these back when the caller actually supplied them — the
        // admin/dashboard call sites don't render the spares list or Action
        // Taken field, and must not blank out either column.
        if (workDone) updateData.work_done = workDone;
        if (extra?.spares) updateData.spares = extra.spares;
        if (labour && newStatus === 'Closed') updateData.labor = Number(labour);
        if (note) updateData.eng_remarks = note;

        if (extra?.seCallId) updateData.se_call_id = extra.seCallId;
        if (ticket.wc_type === 'CSP' && (extra?.pageCount || extra?.pageCountSkipReason)) {
            updateData.page_count = extra.pageCount ? Number(extra.pageCount) : null;
            updateData.page_count_skip_reason = extra.pageCountSkip ? (extra.pageCountSkipReason || '') : null;
        }
        if (extra?.otherCharge) updateData.other_charge = Number(extra.otherCharge);
        // Manual Time In/Out edit — the reason is logged as its own timeline
        // entry, exactly as HTML does (index.html:7809-7812).
        if (extra?.manualTimeReason && extra.manualTimeReason.trim()) {
            updateData.timeline = [...updateData.timeline, {
                action: 'Manual Time Update', by: updatedBy, at: nowIso,
                note: `Reason: ${extra.manualTimeReason.trim()}`,
            }];
        }
        if (ticket.service_type === 'On Site') {
            if (extra?.visitDate) updateData.visit_date = extra.visitDate;
            if (extra?.visitIn) updateData.visit_in = extra.visitIn;
            if (extra?.visitOut) updateData.visit_out = extra.visitOut;
            if (extra?.meterStart) updateData.meter_start = extra.meterStart;
            if (extra?.meterEnd) updateData.meter_end = extra.meterEnd;
        }

        // Repaired → auto become Pending for Delivery (index.html:7832).
        let status = newStatus;
        if (status === 'Repaired') { status = 'Pending for Delivery'; updateData.status = status; }

        // Auto set Time Out when closing an On Site call (index.html:7836-7844).
        if (status === 'Closed' && ticket.service_type === 'On Site' && !updateData.visit_out) {
            updateData.visit_out = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }

        // ── Charges auto-calc (index.html:7846-7882) ────────────────────────
        const consumableCodes = await fetchSpareConsumableCodes(spares);
        const charges = computeCloseCharges(ticket, status, spares, consumableCodes);
        if (charges.applies) {
            updateData.service_charges = charges.serviceCharges;
            updateData.final_charges = charges.finalCharges;
            updateData.charges_note = charges.chargesNote;
            // Appended to the array already holding 'Status → …' so that entry
            // survives — daily reports count closed calls from it.
            updateData.timeline = [...updateData.timeline, {
                action: charges.timelineAction, by: updatedBy, at: new Date().toISOString(), note: charges.chargesNote,
            }];
        }

        // ── Attachments (index.html:7914-7924) ──────────────────────────────
        // Upload any newly-picked photo; keep already-uploaded URLs as-is.
        if (extra?.photos) {
            const safeId = String(ticket.id).replace(/[^A-Za-z0-9_-]/g, '');
            const resolve = async (p: PhotoSlot | null | undefined, tag: string): Promise<string> => {
                if (!p || !p.url) return '';
                if (!p.isNew) return p.url;
                try {
                    return await uploadCrmPhoto(p.url, `${tag}_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`);
                } catch { return p.url; }
            };
            const js = await resolve(extra.photos[0], 'jobsheet');
            if (js) updateData.jobsheet_photo = js;
            const extras: string[] = [];
            for (let i = 1; i < 3; i++) {
                const u = await resolve(extra.photos[i], 'attach');
                if (u) extras.push(u);
            }
            updateData.attachments = extras;
        }

        // ── Product Condition (index.html:7302-7316, 7326-7332) ─────────────
        // condition_type + up to 3 condition photos, uploaded the same way the
        // Job Sheet photos above are.
        if (extra?.conditionType !== undefined) updateData.condition_type = extra.conditionType || null;
        if (extra?.conditionPhotos) {
            const safeId = String(ticket.id).replace(/[^A-Za-z0-9_-]/g, '');
            const condUrls: string[] = [];
            for (let i = 0; i < 3; i++) {
                const p = extra.conditionPhotos[i];
                if (!p || !p.url) continue;
                if (!p.isNew) { condUrls.push(p.url); continue; }
                try {
                    condUrls.push(await uploadCrmPhoto(p.url, `cond_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`));
                } catch { condUrls.push(p.url); }
            }
            updateData.condition_photos = condUrls;
        }

        // ── Payment Confirmation result (index.html:7943-7958) ──────────────
        if (extra?.payment) {
            const p = extra.payment;
            if (p.cname) updateData.cname = p.cname;
            updateData.payment_mode = p.payment_mode;
            updateData.service_charges = p.service_charges;
            if (p.payment_notes) {
                updateData.charges_note = (updateData.charges_note || '') + `\nPayment notes: ${p.payment_notes}`;
            }
            updateData.final_charges = p.parts_cost + p.service_charges;
        }

        const { error } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (error) throw error;

        if (isMsc && extra?.mscCenter) {
            // Column names must match what the WC-side dispatch form/report
            // read back (mscDispatchService + auto_msc_dispatch): msc_name,
            // created_at/updated_at — NOT msc_center/dispatched_at, which are
            // columns that do not exist (index.html:7731). The engineer only
            // supplies the centre name here; courier/docket/dispatch_date are
            // added later by WC via MSCDispatchPanel (index.html:7211-7213).
            try {
                await supabase.from('auto_msc_dispatch').insert([{
                    ticket_id: ticket.id,
                    msc_name: extra.mscCenter,
                    dispatched_by: updatedBy,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }]);
            } catch { /* best-effort — MSC dispatch log is non-critical */ }
        }

        // ── Inventory deduction (index.html:7992-7995) ──────────────────────
        // Resolved By Phone is included — a harmless no-op when no spares were
        // added, since there was no visit. Pending for Delivery is included
        // because that is what a Carry-In "Repaired" close becomes above: the
        // part physically left stock the moment the repair finished, it must not
        // wait for a separate Delivered step days later.
        let stockWarning: string | undefined;
        if (status === 'Closed' || status === 'Resolved By Phone' || status === 'Pending for Delivery') {
            let freshAfterDeduct: EngineerTicket | null = null;
            try {
                const { ticket: freshT, notFound } = await deductTicketParts(ticket.id, updatedBy);
                freshAfterDeduct = freshT;
                if (notFound.length) {
                    stockWarning = `⚠️ Stock warning — ${notFound.length} part(s) on this ticket (${notFound.join(', ')}) don't match any Inventory part code, `
                        + 'so stock could NOT be auto-deducted for them. Please check Inventory / fix the part code, then correct the stock manually if needed.';
                }
            } catch (e) { console.log('deductTicketParts:', e); }

            // ── AUTO WARRANTY TRACKING (index.html:7996-8072) ───────────────
            // Every spare used on a Warranty/Warranty Repeat/AMC call gets an
            // eng_movements row keyed by the SE Call ID's tracking number (the
            // digits after the LAST '/', e.g. CSP/20260618/123456 → 123456) so
            // Eng Parts → Warranty Pending can chase the Canon return against
            // the SE call. Falls back to the ticket id when no SE Call ID was
            // entered. This is deliberately separate from the plain USE row
            // deductTicketParts() writes (which is keyed by ticket id and has
            // no warranty_status) — HTML writes both.
            try {
                const freshT = freshAfterDeduct;
                const isWarranty = WARRANTY_CALL_TYPES.includes(freshT?.call_type || ticket.call_type || '');
                const seCallIdRaw = (extra?.seCallId || freshT?.se_call_id || ticket.se_call_id || '').trim().toUpperCase();
                if (seCallIdRaw && seCallIdRaw !== (freshT?.se_call_id || '').trim().toUpperCase()) {
                    await supabase.from('tickets').update({ se_call_id: seCallIdRaw }).eq('id', ticket.id)
                        .then(() => undefined, () => undefined);
                }
                const seTrackKey = seCallIdRaw ? (seCallIdRaw.split('/').pop() || '').trim() : '';
                // Warranty calls track ALL spares — including ones already
                // stock_deducted by an earlier close — since the Canon return
                // is owed regardless of when the stock moved.
                const warrantySpares = isWarranty ? ((freshT?.spares || spares || []) as TicketSpare[]).filter((s) => s.code) : [];
                if (isWarranty && warrantySpares.length) {
                    if (!seTrackKey) {
                        console.warn(`Warranty part used but SE Call ID missing on ticket ${ticket.id} — warranty return cannot be auto-tracked`);
                    }
                    const trackId = seTrackKey || ticket.id;
                    for (const s of warrantySpares) {
                        try {
                            const { data: invRows } = await supabase.from('inventory').select('id').ilike('part_code', s.code!.trim());
                            const partId = invRows && invRows[0] ? invRows[0].id : null;
                            if (!partId) continue;
                            const { data: existing } = await supabase.from('eng_movements').select('id, qty')
                                .eq('type', 'USE').eq('warranty', true).eq('job_sheet', trackId).eq('part_id', partId);
                            const ex0 = existing && existing[0];
                            if (!ex0) {
                                await supabase.from('eng_movements').insert([{
                                    type: 'USE', part_id: partId, qty: s.qty || 1,
                                    from_owner: updatedBy || extra?.engId || null, to_owner: null,
                                    job_sheet: trackId, warranty: true, warranty_status: 'PENDING',
                                    notes: `Auto — ${freshT?.call_type || ticket.call_type || 'Warranty'} | Ticket: ${ticket.id}${seCallIdRaw ? ' | SE: ' + seCallIdRaw : ''}`,
                                    created_by: updatedBy || 'System',
                                }]).then(() => undefined, () => undefined);
                            } else if ((ex0.qty || 1) < (s.qty || 1)) {
                                // More parts used than logged before — top up.
                                await supabase.from('eng_movements')
                                    .update({ qty: s.qty || 1, updated_at: new Date().toISOString() })
                                    .eq('id', ex0.id).then(() => undefined, () => undefined);
                            }
                        } catch (ex) { console.log('Warranty movement log err:', ex); }
                    }
                }

                // Direct warranty issues that were sitting WITH_ENGINEER against
                // this SE call are now consumed → RECEIVED (index.html:8047-8072).
                if (isWarranty && seTrackKey) {
                    const { data: withEng } = await supabase.from('eng_movements').select('id, qty, part_id, notes')
                        .eq('type', 'WARRANTY_DIRECT_IN').eq('warranty', true)
                        .eq('warranty_status', 'WITH_ENGINEER').eq('job_sheet', seTrackKey);
                    for (const we of (withEng || [])) {
                        await supabase.from('eng_movements').update({
                            warranty_status: 'RECEIVED',
                            warranty_received_at: new Date().toISOString(),
                            warranty_received_qty: we.qty,
                            notes: `${we.notes || ''} | Call closed: ${ticket.id}`,
                        }).eq('id', we.id).then(() => undefined, () => undefined);
                        try {
                            const { data: invRow } = await supabase.from('inventory').select('id, warranty_qty').eq('id', we.part_id).maybeSingle();
                            if (invRow) {
                                await supabase.from('inventory').update({
                                    warranty_qty: Math.max(0, (invRow.warranty_qty || 0) - (we.qty || 1)),
                                    updated_at: new Date().toISOString(),
                                }).eq('id', we.part_id).then(() => undefined, () => undefined);
                            }
                        } catch (ex2) { console.log('warranty_qty reduce err:', ex2); }
                    }
                }
            } catch (e) { console.log('Warranty tracking err:', e); }

            // ── Auto work log on close (index.html:8071-8098) ───────────────
            try {
                const closeNow = new Date();
                const closeTime = closeNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const closeDate = closeNow.toLocaleDateString('en-CA');
                const memberId = extra?.engId || '';
                if (memberId) {
                    const { data: openLogs } = await supabase.from('work_logs').select('id')
                        .eq('eng_id', memberId).eq('log_date', closeDate).eq('to_time', 'OPEN');
                    for (const ol of (openLogs || [])) {
                        await supabase.from('work_logs').update({ to_time: closeTime }).eq('id', ol.id);
                    }
                    // Dedupe: exactly ONE close log per ticket per day — double
                    // taps were creating duplicate "Call Closed" rows.
                    const { data: existCl } = await supabase.from('work_logs')
                        .select('task_description').eq('ticket_id', ticket.id).eq('log_date', closeDate);
                    const hasCl = (existCl || []).some((x: any) => {
                        const d = x.task_description || '';
                        return d.includes('Call Closed') || d.includes('Resolved By Phone');
                    });
                    if (!hasCl) {
                        const label = status === 'Resolved By Phone' ? '📞 Resolved By Phone (no visit) — ' : '✅ Call Closed — ';
                        const ticketLabel = `${ticket.job_sheet || ticket.id}${ticket.cname ? ' — ' + ticket.cname : ''}${ticket.model ? ' | ' + ticket.model : ''}`;
                        await saveWorkLog({
                            eng_id: memberId, eng_name: updatedBy, member_role: extra?.memberRole || 'Engineer',
                            log_date: closeDate, from_time: closeTime, to_time: closeTime,
                            task_description: label + ticketLabel,
                            ticket_id: ticket.id, log_type: 'work',
                        } as any);
                    }
                }
            } catch (e) { console.log('WorkLog auto error:', e); }
        }

        // GPS point for the close, so the next call on the same serial can
        // re-navigate here (index.html:8108, read back by fetchPrevLocationMap).
        if (status === 'Closed' || status === 'Resolved By Phone') {
            saveLocationEvent('ticket_close', ticket.id, null, extra?.engId, updatedBy).catch(() => undefined);
        }

        if (newStatus === 'Closed' || newStatus === 'Resolved By Phone' || newStatus === 'Repaired') {
            const spareLines = spares.filter((s) => s.name).map((s) => {
                const lineTotal = (Number(s.price) || 0) * (Number(s.qty) || 1);
                return `  🔩 ${s.name}${(Number(s.qty) || 1) > 1 ? ` ×${s.qty}` : ''}${lineTotal > 0 ? ` — ₹${lineTotal.toFixed(0)}` : ''}`;
            }).join('\n');
            const isChargeable = !['Warranty', 'Warranty Repeat', 'AMC'].includes(ticket.call_type || '');
            notifyTicketClosed(ticket, newStatus, {
                engName: updatedBy, workDone, remarks: note, spareLines,
                isChargeable, totalAmt: charges.applies ? charges.finalCharges : 0,
            });
        }

        return { success: true, finalStatus: status, stockWarning };
    } catch (err) {
        return { success: false, error: (err as any).message };
    }
};