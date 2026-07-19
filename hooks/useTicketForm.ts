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
    service_type: 'Repair',
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
    wc_type: 'ICP',
    priority: 'Normal',
    fault_code: '',
    action: '',
    remarks: '',
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
