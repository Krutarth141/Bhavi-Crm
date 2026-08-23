import { useState, useEffect } from 'react';
import { Ticket } from '@/types/tickets';
import { fetchAllTickets, fetchAutocompleteTicketData, fetchTicketsForUser, fetchCspTickets } from '@/services/ticketService';

interface UseTicketsProps {
    userRole?: string;
    userId?: string;
    // CSP-manager engineers (isCspMgr) are scoped to wc_type='CSP' tickets only,
    // regardless of userRole/userId (index.html:4770-4771) — takes priority.
    cspOnly?: boolean;
}

export const useTickets = ({ userRole, userId, cspOnly }: UseTicketsProps = {}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [autocompleteBrands, setAutocompleteBrands] = useState<string[]>([]);
    const [autocompleteModels, setAutocompleteModels] = useState<string[]>([]);
    const [autocompleteProblems, setAutocompleteProblems] = useState<string[]>([]);

    const fetchTickets = async () => {
        setLoading(true);
        let data: Ticket[] = [];

        if (cspOnly) {
            data = await fetchCspTickets();
        } else if (userRole && userId) {
            // If userRole and userId provided, fetch tickets based on role
            data = await fetchTicketsForUser(userRole, userId);
        } else {
            // Fallback to fetching all tickets (for admin)
            data = await fetchAllTickets();
        }

        setTickets(data);
        setLoading(false);
    };

    const loadAutocompleteData = async () => {
        await fetchAutocompleteTicketData(setAutocompleteBrands, setAutocompleteModels, setAutocompleteProblems);
    };

    useEffect(() => {
        fetchTickets();
        loadAutocompleteData();
    }, [userRole, userId, cspOnly]);

    return {
        tickets,
        setTickets,
        loading,
        autocompleteBrands,
        autocompleteModels,
        autocompleteProblems,
        fetchTickets,
        loadAutocompleteData,
    };
};