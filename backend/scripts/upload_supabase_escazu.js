// Usage: node backend/scripts/upload_supabase_escazu.js
// Description: Uploads the latest combined plot data to Supabase Storage with a unique name
//              and updates the live URL in the app_config database table.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// --- IMPORTANT: Replace with your actual Supabase credentials ---
const SUPABASE_URL = 'https://qbdnyqpdiatikjxavmmr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk0NjE0NCwiZXhwIjoyMDY1NTIyMTQ0fQ.YaBV6m_oe4Gr40n9QU-FMJrR0r7lu3wnHhNV9pvnu8Y';
// -------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_PATH = path.join(__dirname, '../public/data/escazu_plots_supabase.json');
const BUCKET_NAME = 'plots';
const CONFIG_KEY = 'escazu_plots_url';

async function uploadAndConfigure() {
    try {
        console.log('--- Starting Data Upload and Configuration ---');

        // 1. Verify the data file exists
        if (!fs.existsSync(DATA_PATH)) {
            throw new Error(`Data file not found at: ${DATA_PATH}`);
        }
        const fileBuffer = fs.readFileSync(DATA_PATH);
        const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);
        console.log(`Found data file. Size: ${fileSize} MB`);

        // 2. Create a unique filename to bust caches
        const timestamp = Date.now();
        const fileNameInBucket = `escazu_plots_${timestamp}.json`;
        console.log(`New file name will be: ${fileNameInBucket}`);

        // 3. Upload the new file to Supabase Storage
        console.log(`Uploading to bucket "${BUCKET_NAME}"...`);
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileNameInBucket, fileBuffer, {
                contentType: 'application/json',
                upsert: false // We always want a new file
            });

        if (uploadError) {
            throw uploadError;
        }
        console.log('✅ File uploaded successfully to Storage.');

        // 4. Get the public URL for the new file
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileNameInBucket);

        const publicUrl = urlData.publicUrl;
        console.log(`🌐 New public URL: ${publicUrl}`);

        // 5. Update the URL in the app_config database table
        console.log(`Updating configuration in the database for key: "${CONFIG_KEY}"...`);
        const { error: dbError } = await supabase
            .from('app_config')
            .update({ value: publicUrl, last_updated: new Date().toISOString() })
            .eq('key', CONFIG_KEY);
        
        if (dbError) {
            throw dbError;
        }
        console.log('✅ Configuration updated successfully in the database.');

        console.log('\n--- Process Complete ---');
        console.log('Your live site will now fetch the latest data from the new URL automatically.');

    } catch (error) {
        console.error('\n❌ An error occurred during the upload/configuration process:');
        console.error(error.message);
        process.exit(1);
    }
}

uploadAndConfigure(); 