import { useState } from 'react';

export interface TicketFormData {
    cname: string;
    mobile: string;
    alt_mobile: string;
    address: string;
    city: string;
    state: string;
    pin: string;
    area: string;
    call_type: string;
    service_type: string;
    brand_name: string;
    model: string;
    serial: string;
    problem: string;
    description: string;
    condition: string;
    accessories: string;
    warranty_coverage: string;
    status: string;
    service_charges: number;
    labor: number;
    final_charges: number;
    se_call_id: string;
    visit_date: string;
    rerepair: boolean;
    rerepair_foc: boolean;
    assigned_name: string;
    assigned_to: string;
    wc_type: string;
    priority: string;
    fault_code: string;
    action: string;
    remarks: string;
    tat_date: string;
    // ── Fields present on HTML's New Call form (index.html:5312-5361, 5679-5700)
    email: string;
    /** Address line 2. Joined onto `address` as ", line2" at save time, like HTML. */
    address2: string;
    /** Physical Job Sheet no. — the paper jobsheet the engineer carries. */
    phys_js: string;
    /** Selected Brand master id — drives the Sub-Category list and wc_type. */
    brand_id: string;
    /** Selected Sub-Category master id. */
    subcategory_id: string;
    /** Sub-Category display name — 'ICP'/'CSP' here decides wc_type directly. */
    subcategory_name: string;
}

const initialFormData: TicketFormData = {
    cname: '',
    mobile: '',
    alt_mobile: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    area: '',
    call_type: 'Warranty',
    // HTML's New Call form defaults Service Type to 'On Site' (index.html:5327).
    // 'Repair' was never a valid tickets.service_type value — every downstream
    // branch tests 'On Site' vs 'Carry In', so 'Repair' silently behaved as On Site
    // in some places and as neither in others.
    service_type: 'On Site',
    brand_name: '',
    model: '',
    serial: '',
    problem: '',
    description: '',
    condition: '',
    accessories: '',
    warranty_coverage: 'Under Coverage',
    status: 'Pending Allocation',
    service_charges: 0,
    labor: 0,
    final_charges: 0,
    se_call_id: '',
    visit_date: '',
    rerepair: false,
    rerepair_foc: false,
    assigned_name: '',
    assigned_to: '',
    // Placeholder only — the real value is derived at save time from the
    // Sub-Category / Brand / logged-in WC (see deriveWcType, index.html:5688).
    wc_type: 'ICP',
    priority: 'Normal',
    fault_code: '',
    action: '',
    remarks: '',
    tat_date: '',
    email: '',
    address2: '',
    phys_js: '',
    brand_id: '',
    subcategory_id: '',
    subcategory_name: '',
};

// wc_type decides which Work Controller's reports a call lands under. HTML
// (index.html:5688) derives it in this exact order:
//   1. the selected Sub-Category name, if it is literally 'ICP' or 'CSP'
//   2. else the brand name — Panasonic → ICP, Fujifilm → CSP
//   3. else, for a logged-in work_controller, their own name containing
//      'CSP'/'ICP'
//   4. else 'ICP'
export const deriveWcType = (
    subCategoryName: string, brandName: string, userRoleType?: string, userName?: string
): string => {
    const sc = (subCategoryName || '').trim();
    if (sc === 'ICP') return 'ICP';
    if (sc === 'CSP') return 'CSP';
    const bn = (brandName || '').toLowerCase();
    if (bn.includes('panasonic')) return 'ICP';
    if (bn.includes('fujifilm')) return 'CSP';
    if (userRoleType === 'work_controller') {
        const wcn = (userName || '').toUpperCase();
        if (wcn.includes('CSP')) return 'CSP';
        if (wcn.includes('ICP')) return 'ICP';
    }
    return 'ICP';
};

export const useTicketForm = () => {
    const [formData, setFormData] = useState<TicketFormData>(initialFormData);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as any;

        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked,
            }));
        } else if (['service_charges', 'labor', 'final_charges', 'pin'].includes(name)) {
            setFormData(prev => ({
                ...prev,
                [name]: value ? parseInt(value) : 0,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const resetForm = () => {
        setFormData(initialFormData);
    };

    const NUMERIC_FIELDS = new Set(['service_charges', 'labor', 'final_charges', 'pin']);
    const BOOLEAN_FIELDS = new Set(['rerepair', 'rerepair_foc']);

    const setFormValues = (data: Partial<TicketFormData>) => {
        const cleaned: Partial<TicketFormData> = {};
        (Object.keys(data) as (keyof TicketFormData)[]).forEach((key) => {
            const value = data[key];
            if (value === null || value === undefined) {
                (cleaned as any)[key] = NUMERIC_FIELDS.has(key as string) ? 0 : BOOLEAN_FIELDS.has(key as string) ? false : '';
            } else {
                (cleaned as any)[key] = value;
            }
        });
        setFormData(prev => ({
            ...prev,
            ...cleaned,
        }));
    };

    return {
        formData,
        setFormData,
        handleFormChange,
        resetForm,
        setFormValues,
    };
};