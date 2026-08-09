import { supabase } from '@/lib/supabase';
import { SwSurvey, SwSurveyData } from '@/types/swSurvey';

export const fetchSwSurveys = async (): Promise<SwSurvey[]> => {
    try {
        const { data, error } = await supabase.from('sw_surveys').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSwSurveys:', err); return []; }
};

export const saveSwSurvey = async (
    id: number | null, clientName: string, siteName: string, surveyDate: string, data: SwSurveyData, createdBy: string
): Promise<{ success: boolean; error?: string; id?: number }> => {
    try {
        if (id) {
            const { error } = await supabase.from('sw_surveys').update({
                client_name: clientName || '', site_name: siteName || '', survey_date: surveyDate || null,
                data, updated_at: new Date().toISOString(),
            }).eq('id', id);
            if (error) throw error;
            return { success: true, id };
        }
        const { data: row, error } = await supabase.from('sw_surveys').insert([{
            client_name: clientName || '', site_name: siteName || '', survey_date: surveyDate || null,
            data, created_by: createdBy, updated_at: new Date().toISOString(),
        }]).select().single();
        if (error) throw error;
        return { success: true, id: row.id };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

export const deleteSwSurvey = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sw_surveys').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};