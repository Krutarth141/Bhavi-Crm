export const SW_ITEM_DEFS = [
    { key: 'normalSwitch', label: 'Normal Switch (Off)' },
    { key: 'switch15A', label: '15A Switch (Off)' },
    { key: 'sceneController', label: 'Scene Controller' },
    { key: 'regulator', label: 'Regulator' },
    { key: 'fanSwitch', label: 'Fan Switch' },
    { key: 'socket', label: 'Socket (6A)' },
    { key: 'socket15A', label: '15A Socket' },
    { key: 'bell', label: 'Bell / Buzzer' },
];

export interface SwBoard {
    id: string;
    name: string;
    location: string;
    items: Record<string, number>;
}

export interface SwRoom {
    id: string;
    name: string;
    boards: SwBoard[];
}

export interface SwSurveyData {
    rooms: SwRoom[];
}

export interface SwSurvey {
    id: number;
    site_id?: number | null;
    client_name?: string;
    site_name?: string;
    survey_date?: string;
    data: SwSurveyData;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export const swUid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const swEmptyItems = (): Record<string, number> => Object.fromEntries(SW_ITEM_DEFS.map(d => [d.key, 0]));

export const swNewBoard = (name = 'SW1'): SwBoard => ({ id: swUid(), name, location: '', items: swEmptyItems() });

export const swNewRoom = (name = 'Room'): SwRoom => ({ id: swUid(), name, boards: [swNewBoard('SW1')] });

export const swBoardTotal = (b: SwBoard): number => SW_ITEM_DEFS.reduce((t, d) => t + (b.items?.[d.key] || 0), 0);

export const swRoomTotal = (r: SwRoom): number => (r.boards || []).reduce((t, b) => t + swBoardTotal(b), 0);

export const swSurveyTotal = (data: SwSurveyData): number => (data?.rooms || []).reduce((t, r) => t + swRoomTotal(r), 0);