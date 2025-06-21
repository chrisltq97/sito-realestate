// Usage: node backend/scripts/setup_database_config.js
// Description: Creates the app_config table in Supabase and inserts the initial data URL.

const { createClient } = require('@supabase/supabase-js');

// --- IMPORTANT: Replace with your actual Supabase credentials ---
const SUPABASE_URL = 'https://qbdnyqpdiatikjxavmmr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk0NjE0NCwiZXhwIjoyMDY1NTIyMTQ0fQ.YaBV6m_oe4Gr40n9QU-FMJrR0r7lu3wnHhNV9pvnu8Y';
// -------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const initialConfig = {
    key: 'escazu_plots_url',
    value: 'https://qbdnyqpdiatikjxavmmr.supabase.co/storage/v1/object/public/plots/escazu_plots.json' // A default fallback URL
};

async function setupDatabase() {
    try {
        console.log('--- Setting up Database Configuration ---');

        // 1. Create the app_config table
        console.log('Attempting to create "app_config" table...');
        const { error: createTableError } = await supabase
            .from('information_schema.tables')
            .select()
            .eq('table_name', 'app_config')
            .single();

        // Check if table exists. If not, create it.
        // A direct CREATE TABLE is easier with SQL, but this avoids raw SQL execution.
        // A more robust way is to run the SQL in the Supabase dashboard once.
        // For this script, we'll assume it might fail if it exists and proceed.
        const createTableQuery = `
            CREATE TABLE public.app_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                last_updated TIMESTAMPTZ DEFAULT NOW()
            );
        `;
        // We can't run raw SQL easily here without rpc, so we will handle this gracefully.
        console.log('Please ensure the `app_config` table exists with a PRIMARY KEY `key` (text) and a `value` (text) column.');
        console.log('You can run the above SQL in your Supabase dashboard if needed.');


        // 2. Insert or Update the initial configuration key
        console.log(`Upserting initial config for key: "${initialConfig.key}"`);
        const { data, error: upsertError } = await supabase
            .from('app_config')
            .upsert(initialConfig, { onConflict: 'key' });

        if (upsertError) {
            // Check for a common error if the table doesn't exist.
            if (upsertError.message.includes('relation "public.app_config" does not exist')) {
                 console.error('\n[FATAL ERROR] The `app_config` table does not exist.');
                 console.error('Please create it in your Supabase dashboard using the SQL query below, then run this script again.');
                 console.log('------------------------------------');
                 console.log(createTableQuery.trim());
                 console.log('------------------------------------');
                 throw new Error('Table not found.');
            }
            throw upsertError;
        }

        console.log('✅ Successfully inserted/updated the initial config.');
        console.log('--- Database Setup Complete ---');

    } catch (error) {
        console.error('\n❌ An error occurred during database setup:');
        console.error(error.message);
        process.exit(1);
    }
}

setupDatabase(); 