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
    id: number | null, clientName: string, siteName: string, surveyDate: string, data: SwSurveyData, createdBy: string,
    siteId?: number | null
): Promise<{ success: boolean; error?: string; id?: number }> => {
    try {
        if (id) {
            // index.html:20408 swSaveNow() PATCH never touches site_id — an existing
            // survey's site link is set once at creation and can't be changed later.
            const { error } = await supabase.from('sw_surveys').update({
                client_name: clientName || '', site_name: siteName || '', survey_date: surveyDate || null,
                data, updated_at: new Date().toISOString(),
            }).eq('id', id);
            if (error) throw error;
            return { success: true, id };
        }
        const { data: row, error } = await supabase.from('sw_surveys').insert([{
            client_name: clientName || '', site_name: siteName || '', survey_date: surveyDate || null,
            site_id: siteId ?? null, data, created_by: createdBy, updated_at: new Date().toISOString(),
        }]).select().single();
        if (error) throw error;
        return { success: true, id: row.id };
    } catch (err) { return { success: false, error: (err as any).message }; }
};

// Auto Sites → survey linking (HTML: "Auto Site ma thi pan kholi shakay").
export const fetchSwSurveysBySite = async (siteId: number): Promise<SwSurvey[]> => {
    try {
        const { data, error } = await supabase.from('sw_surveys').select('*').eq('site_id', siteId).order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { console.error('fetchSwSurveysBySite:', err); return []; }
};

export const deleteSwSurvey = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('sw_surveys').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) { return { success: false, error: (err as any).message }; }
};