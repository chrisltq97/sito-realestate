require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    // 1. Test select (should be empty)
    const { data: selectData, error: selectError } = await supabase
      .from('properties')
      .select('*')
      .limit(1);
    if (selectError) throw selectError;
    console.log('Select test passed:', selectData);

    // 2. Test insert
    const testFinca = 'TEST123456';
    const { data: insertData, error: insertError } = await supabase
      .from('properties')
      .insert({ finca_regi: testFinca, oid: 'test-oid', address: 'Test Address' })
      .select();
    if (insertError) throw insertError;
    console.log('Insert test passed:', insertData);

    // 3. Test update
    const { data: updateData, error: updateError } = await supabase
      .from('properties')
      .update({ address: 'Updated Address' })
      .eq('finca_regi', testFinca)
      .select();
    if (updateError) throw updateError;
    console.log('Update test passed:', updateData);

    // 4. Test delete
    const { data: deleteData, error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('finca_regi', testFinca)
      .select();
    if (deleteError) throw deleteError;
    console.log('Delete test passed:', deleteData);

    console.log('All Supabase tests passed!');
  } catch (err) {
    console.error('Supabase test failed:', err);
  }
}

testConnection(); 