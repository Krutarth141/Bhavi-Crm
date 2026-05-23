import { useState, useEffect } from 'react';
import { Ticket } from '@/types/tickets';
import { fetchAllTickets, fetchAutocompleteTicketData } from '@/services/ticketService';

export const useTickets = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [autocompleteBrands, setAutocompleteBrands] = useState<string[]>([]);
    const [autocompleteModels, setAutocompleteModels] = useState<string[]>([]);
    const [autocompleteProblems, setAutocompleteProblems] = useState<string[]>([]);

    const fetchTickets = async () => {
        setLoading(true);
        const data = await fetchAllTickets();
        setTickets(data);
        setLoading(false);
    };

    const loadAutocompleteData = async () => {
        await fetchAutocompleteTicketData(setAutocompleteBrands, setAutocompleteModels, setAutocompleteProblems);
    };

    useEffect(() => {
        fetchTickets();
        loadAutocompleteData();
    }, []);

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
