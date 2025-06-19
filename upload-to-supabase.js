const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadProperties() {
    try {
        // Read minimal properties file for Santa Ana
        console.log('Reading minimal properties file for Santa Ana...');
        const santaanaData = JSON.parse(
            fs.readFileSync(path.join(__dirname, 'data/minimal_properties_santaana.json'), 'utf8')
        );

        // Process each feature from Santa Ana
        console.log('Uploading Santa Ana properties to Supabase...');
        for (const feature of santaanaData.features) {
            const { finca_regi, oid, address, centroid } = feature.properties;
            const { geometry } = feature;
            if (!geometry || !geometry.type) continue;
            console.log(`Uploading property ${finca_regi} with geometry type: ${geometry.type}`);

            // Insert or update the property in Supabase
            const { data, error } = await supabase
                .from('properties')
                .upsert({
                    finca_regi,
                    oid,
                    address,
                    geometry,
                    centroid
                }, { onConflict: 'finca_regi' });

            if (error) {
                console.error(`Error uploading Santa Ana property ${finca_regi}:`, error);
            } else {
                console.log(`Santa Ana property ${finca_regi} uploaded successfully.`);
            }
        }

        console.log('Santa Ana upload complete!');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run if called directly
if (require.main === module) {
    uploadProperties().catch(console.error);
}

module.exports = { uploadProperties }; 