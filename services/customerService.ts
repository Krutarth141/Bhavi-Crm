import { supabase } from '@/lib/supabase';
import { Customer } from '@/types/customers';

export const fetchAllCustomers = async (): Promise<Customer[]> => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('cname', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Failed to fetch customers:', err);
        return [];
    }
};

export const createCustomer = async (
    customerData: Omit<Customer, 'updated_at'>
): Promise<{ success: boolean; data?: Customer; error?: string }> => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('Failed to create customer:', err);
        return { success: false, error: (err as any).message };
    }
};

export const updateCustomer = async (
    serial: string,
    updates: Partial<Customer>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('customers')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('serial', serial);   // ✅ was .eq('id', id)

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to update customer:', err);
        return { success: false, error: (err as any).message };
    }
};

export const deleteCustomer = async (serial: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('serial', serial);   // ✅ was .eq('id', id)

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Failed to delete customer:', err);
        return { success: false, error: (err as any).message };
    }
};

export const importCustomersFromFile = async (file: File): Promise<{ count: number; errors: number }> => {
    const XLSX = (await import('xlsx')).default;
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async (ev: any) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'binary' });
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

                let count = 0;
                let errors = 0;

                for (const row of rows) {
                    const r = row as any;
                    const name = r['Name'] || r['name'] || '';
                    const mobile = String(r['Mobile'] || r['mobile'] || '');
                    const serial = String(r['Serial No'] || r['Serial'] || r['serial'] || `IMP-${Date.now()}-${count}`);
                    const model = r['Model'] || r['model'] || '';
                    const address = r['Address'] || r['address'] || '';
                    const city = r['City'] || r['city'] || '';
                    const pin = String(r['Pin'] || r['pin'] || '');
                    const area = r['Area'] || r['area'] || '';
                    const alt = String(r['Alternate Mobile'] || r['Alt Mobile'] || '');
                    const state = r['State'] || r['state'] || '';

                    if (!name && !mobile) { errors++; continue; }

                    const { error } = await supabase
                        .from('customers')
                        .upsert(             // ✅ upsert handles insert-or-update cleanly
                            {
                                serial, model, cname: name, mobile, alt_mobile: alt,
                                address, city, pin, area, state,
                                updated_at: new Date().toISOString()
                            },
                            { onConflict: 'serial' }
                        );

                    if (error) { errors++; } else { count++; }
                }

                resolve({ count, errors });
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsBinaryString(file);
    });
};

export const downloadCustomerTemplate = async (): Promise<void> => {
    try {
        const XLSX = await import('xlsx');
        const data = [{
            'Name': 'Ramesh Shah', 'Mobile': '9876543210', 'Alternate Mobile': '',
            'Serial No': 'SN123456', 'Model': 'MF3010',
            'Address': '123 Street', 'City': 'Ahmedabad',
            'Pin': '380015', 'Area': 'Ambawadi', 'State': 'Gujarat'
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, 'customer_template.xlsx');
    } catch (err) {
        console.error('Failed to download template:', err);
    }
};

export const exportCustomers = async (customers: Customer[]): Promise<void> => {
    try {
        const XLSX = await import('xlsx');
        const data = customers.map(c => ({
            'Name': c.cname || '', 'Mobile': c.mobile || '',
            'Alternate Mobile': c.alt_mobile || '',
            'Serial No': c.serial || '', 'Model': c.model || '',
            'Address': c.address || '', 'Area': c.area || '',
            'City': c.city || '', 'State': c.state || '', 'Pin': c.pin || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
        console.error('Failed to export customers:', err);
    }
};