/**
 * GIS Data Update Test
 * 
 * This script directly tests the GIS data update process
 * It uses the gisService to download all real property data from the Escazu GIS system
 */

// Import required modules
const path = require('path');
const fs = require('fs');

// Import the gisService functions
const { 
    fetchAllEscazuPlots, 
    updateGISData, 
    getGISData 
} = require('./backend/services/gisService');

// Start time for tracking
const startTime = Date.now();

// Main function to test GIS data update
async function testGISUpdate() {
    console.log('Starting GIS Update Test');
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log('-'.repeat(80));

    try {
        // Check if data directory exists
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            console.log(`Creating data directory at ${dataDir}`);
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Perform the update
        console.log('Starting full GIS data update...');
        console.log('Fetching data from all Escazu zones - this may take several minutes');

        const data = await fetchAllEscazuPlots();
        
        // Log results
        console.log('-'.repeat(80));
        console.log('GIS Update Results:');
        console.log(`- Total features fetched: ${data.features.length}`);
        console.log(`- Elapsed time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
        console.log(`- Data saved to: ${path.join(__dirname, 'data', 'escazu_plots.json')}`);
        
        // Show sample of data
        if (data.features.length > 0) {
            console.log('-'.repeat(80));
            console.log('Sample of first feature:');
            const sample = data.features[0];
            console.log(`- ID: ${sample.id}`);
            console.log(`- Type: ${sample.geometry.type}`);
            console.log('- Properties:');
            Object.keys(sample.properties).slice(0, 10).forEach(key => {
                console.log(`  - ${key}: ${sample.properties[key]}`);
            });
            if (Object.keys(sample.properties).length > 10) {
                console.log(`  - ... and ${Object.keys(sample.properties).length - 10} more properties`);
            }
        }
        
        return 0; // Success
    } catch (error) {
        console.error('-'.repeat(80));
        console.error('Error running GIS update test:');
        console.error(error);
        return 1; // Error
    }
}

// Run the test
testGISUpdate()
    .then(exitCode => {
        console.log('-'.repeat(80));
        console.log(`Test completed with exit code: ${exitCode}`);
        process.exit(exitCode);
    })
    .catch(err => {
        console.error('-'.repeat(80));
        console.error('Unhandled error during test:');
        console.error(err);
        process.exit(1);
    }); 