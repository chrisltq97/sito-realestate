// Usage: node upload_escazu_to_supabase.js
// IMPORTANT: Replace the values below with your actual Supabase project URL and service_role key!

const SUPABASE_URL = 'https://qbdnyqpdiatikjxavmmr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZG55cXBkaWF0aWtqeGF2bW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTk0NjE0NCwiZXhwIjoyMDY1NTIyMTQ0fQ.YaBV6m_oe4Gr40n9QU-FMJrR0r7lu3wnHhNV9pvnu8Y'; // <-- REPLACE THIS

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_PATH = path.join(__dirname, '../public/data/cleaned_properties_escazu.json');

async function uploadProperties() {
  try {
    // Read cleaned properties file for Escazu
    console.log('Reading cleaned properties file for Escazu...');
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const allProps = JSON.parse(raw);
    const features = allProps.features;

    // Upload each property
    console.log('Uploading properties to Supabase...');
    for (const feature of features) {
      const props = feature.properties || {};
      const finca_regi = props.finca_regi;
      const oid = props.oid || props.objectId || null;
      const address = props.address || '';
      const centroid = props.center || null;
      const geometry_geojson = feature.geometry ? feature.geometry : null;

      // Insert or update the property in Supabase
      const { data, error } = await supabase
        .from('properties')
        .upsert({
          finca_regi,
          oid,
          address,
          geometry,
          centroid,
          geometry_geojson // Only insert into geometry_geojson column
        }, { onConflict: 'finca_regi' });

      if (error) {
        console.error(`Error uploading property ${finca_regi}:`, error);
      } else {
        console.log(`Property ${finca_regi} uploaded successfully.`);
      }
    }

    console.log('Upload complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadProperties(); 