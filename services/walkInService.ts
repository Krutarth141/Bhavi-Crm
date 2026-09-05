import { supabase } from '@/lib/supabase';
import { WalkInEntry, WalkInProduct } from '@/types/walkin';

export const getNextToken = async (date: string): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('walkin_log')
            .select('token_no')
            .eq('visit_date', date)
            .order('token_no', { ascending: false, nullsFirst: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            return (data[0].token_no ?? 0) + 1;
        }
        return 1;
    } catch (err) {
        console.error('Failed to get next token:', err);
        return 1;
    }
};

export const insertWalkIn = async (
    entry: Omit<WalkInEntry, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
        const { data, error } = await supabase
            .from('walkin_log')
            .insert([entry])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateWalkIn = async (
    id: string,
    data: Partial<WalkInEntry>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('walkin_log')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

// Mirrors HTML's duplicate check in saveWalkIn (index.html:16927-16942) — finds
// an existing walkin_log entry for the same mobile number on the given date.
export const findTodayWalkInByMobile = async (
    mobile: string,
    visitDate: string
): Promise<WalkInEntry | null> => {
    try {
        const { data, error } = await supabase
            .from('walkin_log')
            .select('*')
            .eq('visit_date', visitDate)
            .eq('mobile', mobile)
            .limit(1);
        if (error) throw error;
        return data && data.length ? (data[0] as WalkInEntry) : null;
    } catch (err) {
        console.error('Failed duplicate walk-in check:', err);
        return null;
    }
};

// Mirrors HTML's merge branch of saveWalkIn (index.html:16933-16939) — appends
// new products onto an existing entry instead of creating a separate one.
export const mergeWalkInProducts = async (
    id: string,
    mergedProducts: WalkInProduct[]
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('walkin_log')
            .update({
                products: mergedProducts,
                product_count: mergedProducts.length,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const deleteWalkIn = async (
    id: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('walkin_log')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export interface WalkInCustomerMatch {
    name: string;
    address?: string;
    area?: string;
    pin?: string;
    state?: string;
    city?: string;
}

export const fetchWalkInCustomer = async (mobile: string): Promise<WalkInCustomerMatch | null> => {
    const { data: custs } = await supabase.from('customers').select('*').eq('mobile', mobile).limit(1);
    if (custs && custs.length) {
        const c = custs[0];
        return { name: c.name || c.cname || '', address: c.address || '', area: c.area || '', pin: c.pin || '', state: c.state || '', city: c.city || '' };
    }
    const { data: tkts } = await supabase.from('tickets').select('*').eq('mobile', mobile).order('created_at', { ascending: false }).limit(1);
    if (tkts && tkts.length) {
        const t = tkts[0];
        return { name: t.cname || '', address: t.address || '', area: t.area || '', pin: t.pin || '' };
    }
    return null;
};

export interface PincodeMatch {
    pincode: string;
    area: string;
    district: string;
}

export const searchPincodes = async (query: string, state?: string): Promise<PincodeMatch[]> => {
    const q = query.trim();
    if (!q) return [];
    const isNum = /^\d+$/.test(q);
    let req = supabase.from('pincodes').select('pincode, area, district').order('pincode').limit(60);
    if (isNum) {
        req = req.like('pincode', `${q}%`);
    } else {
        req = req.ilike('area', `%${q}%`);
        if (state) req = req.eq('state', state);
    }
    const { data, error } = await req;
    if (error) return [];
    return data || [];
};