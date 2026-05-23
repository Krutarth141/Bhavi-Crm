import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Test 1: Check if inventory table exists and has data
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .limit(5);

    if (invError) {
      return Response.json({
        status: 'error',
        error: 'Inventory Query Failed',
        code: invError.code,
        message: invError.message,
        details: invError.details,
        hint: invError.hint
      }, { status: 400 });
    }

    // Test 2: List all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    return Response.json({
      status: 'success',
      inventory_data_count: inventory?.length || 0,
      sample_inventory: inventory?.slice(0, 2),
      available_tables: tables,
      message: 'Supabase connection working!'
    });
  } catch (error: any) {
    return Response.json({
      status: 'error',
      error_message: error?.message || String(error),
      error_details: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}
