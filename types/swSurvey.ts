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

// index.html:20144
export const SW_MODULE_SIZES = ['', '2', '3', '4', '6', '8', '12', '16', '18', '24', '32'];

// index.html:20148 — curated room-name suggestions, wired to a <datalist> on
// the room-name input so it types as freely as HTML's <input list=...>.
export const SW_ROOM_LIST = [
    'Entry', 'Entry Passage', 'Vestibule', 'Foyer', 'Porch', 'Lobby', 'Lift Lobby', 'Living Room', 'Drawing Room',
    'Family Lounge', 'Dining Room', 'Kitchen', 'Utility', 'Pantry', 'Store Room', 'Pooja Room', 'Study', 'Home Office',
    'Master Bedroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Kids Room', 'Guest Bedroom', 'Dressing Room',
    'Walk-in Closet', 'Master Bathroom', 'Common Bathroom', 'Powder Room', 'Passage / Corridor', 'Staircase', 'Balcony',
    'Terrace', 'Servant Room', 'Servant Bathroom', 'Garage', 'Home Theatre', 'Gym', 'Bar', 'Games Room', 'Library',
    'Garden / Lawn', 'Basement', 'Reception', 'Cabin', 'Conference Room', 'Office', 'Common Area',
];

export interface SwCustomItem {
    name: string;
    qty: number;
}

export interface SwBoard {
    id: string;
    name: string;
    type: 'Automation' | 'Non-Automation';
    location: string;
    moduleCount: string;
    items: Record<string, number>;
    custom: SwCustomItem[];
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

// index.html:20152
export const swNewBoard = (name = 'SW1'): SwBoard => ({
    id: swUid(), name, type: 'Automation', location: '', moduleCount: '', items: swEmptyItems(), custom: [],
});

export const swNewRoom = (name = 'Room'): SwRoom => ({ id: swUid(), name, boards: [swNewBoard('SW1')] });

// index.html:20154 — sums both the fixed SW_ITEM_DEFS counters and any custom items.
export const swBoardTotal = (b: SwBoard): number =>
    SW_ITEM_DEFS.reduce((t, d) => t + (b.items?.[d.key] || 0), 0) + (b.custom || []).reduce((t, c) => t + (c.qty || 0), 0);

export const swRoomTotal = (r: SwRoom): number => (r.boards || []).reduce((t, b) => t + swBoardTotal(b), 0);

export const swSurveyTotal = (data: SwSurveyData): number => (data?.rooms || []).reduce((t, r) => t + swRoomTotal(r), 0);