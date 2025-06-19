/**
 * Test GIS Update
 * 
 * This script tests the GIS service by updating the plot data
 */

// Import the required modules
const path = require('path');
const fs = require('fs');
const { fetchEscazuPlots, convertToGeoJSON, calculatePolygonArea, calculatePolygonCenter } = require('./backend/services/gisService');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory at ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

// Test GIS data update
async function testGISUpdate() {
    console.log('Starting GIS data update test...');
    
    try {
        // Mock ESRI response data with sample data
        const mockData = {
            features: [
                {
                    attributes: {
                        OBJECTID: 1,
                        AREA: 500,
                        ZONIFICACION: 'RESIDENCIAL',
                        DISTRITO: 'Escazu'
                    },
                    geometry: {
                        rings: [
                            [
                                [-84.1445, 9.9181],
                                [-84.1435, 9.9181],
                                [-84.1435, 9.9171],
                                [-84.1445, 9.9171],
                                [-84.1445, 9.9181]
                            ]
                        ]
                    }
                },
                {
                    attributes: {
                        OBJECTID: 2,
                        AREA: 800,
                        ZONIFICACION: 'COMERCIAL',
                        DISTRITO: 'Escazu'
                    },
                    geometry: {
                        rings: [
                            [
                                [-84.1465, 9.9181],
                                [-84.1455, 9.9181],
                                [-84.1455, 9.9171],
                                [-84.1465, 9.9171],
                                [-84.1465, 9.9181]
                            ]
                        ]
                    }
                },
                {
                    attributes: {
                        OBJECTID: 3,
                        AREA: 1200,
                        ZONIFICACION: 'MIXTO',
                        DISTRITO: 'San Rafael'
                    },
                    geometry: {
                        rings: [
                            [
                                [-84.1225, 9.9251],
                                [-84.1215, 9.9251],
                                [-84.1215, 9.9241],
                                [-84.1225, 9.9241],
                                [-84.1225, 9.9251]
                            ]
                        ]
                    }
                }
            ]
        };
        
        // Convert ESRI data to GeoJSON
        const geoJson = convertToGeoJSON(mockData);
        
        // Write to sample file
        const samplePath = path.join(dataDir, 'sample_escazu_plots.json');
        fs.writeFileSync(samplePath, JSON.stringify(geoJson, null, 2));
        
        console.log(`Sample data written to ${samplePath} with ${geoJson.features.length} features`);
        
        // Try to fetch real data if available
        try {
            // Define the bounds for Escazu
            const bounds = {
                xmin: -84.15,
                ymin: 9.90,
                xmax: -84.10,
                ymax: 9.95,
                spatialReference: { wkid: 4326 }
            };
            
            // Attempt to fetch real data (this might fail if the service is not available)
            const realData = await fetchEscazuPlots(bounds);
            
            // Write real data to file
            const realPath = path.join(dataDir, 'escazu_plots.json');
            fs.writeFileSync(realPath, JSON.stringify(realData, null, 2));
            
            console.log(`Real data written to ${realPath} with ${realData.features.length} features`);
        } catch (error) {
            console.warn('Could not fetch real data:', error.message);
            console.log('Using sample data only');
            
            // Write sample data to main file as fallback
            const mainPath = path.join(dataDir, 'escazu_plots.json');
            fs.writeFileSync(mainPath, JSON.stringify(geoJson, null, 2));
        }
        
        console.log('GIS data update test completed successfully');
    } catch (error) {
        console.error('Error testing GIS update:', error);
    }
}

// Run the test
testGISUpdate(); 