import { supabase } from '@/lib/supabase';

export interface Holiday {
    holiday_date: string; // YYYY-MM-DD
    name: string;
}

// Mirrors HTML's loadExtraHolidays() (index.html:5985-5990) — best-effort: a
// missing `holidays` table (optional feature) just means no extra holidays,
// not a hard error for callers doing TAT math.
export const fetchExtraHolidaySet = async (): Promise<Set<string>> => {
    try {
        const { data, error } = await supabase.from('holidays').select('holiday_date');
        if (error) throw error;
        return new Set((data || []).map((r: any) => r.holiday_date));
    } catch {
        return new Set();
    }
};

export const fetchHolidays = async (): Promise<Holiday[]> => {
    const { data, error } = await supabase.from('holidays').select('holiday_date, name').order('holiday_date', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const addHoliday = async (holiday_date: string, name: string): Promise<void> => {
    const { error } = await supabase.from('holidays').insert([{ holiday_date, name }]);
    if (error) throw error;
};

export const deleteHoliday = async (holiday_date: string): Promise<void> => {
    const { error } = await supabase.from('holidays').delete().eq('holiday_date', holiday_date);
    if (error) throw error;
};