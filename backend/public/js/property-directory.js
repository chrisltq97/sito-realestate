/**
 * Property Directory System
 * Handles storage, retrieval, and display of property data for the cadastral system
 */

// Cache for property data to minimize API calls
const propertyCache = new Map();
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Property types and their icons
const PROPERTY_TYPES = {
    'House': { icon: 'home', color: '#4CAF50' },
    'Apartment': { icon: 'building', color: '#2196F3' },
    'Land': { icon: 'mountain', color: '#795548' },
    'Commercial': { icon: 'store', color: '#F44336' },
    'Industrial': { icon: 'industry', color: '#FF9800' },
    'Mixed Use': { icon: 'city', color: '#9C27B0' },
    'Condominium': { icon: 'house-user', color: '#3F51B5' },
    'Unknown': { icon: 'question', color: '#9E9E9E' }
};

// Zoning types and their descriptions
const ZONING_TYPES = {
    'RESIDENCIAL': 'Low-density residential area',
    'RESIDENCIAL ALTA DENSIDAD': 'High-density residential area',
    'COMERCIAL': 'Commercial use area',
    'MIXTO RESIDENCIAL-COMERCIAL': 'Mixed residential and commercial use',
    'ZONA VERDE': 'Green zone/protected area',
    'INDUSTRIAL': 'Industrial use area',
    'INSTITUCIONAL': 'Institutional/governmental use'
};

/**
 * Gets property information from local data only
 * @param {string} parcelId - Property identifier
 * @returns {Promise<Object>} - Property data
 */
async function getPropertyInfo(parcelId) {
    try {
        // Check cache first
        const cached = propertyCache.get(parcelId);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
            console.log(`Using cached property data for ${parcelId}`);
            return cached.data;
        }

        // Try to load from the local data file
        console.log(`Trying to load property ${parcelId} from local data...`);
        
        try {
            const response = await fetch('./data/escazu_plots.json');
            if (response.ok) {
                const geoJson = await response.json();
                if (geoJson && geoJson.features) {
                    // Find the property in the GeoJSON
                    const feature = geoJson.features.find(f => 
                        f.id === parcelId || 
                        (f.properties && f.properties.id === parcelId)
                    );
                    
                    if (feature) {
                        console.log(`Found property ${parcelId} in local data`);
                        const property = convertGISToProperty(feature.properties, parcelId);
                        
                        // Cache it
                        propertyCache.set(parcelId, {
                            data: property,
                            timestamp: Date.now()
                        });
                        
                        return property;
                    }
                }
                console.log(`Property ${parcelId} not found in local data`);
            }
        } catch (error) {
            console.error(`Error loading local data for property ${parcelId}:`, error);
        }
        
        // Otherwise return null - no mock data
        console.log(`No property data found for ${parcelId}`);
        return null;
    } catch (error) {
        console.error(`Error getting property info for ${parcelId}:`, error);
        throw error;
    }
}

/**
 * Converts GIS property data to our property format
 * @param {Object} gisData - GIS property data
 * @param {string} parcelId - Property identifier
 * @returns {Object} - Formatted property data
 */
function convertGISToProperty(gisData, parcelId) {
    // Extract or generate coordinates from center of polygon or from parcelId
    let coordinates = gisData.center || [-84.13, 9.92]; // Default to Escazu center
    
    if (!coordinates && parcelId.startsWith('P-')) {
        const parts = parcelId.split('-');
        if (parts.length === 3) {
            coordinates = [parseFloat(parts[2]), parseFloat(parts[1])];
        }
    }
    
    // Map zona to property type
    let propertyType = 'Unknown';
    let zoning = gisData.zona || 'DESCONOCIDO';
    
    if (zoning === 'Residencial') {
        propertyType = Math.random() > 0.3 ? 'House' : 'Apartment';
    } else if (zoning === 'Comercial') {
        propertyType = 'Commercial';
    } else if (zoning === 'Mixto') {
        propertyType = 'Mixed Use';
    } else if (zoning.includes('INDU')) {
        propertyType = 'Industrial';
    }
    
    // Format area with units
    const area = typeof gisData.area === 'number' 
        ? `${Math.round(gisData.area)} m²` 
        : gisData.area;
    
    // Generate price based on zone and area
    const numericArea = typeof gisData.area === 'number' 
        ? gisData.area 
        : parseInt(String(gisData.area).replace(/[^\d]/g, ''), 10) || 500;
        
    const priceFactorByZone = {
        'Residencial': 2000,
        'Comercial': 2500,
        'Mixto': 2200,
        'Industrial': 1500,
        'DESCONOCIDO': 1000
    };
    
    const priceFactor = priceFactorByZone[gisData.zona] || 1000;
    const price = `$${Math.floor(numericArea * priceFactor).toLocaleString()}`;
    const priceRange = `$${Math.floor(numericArea * priceFactor * 0.9).toLocaleString()} - $${Math.floor(numericArea * priceFactor * 1.1).toLocaleString()}`;
    
    // Generate some consistent property features
    const seedValue = coordinates[0] * coordinates[1] * 100;
    const hasGarage = Math.abs(Math.floor(seedValue)) % 2 === 0;
    const garageSpaces = hasGarage ? 1 + (Math.abs(Math.floor(seedValue)) % 3) : 0;
    const bedrooms = propertyType === 'House' || propertyType === 'Apartment' ? 1 + (Math.abs(Math.floor(seedValue)) % 5) : 0;
    const bathrooms = propertyType === 'House' || propertyType === 'Apartment' ? 1 + (Math.abs(Math.floor(seedValue)) % 4) : 0;
    
    // Create address from district
    const streets = ['Calle Principal', 'Avenida Central', 'Calle Los Laureles', 'Avenida Escazú', 'Calle San Miguel'];
    const streetIndex = Math.abs(Math.floor(seedValue)) % streets.length;
    const number = 100 + (Math.abs(Math.floor(seedValue)) % 900);
    const address = `${number} ${streets[streetIndex]}`;
    
    // Create property object
    return {
        parcelId: parcelId,
        originalId: gisData.originalId,
        address: address,
        location: `${gisData.distrito || 'Escazú'}, San José`,
        area: area,
        zoning: zoning,
        zoningDescription: ZONING_TYPES[zoning] || 'Standard zoning',
        propertyType: propertyType,
        propertyTypeInfo: PROPERTY_TYPES[propertyType] || PROPERTY_TYPES['Unknown'],
        isCondoUnit: propertyType === 'Apartment' && Math.abs(Math.floor(seedValue)) % 3 === 0,
        yearBuilt: 1980 + (Math.abs(Math.floor(seedValue)) % 40),
        lastAssessment: 2020 + (Math.abs(Math.floor(seedValue + 1)) % 5),
        lastSaleDate: 2018 + (Math.abs(Math.floor(seedValue + 2)) % 7),
        lastSalePrice: price,
        estimatedPrice: priceRange,
        coordinates: coordinates,
        plotGeometry: gisData.geometry,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        garageSpaces: garageSpaces,
        // Include original GIS data for reference
        gisData: gisData
    };
}

// Override the getPropertyData function with our enhanced version
const originalGetPropertyData = getPropertyData;
getPropertyData = getPropertyInfo;

/**
 * Function that used to generate mock properties - now returns null
 * @param {string} parcelId - Property identifier
 * @returns {null} - No mock data
 */
function generateMockProperty(parcelId) {
    console.warn(`Mock property generation is disabled - no data available for ${parcelId}`);
    return null;
}

/**
 * Gets property data - now updated to not use mock data
 * @param {string} parcelId - Property identifier
 * @returns {Promise<Object>} - Property data or null if not found
 */
async function getPropertyData(parcelId) {
    // Check cache first
    const cached = propertyCache.get(parcelId);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        console.log(`Using cached property data for ${parcelId}`);
        return cached.data;
    }

    // Try to fetch from API - this is where you would implement real data retrieval
    try {
        const response = await fetch(`/api/properties/${parcelId}`);
        if (response.ok) {
            const data = await response.json();
            
            // Cache the data
            propertyCache.set(parcelId, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        }
    } catch (error) {
        console.error(`Error fetching property data for ${parcelId}:`, error);
    }
    
    // Return null instead of generating mock data
    return null;
}

/**
 * Get nearby properties for recommendation
 * Returns properties that are actually near the reference property
 * @param {Object} baseProperty - The reference property
 * @param {number} limit - Number of properties to return
 * @returns {Promise<Array>} - Array of nearby properties
 */
async function getNearbyProperties(baseProperty, limit = 3) {
    // In a real implementation, this would query the API for properties
    // near the specified coordinates
    
    const nearbyProperties = [];
    
    // Generate properties with slight coordinate variations
    // Use a grid pattern to ensure we get properties in different directions
    const directions = [
        { lat: 0.005, lng: 0 },     // North
        { lat: 0.005, lng: 0.005 }, // Northeast
        { lat: 0, lng: 0.005 },     // East
        { lat: -0.005, lng: 0.005 }, // Southeast
        { lat: -0.005, lng: 0 },    // South
        { lat: -0.005, lng: -0.005 }, // Southwest
        { lat: 0, lng: -0.005 },    // West
        { lat: 0.005, lng: -0.005 }  // Northwest
    ];
    
    // Select random directions to ensure variety
    const selectedDirections = [];
    while (selectedDirections.length < Math.min(limit, directions.length)) {
        const randomIndex = Math.floor(Math.random() * directions.length);
        if (!selectedDirections.includes(randomIndex)) {
            selectedDirections.push(randomIndex);
        }
    }
    
    // Generate nearby properties in those directions
    for (const dirIndex of selectedDirections) {
        const dir = directions[dirIndex];
        
        const coordinates = [
            baseProperty.coordinates[0] + dir.lng,
            baseProperty.coordinates[1] + dir.lat
        ];
        
        const parcelId = `P-${coordinates[1].toFixed(6)}-${coordinates[0].toFixed(6)}`;
        const property = await getPropertyData(parcelId);
        nearbyProperties.push(property);
    }
    
    return nearbyProperties;
}

/**
 * Update the property details page with data
 * This is called when the property-details.html page loads
 * @param {string} parcelId - The property parcel ID
 */
async function loadPropertyDetails(parcelId) {
    try {
        const property = await getPropertyData(parcelId);
        
        // Update the page with property details
        document.getElementById('propertyAddress').innerText = property.address;
        document.getElementById('propertyLocation').innerText = property.location;
        document.getElementById('propertyArea').innerText = property.area;
        document.getElementById('propertyZoning').innerText = property.zoning;
        document.getElementById('propertyParcelId').innerText = property.parcelId;
        document.getElementById('propertyType').innerText = property.propertyType;
        document.getElementById('propertyYear').innerText = property.yearBuilt;
        document.getElementById('propertyConstruction').innerText = property.constructionArea;
        document.getElementById('propertyAssessment').innerText = property.lastAssessment;
        document.getElementById('propertySaleDate').innerText = property.lastSaleDate;
        document.getElementById('propertySalePrice').innerText = property.lastSalePrice;
        document.getElementById('estimatedPrice').innerText = property.estimatedPrice;
        
        // Additional property details if available
        if (document.getElementById('propertyBedrooms')) {
            document.getElementById('propertyBedrooms').innerText = property.bedrooms || 'N/A';
        }
        
        if (document.getElementById('propertyBathrooms')) {
            document.getElementById('propertyBathrooms').innerText = property.bathrooms || 'N/A';
        }
        
        if (document.getElementById('propertyGarage')) {
            document.getElementById('propertyGarage').innerText = property.garageSpaces > 0 ? 
                `Yes (${property.garageSpaces} spaces)` : 'No';
        }
        
        // Handle condominium info if applicable
        if (property.isCondoUnit && property.condoInfo) {
            const condoSection = document.createElement('div');
            condoSection.className = 'property-section';
            condoSection.innerHTML = `
                <h2 class="section-title">Condominium Information</h2>
                <div class="property-details-table">
                    <div class="property-detail-row">
                        <span class="detail-label">Condominium Name</span>
                        <span class="detail-value">${property.condoInfo.name}</span>
                    </div>
                    <div class="property-detail-row">
                        <span class="detail-label">Total Units</span>
                        <span class="detail-value">${property.condoInfo.totalUnits}</span>
                    </div>
                    <div class="property-detail-row">
                        <span class="detail-label">Year Built</span>
                        <span class="detail-value">${property.condoInfo.yearBuilt}</span>
                    </div>
                    <div class="property-detail-row">
                        <span class="detail-label">Maintenance Fee</span>
                        <span class="detail-value">${property.condoInfo.maintenanceFee}</span>
                    </div>
                    <div class="property-detail-row">
                        <span class="detail-label">Amenities</span>
                        <span class="detail-value">${property.condoInfo.amenities.join(', ')}</span>
                    </div>
                </div>
            `;
            
            // Insert after the property details section
            const detailsSection = document.querySelector('.property-section');
            detailsSection.parentNode.insertBefore(condoSection, detailsSection.nextSibling);
        }
        
        // Add zoning description
        if (property.zoningDescription) {
            const zoningElement = document.getElementById('propertyZoning');
            if (zoningElement) {
                zoningElement.innerHTML = `${property.zoning} <small class="zoning-description">${property.zoningDescription}</small>`;
            }
        }
        
        // Initialize map with property location
        initializePropertyMap(property);
        
        // Load nearby properties
        loadNearbyPropertiesForDetail(property);
    } catch (error) {
        console.error('Error loading property details:', error);
        document.getElementById('propertyAddress').innerText = 'Error loading property details';
    }
}

/**
 * Initialize the map on the property detail page
 * @param {Object} property - Property data
 */
function initializePropertyMap(property) {
    const mapContainer = document.getElementById('propertyMap');
    if (!mapContainer) return;
    
    // Initialize Mapbox
    mapboxgl.accessToken = 'pk.eyJ1IjoiZG9tdXNyZWFsZXN0YXRlIiwiYSI6ImNscXFmaTAycTF1MGoya3BpNWQ3MWxyc2kifQ.HpEu4Phjf7_QcYmFmVK90Q';
    
    const map = new mapboxgl.Map({
        container: 'propertyMap',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: property.coordinates,
        zoom: 17
    });
    
    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add property marker
    const markerEl = document.createElement('div');
    markerEl.className = 'property-marker-outline';
    
    new mapboxgl.Marker({
        element: markerEl
    })
    .setLngLat(property.coordinates)
    .addTo(map);
    
    // Add the property plot from our local data when map loads
    map.on('load', async () => {
        try {
            // Try to load the property's plot from our local data
            const response = await fetch('./data/escazu_plots.json');
            if (response.ok) {
                const geoJson = await response.json();
                
                // Find the matching plot
                const plot = geoJson.features.find(f => 
                    f.id === property.parcelId || 
                    (f.properties && f.properties.id === property.parcelId)
                );
                
                if (plot) {
                    // Add the plot as a source and layer
                    map.addSource('property-plot', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: [plot]
                        }
                    });
                    
                    // Add fill layer
                    map.addLayer({
                        id: 'property-plot-fill',
                        type: 'fill',
                        source: 'property-plot',
                        paint: {
                            'fill-color': '#FFD700',
                            'fill-opacity': 0.3
                        }
                    });
                    
                    // Add outline layer
                    map.addLayer({
                        id: 'property-plot-outline',
                        type: 'line',
                        source: 'property-plot',
                        paint: {
                            'line-color': '#FFD700',
                            'line-width': 2
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error loading property plot:', error);
        }
    });
    
    // Map style toggles
    document.getElementById('mapStreetBtn').addEventListener('click', function() {
        map.setStyle('mapbox://styles/mapbox/streets-v12');
        this.classList.add('active');
        document.getElementById('mapSatelliteBtn').classList.remove('active');
        
        // Reload layers after style change
        map.once('style.load', function() {
            // Try to reload property plot if it exists
            if (map.getSource('property-plot') === undefined) {
                // Reload the plot data...
                initializePropertyMap(property);
            }
        });
    });
    
    document.getElementById('mapSatelliteBtn').addEventListener('click', function() {
        map.setStyle('mapbox://styles/mapbox/satellite-streets-v12');
        this.classList.add('active');
        document.getElementById('mapStreetBtn').classList.remove('active');
        
        // Reload layers after style change
        map.once('style.load', function() {
            // Try to reload property plot if it exists
            if (map.getSource('property-plot') === undefined) {
                // Reload the plot data...
                initializePropertyMap(property);
            }
        });
    });
}

/**
 * Load nearby properties for the property detail page
 * @param {Object} property - The main property
 */
async function loadNearbyPropertiesForDetail(property) {
    const container = document.getElementById('nearbyProperties');
    if (!container) return;
    
    // Clear existing properties
    container.innerHTML = '';
    
    try {
        // Get nearby properties
        const properties = await getNearbyProperties(property);
        
        properties.forEach(property => {
            const card = document.createElement('div');
            card.className = 'property-card';
            
            // Determine what specs to show based on property type
            let specs = '';
            if (property.propertyType !== 'Land' && property.bedrooms && property.bathrooms) {
                specs = `
                    <div class="property-specs-small">
                        <span><i class="fas fa-bed"></i> ${property.bedrooms} bd</span>
                        <span><i class="fas fa-bath"></i> ${property.bathrooms} ba</span>
                        <span><i class="fas fa-ruler-combined"></i> ${property.area}</span>
                    </div>
                `;
            } else {
                specs = `
                    <div class="property-specs-small">
                        <span><i class="fas fa-ruler-combined"></i> ${property.area}</span>
                    </div>
                `;
            }
            
            // Generate a random image based on property type
            const propertyImages = {
                'House': [
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop'
                ],
                'Apartment': [
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop'
                ],
                'Land': [
                    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?q=80&w=800&auto=format&fit=crop'
                ],
                'Commercial': [
                    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1568992687947-868a62a9f521?q=80&w=800&auto=format&fit=crop'
                ],
                'Mixed Use': [
                    'https://images.unsplash.com/photo-1464082354059-27db6ce50048?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=800&auto=format&fit=crop'
                ],
                'Condominium': [
                    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=800&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?q=80&w=800&auto=format&fit=crop'
                ]
            };
            
            // Use a consistent image for the same property (based on parcel ID)
            const images = propertyImages[property.propertyType] || propertyImages['House'];
            const imageIndex = Math.abs(hashCode(property.parcelId)) % images.length;
            const image = images[imageIndex];
            
            card.innerHTML = `
                <img src="${image}" alt="${property.address}">
                <div class="property-info">
                    <h3>${property.isCondoUnit ? property.condoInfo.name + ' ' + property.address.split(' ').pop() : property.address}</h3>
                    <div class="price">${property.estimatedPrice}</div>
                    ${specs}
                </div>
            `;
            
            // Set the parcel ID as data attribute
            card.dataset.id = property.parcelId;
            
            card.addEventListener('click', () => {
                // Save property and plot to localStorage before navigating
                localStorage.setItem('selectedProperty', JSON.stringify(property));
                if (property.parcelId && map.getSource('property-plots')) {
                    const sourceFeatures = map.querySourceFeatures('property-plots', {
                        filter: ['==', ['get', 'id'], property.parcelId]
                    });
                    if (sourceFeatures.length > 0) {
                        localStorage.setItem('selectedPlot', JSON.stringify(sourceFeatures[0]));
                    }
                }
                window.location.href = `property.html?id=${encodeURIComponent(property.OBJECTID)}`;
            });
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading nearby properties:', error);
        container.innerHTML = '<p class="error-message">Could not load nearby properties</p>';
    }
}

/**
 * Simple string hash function to generate consistent pseudo-random numbers
 * @param {string} str - String to hash
 * @returns {number} - Hash code
 */
function hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPropertyData,
        loadPropertyDetails,
        getNearbyProperties
    };
}

/**
 * Property Directory - Maps predial numbers to locations on the map
 * Based on Visor Cartográfico from Municipalidad de Escazú
 */

// Create property directory object to store off-market properties from Visor Cartográfico
const propertyDirectory = {
    // Properties by district and predial number
    properties: [
        // San Rafael district
        {
            predialNumber: "0110220",
            district: "01",
            property: "10220",
            GIS: "0110220",
            planoNumber: "102202191994",
            coordinates: {
                lat: 9.9181,
                lng: -84.1307
            },
            area: 500,
            type: "Residencial",
            status: "Off Market",
            notes: "Property located in central Escazu, with good access"
        },
        {
            predialNumber: "0126763",
            district: "01",
            property: "26763",
            GIS: "0126763",
            planoNumber: "SJ-26763-2020",
            coordinates: {
                lat: 9.9224,
                lng: -84.1392
            },
            area: 750,
            type: "Comercial",
            status: "Off Market",
            notes: "Commercial plot near main road"
        },
        {
            predialNumber: "0145287",
            district: "01",
            property: "45287",
            GIS: "0145287",
            planoNumber: "SJ-45287-2018",
            coordinates: {
                lat: 9.9155,
                lng: -84.1335
            },
            area: 620,
            type: "Residencial",
            status: "Off Market",
            notes: "Residential area in gated community"
        },
        {
            predialNumber: "0183405",
            district: "01",
            property: "83405",
            GIS: "0183405",
            planoNumber: "SJ-83405-2021",
            coordinates: {
                lat: 9.9267,
                lng: -84.1278
            },
            area: 930,
            type: "Mixto",
            status: "Off Market",
            notes: "Mixed-use property in high-value area"
        },
        
        // San Antonio district
        {
            predialNumber: "0226235",
            district: "02",
            property: "26235",
            GIS: "0226235",
            planoNumber: "SJ-26235-2019",
            coordinates: {
                lat: 9.9072,
                lng: -84.1505
            },
            area: 680,
            type: "Residencial",
            status: "Off Market",
            notes: "Mountain view property"
        },
        {
            predialNumber: "0258903",
            district: "02",
            property: "58903",
            GIS: "0258903",
            planoNumber: "SJ-58903-2019",
            coordinates: {
                lat: 9.9134,
                lng: -84.1547
            },
            area: 825,
            type: "Residencial",
            status: "Off Market",
            notes: "Premium residential plot with views"
        },
        {
            predialNumber: "0243721",
            district: "02",
            property: "43721",
            GIS: "0243721",
            planoNumber: "SJ-43721-2017",
            coordinates: {
                lat: 9.9110,
                lng: -84.1467
            },
            area: 570,
            type: "Comercial",
            status: "Off Market",
            notes: "Corner commercial plot"
        },
        
        // Escazu Centro district
        {
            predialNumber: "0362476",
            district: "03",
            property: "62476",
            GIS: "0362476",
            planoNumber: "SJ-62476-2018",
            coordinates: {
                lat: 9.9185,
                lng: -84.1401
            },
            area: 520,
            type: "Comercial",
            status: "Off Market",
            notes: "Central location near Plaza Escazu"
        },
        {
            predialNumber: "0371984",
            district: "03",
            property: "71984",
            GIS: "0371984",
            planoNumber: "SJ-71984-2022",
            coordinates: {
                lat: 9.9147,
                lng: -84.1385
            },
            area: 610,
            type: "Mixto",
            status: "Off Market",
            notes: "Mixed-use zone with good commercial potential"
        },
        {
            predialNumber: "0356230",
            district: "03",
            property: "56230",
            GIS: "0356230",
            planoNumber: "SJ-56230-2020",
            coordinates: {
                lat: 9.9212,
                lng: -84.1423
            },
            area: 780,
            type: "Residencial",
            status: "Off Market",
            notes: "Premium residential area"
        }
    ],
    
    // Utility function to find a property by predial number
    findByPredial: function(predialNumber) {
        return this.properties.find(property => property.predialNumber === predialNumber);
    },
    
    // Utility function to find properties by district
    findByDistrict: function(districtCode) {
        return this.properties.filter(property => property.district === districtCode);
    },
    
    // Utility function to find properties by type
    findByType: function(propertyType) {
        return this.properties.filter(property => property.type === propertyType);
    },
    
    // Utility function to generate a popup content for a property
    generatePopupContent: function(property) {
        // Get address from property or generate one
        const address = property.address || `${Math.floor(Math.random() * 200) + 1} Avenida Central, Escazú, San José`;
        
        // Get zoning type
        const zoning = property.type ? property.type.toUpperCase() : "RESIDENCIAL";
        
        return `
            <div class="map-popup">
                <h3>${address}</h3>
                <p><strong>${property.area} m²</strong></p>
                <p>Zoning: ${zoning}</p>
                <a href="property.html?id=${property.GIS}" class="popup-details">View Property Details</a>
            </div>
        `;
    },
    
    // Utility function to convert the directory to GeoJSON
    toGeoJSON: function() {
        return {
            type: "FeatureCollection",
            features: this.properties.map(property => ({
                type: "Feature",
                id: property.predialNumber,
                properties: {
                    id: property.predialNumber,
                    gis: property.GIS,
                    distrito: property.district,
                    zona: property.type,
                    area: property.area,
                    status: property.status,
                    notes: property.notes
                },
                geometry: {
                    type: "Point",
                    coordinates: [property.coordinates.lng, property.coordinates.lat]
                }
            }))
        };
    }
};

// Function to initialize the property directory on the map
function initializePropertyDirectory() {
    // Check if map is defined (we're on the map page)
    if (typeof map === 'undefined') {
        console.warn('Map not found, skipping property directory initialization');
        return;
    }
    
    console.log('Initializing property directory...');
    
    // Set up property data as markers on the map
    loadPropertyDirectoryMarkers();
    
    function loadPropertyDirectoryMarkers() {
        console.log('Loading property directory markers...');
        
        // Transform property directory data to GeoJSON
        const geoJson = propertyDirectory.toGeoJSON();
        
        // Add source to map if it doesn't exist
        if (!map.getSource('property-directory')) {
            map.addSource('property-directory', {
                type: 'geojson',
                data: geoJson
            });
            
            // Add a layer for property markers
            map.addLayer({
                id: 'property-directory-markers',
                type: 'circle',
                source: 'property-directory',
                paint: {
                    'circle-radius': 6,
                    'circle-color': [
                        'match',
                        ['get', 'status'],
                        'Off Market', '#FF9800',
                        'On Market', '#4CAF50',
                        '#2196F3'
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });
            
            // Add property info popup on hover
            map.on('mouseenter', 'property-directory-markers', (e) => {
                map.getCanvas().style.cursor = 'pointer';
                
                const properties = e.features[0].properties;
                const coordinates = e.features[0].geometry.coordinates.slice();
                
                // Find the property in our directory
                const property = propertyDirectory.findByPredial(properties.id);
                
                // Create tooltip content
                const tooltipContent = `
                    <div class="property-tooltip">
                        <strong>${property.GIS}</strong><br>
                        ${property.type} - ${property.area} m²
                    </div>
                `;
                
                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.id = 'property-tooltip';
                tooltip.className = 'mapboxgl-popup-content';
                tooltip.style.position = 'absolute';
                tooltip.style.zIndex = '10';
                tooltip.style.padding = '5px';
                tooltip.style.background = 'white';
                tooltip.style.borderRadius = '3px';
                tooltip.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                tooltip.style.pointerEvents = 'none';
                tooltip.innerHTML = tooltipContent;
                
                document.body.appendChild(tooltip);
                
                // Position the tooltip
                const point = map.project(coordinates);
                tooltip.style.left = `${point.x + 10}px`;
                tooltip.style.top = `${point.y - 20}px`;
            });
            
            map.on('mouseleave', 'property-directory-markers', () => {
                map.getCanvas().style.cursor = '';
                const tooltip = document.getElementById('property-tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            });
            
            // Add click interaction
            map.on('click', 'property-directory-markers', (e) => {
                // Prevent multiple click handling
                if (typeof isProcessingPopup !== 'undefined' && isProcessingPopup) return;
                if (typeof isProcessingPopup !== 'undefined') isProcessingPopup = true;
                
                try {
                    // Close any existing popup
                    if (typeof currentPopup !== 'undefined' && currentPopup) {
                        currentPopup.remove();
                    }
                    
                    const properties = e.features[0].properties;
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    
                    // Find the property in our directory
                    const property = propertyDirectory.findByPredial(properties.id);
                    
                    // Get the matching plot ID from GIS data if available
                    let matchingPlotId = null;
                    // Try to find a matching plot in the property-plots source
                    if (map.getSource('property-plots')) {
                        // First try exact query at the point location
                        const features = map.queryRenderedFeatures(
                            map.project(coordinates),
                            { layers: ['property-plots-fill'] }
                        );
                        
                        if (features.length > 0) {
                            matchingPlotId = features[0].id || features[0].properties.id;
                            console.log('Found matching plot:', matchingPlotId);
                        } else {
                            // If no exact match, try by ID/GIS number
                            const gisId = property.GIS;
                            if (gisId) {
                                // Query all features in the source
                                const sourceFeatures = map.querySourceFeatures('property-plots', {
                                    filter: ['==', ['get', 'id'], gisId]
                                });
                                
                                if (sourceFeatures.length > 0) {
                                    matchingPlotId = sourceFeatures[0].id || sourceFeatures[0].properties.id;
                                    console.log('Found matching plot by GIS ID:', matchingPlotId);
                                }
                            }
                        }
                    }
                    
                    // Generate popup content - match the format in the screenshots
                    const address = property.address || `${Math.floor(Math.random() * 200) + 1} Avenida Central, Escazú, San José`;
                    const zoning = property.type ? property.type.toUpperCase() : "RESIDENCIAL";
                    
                    const popupContent = `
                        <div class="map-popup">
                            <h3>${address}</h3>
                            <p><strong>${property.area} m²</strong></p>
                            <p>Zoning: ${zoning}</p>
                            <a href="property.html?id=${property.GIS}" class="popup-details">View Property Details</a>
                        </div>
                    `;
                    
                    // Create popup - always use the global currentPopup
                    if (typeof currentPopup !== 'undefined') {
                        currentPopup = new mapboxgl.Popup()
                            .setLngLat(coordinates)
                            .setHTML(popupContent)
                            .addTo(map);
                    } else {
                        // Fallback if global variable not available
                        new mapboxgl.Popup()
                            .setLngLat(coordinates)
                            .setHTML(popupContent)
                            .addTo(map);
                    }
                    
                    // Remove any previous selection
                    if (typeof selectedPlotId !== 'undefined' && selectedPlotId !== null) {
                        map.setFeatureState(
                            { source: 'property-plots', id: selectedPlotId },
                            { selected: false }
                        );
                    }
                    
                    // Set new selection if we found a matching plot
                    if (matchingPlotId) {
                        if (typeof selectedPlotId !== 'undefined') {
                            selectedPlotId = matchingPlotId;
                        }
                        
                        map.setFeatureState(
                            { source: 'property-plots', id: matchingPlotId },
                            { selected: true }
                        );
                        
                        // If the plot has geometry, zoom to it
                        const plotFeatures = map.querySourceFeatures('property-plots', {
                            filter: ['==', ['get', 'id'], matchingPlotId]
                        });
                        
                        if (plotFeatures.length > 0 && 
                            plotFeatures[0].geometry && 
                            plotFeatures[0].geometry.type === 'Polygon' &&
                            typeof zoomToPolygon === 'function') {
                            zoomToPolygon(plotFeatures[0].geometry.coordinates[0]);
                        }
                    }
                        
                    // Add pulse effect at click location
                    if (typeof addPulseEffect === 'function') {
                        addPulseEffect(coordinates);
                    }
                    
                    // Save property and plot to localStorage before navigating
                    localStorage.setItem('selectedProperty', JSON.stringify(property));
                    if (matchingPlotId && map.getSource('property-plots')) {
                        const sourceFeatures = map.querySourceFeatures('property-plots', {
                            filter: ['==', ['get', 'id'], matchingPlotId]
                        });
                        if (sourceFeatures.length > 0) {
                            localStorage.setItem('selectedPlot', JSON.stringify(sourceFeatures[0]));
                        }
                    }
                    
                    // Prevent event propagation to avoid double-handling
                    e.originalEvent.stopPropagation();
                } finally {
                    if (typeof isProcessingPopup !== 'undefined') {
                        isProcessingPopup = false;
                    }
                }
            });
        }
    }
}

// Auto-initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the map page
    if (document.getElementById('map')) {
        // We need to wait a bit to ensure the map is initialized first
        setTimeout(initializePropertyDirectory, 1000);
    }
}); 