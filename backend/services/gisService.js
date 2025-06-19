/**
 * GIS Service - Handles GIS data operations
 * Provides functionality for downloading, processing and storing GIS data
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const https = require('https');

class GISService {
    constructor() {
        this.snitBaseUrl = 'https://www.snitcr.go.cr/';
        this.catastroUrl = 'https://www.snitcr.go.cr/Metadatos/full_metadata?k=Y2FwYTo6Ukk6OmNhdGFzdHJv';
        this.catastroAldiaUrl = 'https://www.snitcr.go.cr/Metadatos/full_metadata?k=Y2FwYTo6Ukk6OmNhdGFzdHJvX2FsZGlh';
    }

    async getPropertyBoundaries(coordinates) {
        try {
            // Get WFS data from SNIT
            const wfsUrl = `${this.snitBaseUrl}geoserver/wfs`;
            const params = {
                service: 'WFS',
                version: '2.0.0',
                request: 'GetFeature',
                typeName: 'catastro:catastro',
                srsName: 'EPSG:4326',
                bbox: `${coordinates.lng - 0.001},${coordinates.lat - 0.001},${coordinates.lng + 0.001},${coordinates.lat + 0.001}`
            };

            const response = await axios.get(wfsUrl, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching property boundaries:', error);
            throw error;
        }
    }

    async getPropertyDetails(propertyId) {
        try {
            // Get property details from SNIT
            const response = await axios.get(`${this.snitBaseUrl}api/properties/${propertyId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching property details:', error);
            throw error;
        }
    }

    async searchPropertiesByArea(bounds) {
        try {
            // Search properties within specified bounds
            const wfsUrl = `${this.snitBaseUrl}geoserver/wfs`;
            const params = {
                service: 'WFS',
                version: '2.0.0',
                request: 'GetFeature',
                typeName: 'catastro:catastro',
                srsName: 'EPSG:4326',
                bbox: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
            };

            const response = await axios.get(wfsUrl, { params });
            return response.data;
        } catch (error) {
            console.error('Error searching properties:', error);
            throw error;
        }
    }

    async getEscazuPlots() {
        try {
            // Use local GeoJSON file with Escazu plots data
            const dataPath = path.join(__dirname, '../../data/escazu_plots.json');
            const fileData = await fs.promises.readFile(dataPath, 'utf8');
            return JSON.parse(fileData);
        } catch (error) {
            console.error('Error reading Escazu plots data:', error);
            // If file not found, return an empty GeoJSON
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }
}

// URL for Escazu GIS web service
const ESCAZU_GIS_URL = 'https://gis.escazu.go.cr/server/rest/services/Mapa_Predial_2024/MapServer';

// Specific layer IDs within the Escazu GIS service
const LAYERS = {
    PLOTS: 0, // Layer ID for property plots
    ZONING: 1  // Layer ID for zoning information
};

// The bounds of Escazu for our queries - expanded to cover more area
const ESCAZU_BOUNDS = {
    xmin: -84.18, // Expanded west
    ymin: 9.88,   // Expanded south
    xmax: -84.08, // Expanded east
    ymax: 9.97,   // Expanded north
    spatialReference: { wkid: 4326 } // WGS84
};

// Local data paths
const dataPath = path.join(__dirname, '../../data/escazu_plots.json');
const dataPathRaw = path.join(__dirname, '../../data/escazu_plots_raw.json');
const dataDir = path.join(__dirname, '../../data');

/**
 * Ensures the data directory exists
 */
function ensureDataDirExists() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory at ${dataDir}`);
    }
}

/**
 * Fetches property plot data from the Escazu GIS service
 * @param {Object} bounds - Geographic bounds to query within
 * @param {number} layerId - ID of the layer to query
 * @returns {Promise<Object>} - GeoJSON data
 */
async function fetchEscazuPlots(bounds = ESCAZU_BOUNDS, layerId = LAYERS.PLOTS) {
    try {
        console.log('Fetching Escazu plot data from GIS server...');
        
        // Construct query URL for the GIS service
        const queryUrl = `${ESCAZU_GIS_URL}/${layerId}/query`;
        
        // Build query parameters for a comprehensive query
        const params = new URLSearchParams({
            where: '1=1', // Get all features
            outFields: '*', // Get all fields
            geometry: JSON.stringify(bounds),
            geometryType: 'esriGeometryEnvelope',
            inSR: 4326, // WGS84
            outSR: 4326, // WGS84
            spatialRel: 'esriSpatialRelIntersects',
            returnGeometry: true,
            f: 'json', // Format as JSON
            resultRecordCount: 5000 // Increased to get more records
        });
        
        const fullUrl = `${queryUrl}?${params.toString()}`;
        console.log(`Requesting data from: ${fullUrl}`);
        
        // For development purposes, bypass certificate verification
        // IMPORTANT: In production, use proper certificate validation
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false // Bypass certificate verification for development only
        });
        
        // Use axios with certificate verification bypass
        const response = await axios.get(fullUrl, {
            timeout: 180000, // 3 minute timeout
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'DOMUS-RealEstate/1.0'
            },
            httpsAgent: httpsAgent
        });
        
        if (response.status !== 200) {
            throw new Error(`Failed to fetch GIS data: ${response.statusText} (${response.status})`);
        }
        
        const data = response.data;
        
        // Check if the response contains an error
        if (data.error) {
            throw new Error(`GIS service error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        
        console.log(`Fetched ${data.features?.length || 0} features from GIS service`);
        
        // If we received the maximum number of records, it might be truncated
        if (data.features?.length >= 5000) {
            console.warn('Reached record limit of 5000. Data may be incomplete.');
            console.warn('Consider splitting the query into smaller geographic areas.');
        }
        
        // Create data directory if it doesn't exist
        ensureDataDirExists();
        
        // Save raw data
        fs.writeFileSync(dataPathRaw, JSON.stringify(data, null, 2));
        console.log(`Saved raw GIS data to ${dataPathRaw}`);
        
        // Convert to GeoJSON
        const geoJson = convertToGeoJSON(data);
        
        // Save processed GeoJSON
        fs.writeFileSync(dataPath, JSON.stringify(geoJson, null, 2));
        console.log(`Saved processed GeoJSON data to ${dataPath}`);
        
        return geoJson;
    } catch (error) {
        console.error('Error fetching Escazu plot data:', error);
        
        // Try to load existing file if fetch fails
        try {
            if (fs.existsSync(dataPath)) {
                console.log('Loading existing GIS data file as fallback...');
                const existingData = fs.readFileSync(dataPath, 'utf8');
                return JSON.parse(existingData);
            } else {
                console.error('No existing data file found');
                
                // Return empty GeoJSON instead of creating sample data
                console.log('Creating empty GeoJSON structure...');
                const emptyData = {
                    type: 'FeatureCollection',
                    features: []
                };
                
                // Ensure data directory exists
                ensureDataDirExists();
                
                // Save empty data structure
                fs.writeFileSync(dataPath, JSON.stringify(emptyData, null, 2));
                console.log(`Saved empty GeoJSON structure to ${dataPath}`);
                
                return emptyData;
            }
        } catch (readError) {
            console.error('Could not read existing data file:', readError);
            
            // Return empty structure
            const emptyData = {
                type: 'FeatureCollection',
                features: []
            };
            
            return emptyData;
        }
    }
}

/**
 * Fetches multiple geographic areas and combines them to get more complete data
 * @returns {Promise<Object>} - Combined GeoJSON data
 */
async function fetchAllEscazuPlots() {
    console.log('Fetching all Escazu plots from multiple areas...');
    
    // Define grid size for splitting large areas
    const gridSize = 0.02; // About 2km grid size
    
    // Define the main areas that need to be split
    const areas = [
        // Northwest Escazu
        {
            xmin: -84.18,
            ymin: 9.92,
            xmax: -84.13,
            ymax: 9.97,
            name: "Northwest"
        },
        // Northeast Escazu
        {
            xmin: -84.13,
            ymin: 9.92,
            xmax: -84.08,
            ymax: 9.97,
            name: "Northeast"
        },
        // Southwest Escazu
        {
            xmin: -84.18,
            ymin: 9.88,
            xmax: -84.13,
            ymax: 9.92,
            name: "Southwest"
        },
        // Southeast Escazu
        {
            xmin: -84.13,
            ymin: 9.88,
            xmax: -84.08,
            ymax: 9.92,
            name: "Southeast"
        }
    ];
    
    // Create a set to track unique property IDs
    const uniqueIds = new Set();
    let allFeatures = [];
    
    // Process each area
    for (const area of areas) {
        console.log(`Processing ${area.name} area...`);
        
        // Split area into smaller grids
        const grids = splitAreaIntoGrids(area, gridSize);
        console.log(`Split ${area.name} into ${grids.length} grids`);
        
        // Process each grid
        for (const grid of grids) {
            console.log(`Fetching data for grid: ${JSON.stringify(grid)}`);
            
            try {
                const data = await fetchEscazuPlots(grid);
                
                if (data && data.features) {
                    // Filter out duplicates based on the top-level feature id
                    data.features.forEach(feature => {
                        const id = feature.id || feature.properties?.id || feature.properties?.objectId;
                        if (id && !uniqueIds.has(id)) {
                            uniqueIds.add(id);
                            allFeatures.push(feature);
                        }
                    });
                    
                    console.log(`Added ${data.features.length} features from grid`);
                }
            } catch (error) {
                console.error(`Error fetching grid data: ${error.message}`);
            }
            
            // Add a small delay between requests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log(`Total unique features found: ${allFeatures.length}`);
    
    // Create final GeoJSON
    const combinedData = {
        type: 'FeatureCollection',
        features: allFeatures
    };
    
    // Save combined data
    try {
        ensureDataDirExists();
        fs.writeFileSync(dataPath, JSON.stringify(combinedData, null, 2));
        console.log(`Saved combined GeoJSON data to ${dataPath}`);
    } catch (error) {
        console.error('Error saving combined data:', error);
    }
    
    return combinedData;
}

/**
 * Splits an area into smaller grid sections
 * @param {Object} area - The area to split
 * @param {number} gridSize - Size of each grid section in degrees
 * @returns {Array<Object>} - Array of grid sections
 */
function splitAreaIntoGrids(area, gridSize) {
    const grids = [];
    
    for (let x = area.xmin; x < area.xmax; x += gridSize) {
        for (let y = area.ymin; y < area.ymax; y += gridSize) {
            grids.push({
                xmin: x,
                ymin: y,
                xmax: Math.min(x + gridSize, area.xmax),
                ymax: Math.min(y + gridSize, area.ymax),
                spatialReference: { wkid: 4326 }
            });
        }
    }
    
    return grids;
}

/**
 * Updates the GIS data by fetching fresh data from the server
 * @returns {Promise<Object>} - The updated GeoJSON data
 */
async function updateGISData() {
    console.log('Forcing update of GIS data...');
    
    try {
        // Delete existing data files to force a fresh fetch
        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath);
            console.log('Deleted existing GeoJSON data file');
        }
        if (fs.existsSync(dataPathRaw)) {
            fs.unlinkSync(dataPathRaw);
            console.log('Deleted existing raw data file');
        }
        
        // Fetch fresh data from all areas
        const data = await fetchAllEscazuPlots();
        console.log(`Successfully updated GIS data with ${data.features.length} features`);
        return data;
    } catch (error) {
        console.error('Error updating GIS data:', error);
        throw error;
    }
}

/**
 * Gets the GIS data, either from local file or by fetching from the service
 * @param {boolean} forceFetch - Force fetching from the service even if local file exists
 * @returns {Promise<Object>} - GeoJSON data
 */
async function getGISData(forceFetch = false) {
    ensureDataDirExists();
    
    // Check if we already have the data locally
    if (!forceFetch && fs.existsSync(dataPath)) {
        try {
            console.log('Reading GIS data from local file...');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            console.log(`Loaded ${data.features.length} features from local file`);
            return data;
        } catch (error) {
            console.error('Error reading local GIS data:', error);
            console.log('Falling back to fetching from GIS service...');
            // Fall back to fetching from service
        }
    }
    
    // Fetch from service if needed
    return fetchAllEscazuPlots();
}

/**
 * Gets property details for a specific plot
 * @param {string} plotId - ID of the plot to get details for
 * @returns {Promise<Object>} - Property details
 */
async function getPropertyDetails(plotId) {
    try {
        // Get GIS data
        const gisData = await getGISData();
        
        // Find the plot by ID
        const plot = gisData.features.find(feature => 
            feature.properties.id === plotId || 
            feature.properties.originalId === plotId
        );
        
        if (!plot) {
            throw new Error(`Plot with ID ${plotId} not found`);
        }
        
        // Return plot data
        return {
            plotId: plot.properties.id,
            originalId: plot.properties.originalId,
            zona: plot.properties.zona,
            distrito: plot.properties.distrito,
            area: plot.properties.area,
            center: plot.properties.center,
            geometry: plot.geometry,
            attributes: plot.properties.rawAttributes || plot.properties
        };
    } catch (error) {
        console.error(`Error getting property details for plot ${plotId}:`, error);
        throw error;
    }
}

/**
 * Converts ESRI feature set to GeoJSON
 * @param {Object} esriData - ESRI feature set
 * @returns {Object} - GeoJSON object
 */
function convertToGeoJSON(esriData) {
    // Initialize GeoJSON structure
    const geoJson = {
        type: 'FeatureCollection',
        features: []
    };
    
    // Check if features exist
    if (!esriData.features || esriData.features.length === 0) {
        console.warn('No features found in ESRI data');
        return geoJson;
    }
    
    // Process each feature
    geoJson.features = esriData.features.map((feature, index) => {
        // Extract all attributes
        const attributes = feature.attributes || {};
        
        // Create a unique ID for the feature
        // Try to use any predial identifier first
        const numPredial = attributes.NUM_PREDIAL || attributes.PREDIAL || attributes.FINCA || attributes.NUMERO_PREDIAL || '';
        const objectId = attributes.OBJECTID || attributes.FID || attributes.ID || '';
        
        // Use predial number if available, otherwise use object ID or generate one
        const id = numPredial ? `PREDIAL-${numPredial}` : (objectId ? `OID-${objectId}` : `escazu-plot-${index + 1}`);
        
        // Determine zoning type with comprehensive checks
        let zona = 'Desconocido';
        
        if (attributes.ZONIFICACION) {
            const zoningText = attributes.ZONIFICACION.toString().toUpperCase();
            if (zoningText.includes('RESI')) {
                zona = 'Residencial';
            } else if (zoningText.includes('COMER')) {
                zona = 'Comercial';
            } else if (zoningText.includes('MIXTO') || (zoningText.includes('RESI') && zoningText.includes('COMER'))) {
                zona = 'Mixto';
            } else if (zoningText.includes('INDU')) {
                zona = 'Industrial';
            } else if (zoningText.includes('VERDE') || zoningText.includes('PROTEC')) {
                zona = 'Zona Verde';
            } else if (zoningText.includes('INSTITU')) {
                zona = 'Institucional';
            } else {
                zona = `Otro: ${zoningText}`;
            }
        }
        
        // Extract geometry
        let geometry = null;
        if (feature.geometry) {
            // Convert ESRI geometry to GeoJSON
            if (feature.geometry.rings) {
                // It's a polygon
                geometry = {
                    type: 'Polygon',
                    coordinates: feature.geometry.rings
                };
            } else if (feature.geometry.paths) {
                // It's a line
                geometry = {
                    type: 'MultiLineString',
                    coordinates: feature.geometry.paths
                };
            } else if (feature.geometry.points) {
                // It's a point collection
                geometry = {
                    type: 'MultiPoint',
                    coordinates: feature.geometry.points
                };
            } else if (feature.geometry.x !== undefined && feature.geometry.y !== undefined) {
                // It's a point
                geometry = {
                    type: 'Point',
                    coordinates: [feature.geometry.x, feature.geometry.y]
                };
            }
        }
        
        // If no geometry, skip this feature
        if (!geometry) {
            console.warn(`Feature ${id} has no geometry, skipping`);
            return null;
        }
        
        // Calculate area if missing (approximate)
        let area = attributes.AREA;
        if (!area && geometry && geometry.type === 'Polygon') {
            area = calculatePolygonArea(geometry.coordinates[0]);
        }
        
        // Calculate center point if it's a polygon
        let center = null;
        if (geometry && geometry.type === 'Polygon') {
            center = calculatePolygonCenter(geometry.coordinates[0]);
        }
        
        // Build feature properties
        const properties = {
            id: id,
            objectId: objectId,
            numPredial: numPredial,
            zona: zona,
            distrito: attributes.DISTRITO || 'Escazu',
            area: area || 0,
            center: center,
            // Store all original attributes for complete access to predial data
            rawAttributes: { ...attributes }
        };
        
        // Add all other original attributes directly
        Object.keys(attributes).forEach(key => {
            properties[key] = attributes[key];
        });
        
        // Return the feature
        return {
            type: 'Feature',
            id: id, // Ensure the ID is at the top level for feature state
            properties: properties,
            geometry: geometry
        };
    }).filter(Boolean); // Remove null features
    
    console.log(`Converted ${geoJson.features.length} features to GeoJSON`);
    return geoJson;
}

/**
 * Calculate the approximate area of a polygon in square meters
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @returns {number} - Area in square meters (approximate)
 */
function calculatePolygonArea(coordinates) {
    // Simple calculation for small areas (not accounting for Earth's curvature)
    if (!coordinates || coordinates.length < 3) {
        return 0;
    }
    
    // Constants for conversion
    const EARTH_RADIUS = 6371000; // meters
    const DEG_TO_RAD = Math.PI / 180;
    
    // Calculate a very rough approximation by converting to a flat projection
    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        // Convert to approximate meters
        const x1 = coordinates[i][0] * DEG_TO_RAD * EARTH_RADIUS * Math.cos(coordinates[i][1] * DEG_TO_RAD);
        const y1 = coordinates[i][1] * DEG_TO_RAD * EARTH_RADIUS;
        const x2 = coordinates[i+1][0] * DEG_TO_RAD * EARTH_RADIUS * Math.cos(coordinates[i+1][1] * DEG_TO_RAD);
        const y2 = coordinates[i+1][1] * DEG_TO_RAD * EARTH_RADIUS;
        
        area += (x1 * y2 - x2 * y1);
    }
    
    return Math.abs(area / 2);
}

/**
 * Calculate the center point of a polygon
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @returns {Array} - [longitude, latitude] of the center
 */
function calculatePolygonCenter(coordinates) {
    if (!coordinates || coordinates.length < 3) {
        return null;
    }
    
    // Calculate centroid (simple average of all coordinates)
    let sumX = 0;
    let sumY = 0;
    
    for (let i = 0; i < coordinates.length; i++) {
        sumX += coordinates[i][0];
        sumY += coordinates[i][1];
    }
    
    return [sumX / coordinates.length, sumY / coordinates.length];
}

/**
 * Returns an empty GeoJSON structure
 * @returns {Object} - Empty GeoJSON structure
 */
function createSampleGeoJSON() {
    console.log('Sample data generation disabled - returning empty GeoJSON structure');
    return {
        type: 'FeatureCollection',
        features: []
    };
}

module.exports = {
    getGISData,
    updateGISData,
    getPropertyDetails,
    fetchEscazuPlots,
    fetchAllEscazuPlots,
    convertToGeoJSON,
    calculatePolygonArea,
    calculatePolygonCenter
}; 