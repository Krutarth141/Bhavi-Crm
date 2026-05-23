import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/tickets';

export const fetchAllTickets = async (): Promise<Ticket[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch tickets:', err);
        return [];
    }
};

export const fetchAutocompleteTicketData = async (
    setAutocompleteBrands: (brands: string[]) => void,
    setAutocompleteModels: (models: string[]) => void,
    setAutocompleteProblems: (problems: string[]) => void
) => {
    try {
        const { data } = await supabase.from('tickets').select('brand_name, model, problem');

        if (data) {
            const brands = [...new Set(data.map((t: any) => t.brand_name).filter(Boolean))];
            const models = [...new Set(data.map((t: any) => t.model).filter(Boolean))];
            const problems = [...new Set(data.map((t: any) => t.problem).filter(Boolean))];

            setAutocompleteBrands(brands as string[]);
            setAutocompleteModels(models as string[]);
            setAutocompleteProblems(problems as string[]);
        }
    } catch (err) {
        console.error('Failed to fetch autocomplete data:', err);
    }
};

export const createTicket = async (ticketData: Partial<Ticket>): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const currentYear = new Date().getFullYear();

        // Fetch all tickets for current year to find highest sequence number
        const { data: allTickets } = await supabase
            .from('tickets')
            .select('id')
            .ilike('id', `BEA-${currentYear}-%`);

        let nextSequence = 1;
        if (allTickets && allTickets.length > 0) {
            const sequences = allTickets
                .map((t: any) => {
                    const match = t.id.match(/BEA-\d+-(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .sort((a: number, b: number) => b - a);

            nextSequence = (sequences[0] || 0) + 1;
        }

        const newId = `BEA-${currentYear}-${String(nextSequence).padStart(3, '0')}`;

        const { error } = await supabase.from('tickets').insert([
            {
                ...ticketData,
                id: newId,
                job_sheet: newId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ]);

        if (error) throw error;
        return { success: true, id: newId };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateTicket = async (ticketId: string, updates: Partial<Ticket>): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('tickets')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
};

export const updateTicketRemarks = async (ticketId: string, remarks: string): Promise<{ success: boolean; error?: string }> => {
    return updateTicket(ticketId, { remarks });
};
