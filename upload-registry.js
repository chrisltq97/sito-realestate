const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping for common Spanish number words
const wordToNumber = {
  'CIEN': 100,
  'MIL': 1000,
  'UN MILLON': 1000000,
  'DOS MIL': 2000,
  'TRES MIL': 3000,
  'CUATRO MIL': 4000,
  'CINCO MIL': 5000,
  'DIEZ MIL': 10000,
  // Add more as needed
};

// Spanish month abbreviation to number mapping
const monthMap = {
  'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
  'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
  'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
};

function extractNumber(str) {
  if (!str) return null;
  // Try to extract a number (with or without commas/decimals)
  const numMatch = str.replace(/\./g, '').match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+/g);
  if (numMatch) {
    // Remove commas and parse as float
    return parseFloat(numMatch[0].replace(/,/g, ''));
  }
  // Try to match Spanish number words
  const upper = str.toUpperCase().trim();
  for (const [word, value] of Object.entries(wordToNumber)) {
    if (upper.includes(word)) return value;
  }
  return null;
}

function detectCurrency(str) {
  if (!str) return null;
  const upper = str.toUpperCase();
  if (upper.includes('DOLAR')) return 'USD';
  if (upper.includes('COLON')) return 'CRC';
  return null;
}

function extractAndFormatDate(str) {
  if (!str) return null;
  // Match DD-MMM-YYYY (MMM = 3 uppercase letters)
  const match = str.match(/(\d{2})-([A-Z]{3})-(\d{4})/i);
  if (match) {
    const day = match[1];
    const month = monthMap[match[2].toUpperCase()];
    const year = match[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

async function deleteIncorrectData() {
    try {
        // Read enriched properties file to get finca_regi values
        const registryData = JSON.parse(
            fs.readFileSync(path.join(__dirname, 'backend/public/data/enriched_properties.json'), 'utf8')
        );
        const fincaRegis = registryData.map(entry => entry.finca_regi);

        // Delete entries from properties table where finca_regi matches
        const { error } = await supabase
            .from('properties')
            .delete()
            .in('finca_regi', fincaRegis);

        if (error) {
            console.error('Error deleting incorrect data:', error);
        } else {
            console.log('Incorrect data deleted successfully.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function uploadRegistry() {
    try {
        // Read enriched properties file from backend/public/data/
        console.log('Reading enriched properties file...');
        const registryData = JSON.parse(
            fs.readFileSync(path.join(__dirname, 'backend/public/data/enriched_properties.json'), 'utf8')
        );

        // Process each registry entry
        console.log('Uploading enriched properties to Supabase...');
        for (const entry of registryData) {
            const finca_regi = entry.finca_regi;
            const reg = entry.registry || {};
            // Extract and clean values
            const naturaleza = reg.naturaleza || null;
            const size_text = reg.size || null;
            const size = extractNumber(reg.size);
            const fiscal_value = extractNumber(reg.fiscal_value);
            const currency_fiscal_value = detectCurrency(reg.fiscal_value) || 'CRC';
            const sale_date = extractAndFormatDate(reg.sale_date);
            const estimacion_precio = extractNumber(reg.estimacion_precio);
            const currency_estimacion_precio = detectCurrency(reg.estimacion_precio);
            const gravamenes = reg.gravamenes || null;

            // Insert or update the registry entry in Supabase
            const { data, error } = await supabase
                .from('registry_data')
                .upsert({
                    finca_regi,
                    naturaleza,
                    size,
                    size_text,
                    fiscal_value,
                    currency_fiscal_value,
                    sale_date,
                    estimacion_precio,
                    currency_estimacion_precio,
                    gravamenes
                }, { onConflict: 'finca_regi' });

            if (error) {
                console.error(`Error uploading registry entry ${finca_regi}:`, error);
            } else {
                console.log(`Registry entry ${finca_regi} uploaded successfully.`);
            }
        }

        console.log('Registry upload complete!');
    } catch (error) {
        console.error('Error uploading registry data:', error);
    }
}

// First delete incorrect data, then upload registry data
deleteIncorrectData().then(() => uploadRegistry()); 