export interface PeonTask {
    id: string;
    label: string;
    glabel: string;
    icon: string;
    customDbId?: string;
}

export const PEON_TASKS: PeonTask[] = [
    { id: 'clean_morning', label: 'Office Cleaning (Morning)', glabel: 'સવારની ઓફિસ સફાઈ', icon: '🧹' },
    { id: 'clean_evening', label: 'Office Cleaning (Evening)', glabel: 'સાંજની ઓફિસ સફાઈ', icon: '🧹' },
    { id: 'water', label: 'Water Dispenser Refilling', glabel: 'પાણીની ટાંકી ભરવી', icon: '💧' },
    { id: 'tea', label: 'Tea / Coffee Service', glabel: 'ચા / કૉફી સર્વિસ', icon: '☕' },
    { id: 'dust', label: 'Dusting & Sweeping', glabel: 'ધૂળ સાફ કરવી', icon: '🪣' },
    { id: 'trash', label: 'Trash / Waste Disposal', glabel: 'કચરો ઉઠાવવો', icon: '🗑️' },
    { id: 'washroom', label: 'Washroom Cleaning', glabel: 'વૉશરૂમ સફાઈ', icon: '🚿' },
    { id: 'visitor', label: 'Visitor Hospitality', glabel: 'મુલાકાતી સ્વાગત', icon: '🤝' },
    { id: 'kitchen', label: 'Kitchen / Pantry Cleaning', glabel: 'રસોડું / પેન્ટ્રી સફાઈ', icon: '🍽️' },
    { id: 'courier', label: 'Courier / Mail Handling', glabel: 'કુરિયર / મેઈલ', icon: '📬' },
];

export interface PeonTaskLog {
    id: string;
    peon_id: string;
    peon_name?: string;
    log_date: string;
    task_name: string;
    task_label?: string;
    done_at?: string;
    extra_from?: string;
    extra_to?: string;
}

export interface PeonTaskConfig {
    id: string;
    task_id: string;
    task_label?: string;
    task_glabel?: string;
    task_icon?: string;
    scheduled_time?: string | null;
    is_custom: boolean;
    sort_order?: number;
    is_active: boolean;
}