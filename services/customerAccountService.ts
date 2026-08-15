import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/tickets';
import { SalesOrder } from '@/types/sales';
import { CustomerSession, AccountStats, SignupCheckResult } from '@/types/customerAccount';

const PIN_SALT = 'bhavi_pin_v1:';

export const hashPin = async (pin: string): Promise<string> => {
    try {
        const data = new TextEncoder().encode(PIN_SALT + pin);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
        return pin;
    }
};

const isHashed = (pin: string) => pin.length === 64;

export const signIn = async (mobile: string, pin: string): Promise<{ success: boolean; session?: CustomerSession; error?: string }> => {
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('mobile', mobile).limit(1);
        if (error) throw error;
        const c = data && data[0];
        if (!c) return { success: false, error: 'No account found for this mobile. Please sign up.' };
        if (!c.portal_pin) return { success: false, error: 'No PIN set. Please sign up to set your PIN.' };

        const hashed = await hashPin(pin);
        let match = false;
        if (isHashed(c.portal_pin)) {
            match = c.portal_pin === hashed;
        } else {
            match = c.portal_pin === pin;
            if (match) {
                supabase.from('customers').update({ portal_pin: hashed, updated_at: new Date().toISOString() }).eq('mobile', mobile).then(() => { });
            }
        }
        if (!match) return { success: false, error: 'Incorrect PIN. Please try again.' };
        return { success: true, session: { mobile, name: c.cname || 'Customer' } };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

export const checkMobileForSignup = async (mobile: string): Promise<SignupCheckResult> => {
    try {
        const { data } = await supabase.from('customers').select('*').eq('mobile', mobile).limit(1);
        const c = data && data[0];
        if (!c) return { exists: false, hasPin: false };
        return { exists: true, hasPin: !!c.portal_pin, cname: c.cname || undefined };
    } catch {
        return { exists: false, hasPin: false };
    }
};

export const signUp = async (mobile: string, cname: string, pin: string): Promise<{ success: boolean; session?: CustomerSession; error?: string }> => {
    try {
        const { data: existing } = await supabase.from('customers').select('mobile, portal_pin').eq('mobile', mobile).limit(1);
        if (existing && existing[0] && (existing[0] as any).portal_pin) {
            return { success: false, error: 'An account already exists for this mobile number. Please use Sign In instead.' };
        }
        const hPin = await hashPin(pin);
        const { data: updated, error: updErr } = await supabase
            .from('customers')
            .update({ portal_pin: hPin, cname, updated_at: new Date().toISOString() })
            .eq('mobile', mobile)
            .select();
        if (updErr) throw updErr;
        if (!updated || updated.length === 0) {
            const { error: insErr } = await supabase.from('customers').insert([{
                cname, mobile, portal_pin: hPin, serial: '', model: '', area: '', updated_at: new Date().toISOString(),
            }]);
            if (insErr) throw insErr;
        }
        return { success: true, session: { mobile, name: cname } };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

export const resetPin = async (mobile: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data } = await supabase.from('customers').select('mobile').eq('mobile', mobile).limit(1);
        if (!data || !data.length) return { success: false, error: 'No account found for this mobile number.' };
        const hPin = await hashPin(newPin);
        const { error } = await supabase.from('customers').update({ portal_pin: hPin, updated_at: new Date().toISOString() }).eq('mobile', mobile);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

export const fetchAccountStats = async (mobile: string): Promise<AccountStats> => {
    try {
        const [{ data: tks }, { data: ords }] = await Promise.all([
            supabase.from('tickets').select('id, status').eq('mobile', mobile),
            supabase.from('sales_orders').select('id, status').eq('customer_mobile', mobile),
        ]);
        const tickets = tks || [];
        const orders = ords || [];
        const active = tickets.filter((t: any) => !['Closed', 'Call Cancel', 'Customer Reject'].includes(t.status)).length;
        return { tickets: tickets.length, orders: orders.length, active };
    } catch {
        return { tickets: 0, orders: 0, active: 0 };
    }
};

export const fetchMyTickets = async (mobile: string): Promise<Ticket[]> => {
    const { data, error } = await supabase.from('tickets').select('*').eq('mobile', mobile).order('created_at', { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
};

export const fetchMyOrders = async (mobile: string): Promise<SalesOrder[]> => {
    const { data, error } = await supabase.from('sales_orders').select('*').eq('customer_mobile', mobile).order('created_at', { ascending: false }).limit(50);
    if (error) return [];
    return data || [];
};