import { useState, useEffect } from 'react';
import { Ticket } from '@/types/tickets';
import { fetchAllTickets, fetchAutocompleteTicketData, fetchTicketsForUser, fetchCspTickets } from '@/services/ticketService';

interface UseTicketsProps {
    userRole?: string;
    userId?: string;
    // Work controller's display name — needed to derive their ICP/CSP dealer
    // network for ticket scoping (index.html:4773-4781).
    userName?: string;
    // The Accountant (ACCT001) is a work_controller role but sees every
    // ticket unfiltered, unlike plain WCs.
    isAccountant?: boolean;
    // CSP-manager engineers (isCspMgr) are scoped to wc_type='CSP' tickets only,
    // regardless of userRole/userId (index.html:4770-4771) — takes priority.
    cspOnly?: boolean;
}

export const useTickets = ({ userRole, userId, userName, isAccountant, cspOnly }: UseTicketsProps = {}) => {
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
            data = await fetchTicketsForUser(userRole, userId, { userName, isAccountant });
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
    }, [userRole, userId, userName, isAccountant, cspOnly]);

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