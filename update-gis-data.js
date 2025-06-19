/**
 * Escazu GIS Data Update Script
 * 
 * This script updates the GIS data by calling the gisService directly
 * Can be run from the command line: node update-gis-data.js
 */

// Import the required modules
const { fetchAllEscazuPlots } = require('./backend/services/gisService');
const path = require('path');
const fs = require('fs');

// Start time for tracking
const startTime = Date.now();

console.log('Starting Escazu GIS data update...');
console.log(`Time: ${new Date().toLocaleString()}`);

// Process command line arguments
const args = process.argv.slice(2);
const forceRefresh = args.includes('--force');

// Run the update
async function runUpdate() {
    try {
        // Ensure data directory exists
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            console.log(`Creating data directory at ${dataDir}`);
            fs.mkdirSync(dataDir, { recursive: true });
        }

        console.log('Connecting to Escazu GIS service...');
        console.log('This may take several minutes as we fetch data from multiple areas');
        
        // Fetch all GIS data (this will save the file automatically)
        const geoJson = await fetchAllEscazuPlots();
        
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Completed successfully in ${elapsedTime} seconds!`);
        console.log(`Downloaded ${geoJson.features.length} property plots`);
        console.log(`Data saved to ${path.join(__dirname, 'data', 'escazu_plots.json')}`);
        
        return 0; // Success
    } catch (error) {
        console.error('Error updating GIS data:');
        console.error(error);
        return 1; // Error
    }
}

// Run the update and handle exit
runUpdate()
    .then(exitCode => {
        process.exit(exitCode);
    })
    .catch(err => {
        console.error('Unhandled error:', err);
        process.exit(1);
    }); 