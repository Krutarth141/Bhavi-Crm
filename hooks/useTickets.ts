import { useState, useEffect } from 'react';
import { Ticket } from '@/types/tickets';
import { fetchAllTickets, fetchAutocompleteTicketData, fetchTicketsForUser } from '@/services/ticketService';

interface UseTicketsProps {
    userRole?: string;
    userId?: string;
}

export const useTickets = ({ userRole, userId }: UseTicketsProps = {}) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [autocompleteBrands, setAutocompleteBrands] = useState<string[]>([]);
    const [autocompleteModels, setAutocompleteModels] = useState<string[]>([]);
    const [autocompleteProblems, setAutocompleteProblems] = useState<string[]>([]);

    const fetchTickets = async () => {
        setLoading(true);
        let data: Ticket[] = [];

        // If userRole and userId provided, fetch tickets based on role
        if (userRole && userId) {
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
    }, [userRole, userId]);

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
