/**
 * Property Data Management
 * Handles loading and displaying property data for both on-market and off-market properties
 */

// REMINDER: Ensure the Supabase anon public API key in property.html is up to date and correct before deploying or testing.

// Cache for property data
const propertyCache = new Map();
const CACHE_EXPIRY = 300000; // 5 minutes in milliseconds

/**
 * Load property data based on the property ID (from Supabase)
 * @param {string} propertyId - The ID of the property to load
 * @returns {Promise<Object>} - A promise that resolves to the property data
 */
async function loadPropertyData(propertyId) {
    if (!propertyId) return Promise.reject('No property ID specified');
    const idStr = String(propertyId).trim();
    let { data: property, error } = await window.supabase
        .from('properties')
        .select('*')
        .or(`id.eq.${idStr},oid.eq.${idStr},finca_regi.eq.${idStr}`)
        .single();
    if (error || !property) {
        return Promise.reject('Property not found');
    }
    return property;
}

/**
 * Load all properties from Supabase
 * @returns {Promise<Array>} - A promise that resolves to an array of properties
 */
async function loadAllProperties() {
    let { data: properties, error } = await window.supabase
        .from('properties')
        .select('*')
        .limit(10000);
    if (error) return [];
    return properties;
}

/**
 * Search properties by query (server-side, efficient for large datasets)
 * @param {string} query - The search query
 * @returns {Promise<Array>} - A promise that resolves to an array of matching properties
 */
async function searchProperties(query) {
    if (!query || query.trim() === '') {
        // If no query, return nothing or a small sample (to avoid loading all 85,000)
        let { data, error } = await window.supabase
            .from('properties')
            .select('*')
            .limit(20);
        return data || [];
    }
    query = query.trim();
    // Remove leading zeros for numeric search
    const queryNoZeros = query.replace(/^0+/, '');
    // Run separate queries for each field
    const fields = ['id', 'finca_regi', 'oid', 'address'];
    let allResults = [];
    for (const field of fields) {
        let { data, error } = await window.supabase
            .from('properties')
            .select('*')
            .ilike(field, `%${query}%`)
            .limit(20);
        if (data) allResults = allResults.concat(data);
        // Also search with leading zeros removed for id fields
        if (['id', 'finca_regi', 'oid'].includes(field) && queryNoZeros !== query) {
            let { data: dataNoZeros } = await window.supabase
                .from('properties')
                .select('*')
                .ilike(field, `%${queryNoZeros}%`)
                .limit(20);
            if (dataNoZeros) allResults = allResults.concat(dataNoZeros);
        }
    }
    // Deduplicate by finca_regi or id
    const seen = new Set();
    const deduped = allResults.filter(p => {
        const key = p.finca_regi || p.id || p.oid;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return deduped.slice(0, 50);
}

/**
 * Convert GIS feature to property format
 * @param {Object} feature - GIS feature
 * @returns {Object} - Property object
 */
function convertGISToProperty(feature) {
    const props = feature.properties || {};
    
    // Calculate center coordinates from geometry
    const center = calculateGeometryCenter(feature.geometry);
    
    // Ensure we have valid coordinate values
    const lng = center[0] || -84.1487; // Default to Escazu if missing
    const lat = center[1] || 9.9333;   // Default to Escazu if missing
    
    console.log(`Converting GIS feature ${props.id || 'unknown'} with coordinates [${lng}, ${lat}]`);
    
    // All properties are off-market by default
    return {
        id: props.id || `OID-${props.OBJECTID || Math.floor(Math.random() * 1000)}`,
        finca_regi: props.finca_regi || null,
        address: props.address || `${props.id || 'Unknown'} Example Street, Escazu, Costa Rica`,
        location: {
            lat: lat,
            lng: lng
        },
        area: props.area || Math.floor(Math.random() * 3000) + 1000,
        zone: props.zone || 'Residential',
        title: props.name || `Property ${props.id || 'Unknown'}`,
        price: formatPrice(props.price || getRandomPrice()),
        priceNumber: props.price || getRandomPrice(),
        bedrooms: props.bedrooms || Math.floor(Math.random() * 5) + 1,
        bathrooms: props.bathrooms || Math.floor(Math.random() * 4) + 1,
        images: [
            './images/property-1.jpg',
            './images/property-2.jpg',
            './images/property-3.jpg',
            './images/property-4.jpg'
        ],
        type: props.type || getRandomPropertyType(),
        yearBuilt: props.year_built || (2000 + Math.floor(Math.random() * 23)),
        lot: props.lot_size || `${(Math.random() * 2 + 0.1).toFixed(2)} acres`,
        mlsNumber: props.mls || `CR${Math.floor(Math.random() * 900000) + 100000}`,
        description: props.description || 'This stunning property offers modern amenities and a prime location in Escazu. Perfect for families looking for comfort and convenience.',
        features: props.features || getRandomFeatures(),
        status: 'off-market',
        lastSoldDate: getRandomPastDate(),
        lastSoldPrice: formatPrice(getRandomPrice() * 0.9)
    };
}

/**
 * Calculate the center of a geometry
 * @param {Object} geometry - GeoJSON geometry
 * @returns {Array} - [lng, lat]
 */
function calculateGeometryCenter(geometry) {
    // Handle null or missing geometry
    if (!geometry) {
        console.warn('Missing geometry, using default coordinates');
        return [-84.1487, 9.9333]; // Default to Escazu
    }
    
    if (geometry.type === 'Point') {
        // For points, just return the coordinates directly
        if (Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
            return geometry.coordinates;
        } else {
            console.warn('Invalid point geometry coordinates, using defaults');
            return [-84.1487, 9.9333];
        }
    }
    
    // For polygons, calculate centroid
    if (geometry.type === 'Polygon') {
        if (Array.isArray(geometry.coordinates) && 
            Array.isArray(geometry.coordinates[0]) && 
            geometry.coordinates[0].length > 0) {
            
            const coords = geometry.coordinates[0];
            let sumX = 0;
            let sumY = 0;
            
            for (const coord of coords) {
                if (Array.isArray(coord) && coord.length >= 2) {
                    sumX += coord[0];
                    sumY += coord[1];
                }
            }
            
            return [sumX / coords.length, sumY / coords.length];
        }
    }
    
    // Default to a point in Escazu if calculation fails
    console.warn('Unable to calculate geometry center, using default coordinates');
    return [-84.1487, 9.9333];
}

/**
 * Format price with currency symbol
 * @param {number} price - The price to format
 * @returns {string} - Formatted price
 */
function formatPrice(price) {
    return `$${price.toLocaleString()}`;
}

/**
 * Get a random past date as a formatted string
 * @returns {string} - Formatted date string
 */
function getRandomPastDate() {
    const now = new Date();
    const pastMonths = Math.floor(Math.random() * 36) + 1; // 1-36 months ago
    const pastDate = new Date(now.getFullYear(), now.getMonth() - pastMonths, now.getDate());
    
    return pastDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Get a random price for a property
 * @returns {number} - Random price
 */
function getRandomPrice() {
    return Math.floor(Math.random() * 3000000) + 500000;
}

/**
 * Get a random property type
 * @returns {string} - Property type
 */
function getRandomPropertyType() {
    const types = ['Single Family Home', 'Condo', 'Townhouse', 'Villa', 'Estate'];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Get random property features
 * @returns {Array} - List of property features
 */
function getRandomFeatures() {
    const allFeatures = [
        'Swimming Pool', 'Garden', 'Garage', 'Security System', 'Central Air', 
        'Balcony', 'Fireplace', 'Gym', 'Spa', 'Wine Cellar', 'Home Theater',
        'Gated Community', 'View', 'Smart Home', 'Solar Panels', 'Hardwood Floors'
    ];
    
    const numFeatures = Math.floor(Math.random() * 8) + 3; // 3-10 features
    const selectedFeatures = [];
    
    for (let i = 0; i < numFeatures; i++) {
        const randomIndex = Math.floor(Math.random() * allFeatures.length);
        selectedFeatures.push(allFeatures[randomIndex]);
        allFeatures.splice(randomIndex, 1); // Remove to avoid duplicates
    }
    
    return selectedFeatures;
}

/**
 * Get fallback property data
 * @param {string} propertyId - The ID of the property
 * @returns {Object} - Default property data
 */
function getFallbackPropertyData(propertyId) {
    // All fallback properties are off-market by default
    return {
        id: propertyId,
        title: `Property ${propertyId}`,
        address: `${propertyId} Example Street, Escazu, Costa Rica`,
        location: {
            lat: 9.9333,
            lng: -84.1487
        },
        price: formatPrice(getRandomPrice()),
        priceNumber: getRandomPrice(),
        bedrooms: Math.floor(Math.random() * 5) + 1,
        bathrooms: Math.floor(Math.random() * 4) + 1,
        area: Math.floor(Math.random() * 3000) + 1000,
        images: [
            './images/property-1.jpg',
            './images/property-2.jpg',
            './images/property-3.jpg',
            './images/property-4.jpg'
        ],
        type: getRandomPropertyType(),
        yearBuilt: 2000 + Math.floor(Math.random() * 23),
        lot: `${(Math.random() * 2 + 0.1).toFixed(2)} acres`,
        mlsNumber: `CR${Math.floor(Math.random() * 900000) + 100000}`,
        description: 'This stunning property offers modern amenities and a prime location in Escazu. Perfect for families looking for comfort and convenience.',
        features: getRandomFeatures(),
        status: 'off-market',
        lastSoldDate: getRandomPastDate(),
        lastSoldPrice: formatPrice(getRandomPrice() * 0.9)
    };
}

/**
 * Create a listing for a property, setting it to active status in Supabase
 * @param {Object} listing - The listing object containing propertyId and listing details
 * @returns {Promise<Object>} - A promise that resolves to the new listing data
 */
async function createListing(listing) {
    if (!listing || !listing.propertyId) {
        return Promise.reject('No property ID specified');
    }

    // Get current user from Supabase auth
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError || !user) {
        return Promise.reject('User not authenticated');
    }

    try {
        // 1. Update property status to 'active'
        let { error: propError } = await window.supabase
            .from('properties')
            .update({ status: 'active' })
            .or(`id.eq.${listing.propertyId},oid.eq.${listing.propertyId},finca_regi.eq.${listing.propertyId}`);
        if (propError) throw propError;

        // 2. Insert new listing with user_id
        let { data, error } = await window.supabase
            .from('listings')
            .insert([{
                finca_regi: listing.finca_regi,
                price: listing.price,
                status: 'on_market',
                contact_info: listing.contact_info || {},
                metadata: {
                    description: listing.description,
                    features: listing.features,
                    images: listing.images,
                    title: listing.title || ''
                },
                user_id: user.id // Add authenticated user's ID
            }])
            .select()
            .single();
        if (error) throw error;

        // 3. Update local storage listings
        const userListings = JSON.parse(localStorage.getItem('domus_listings') || '[]');
        userListings.push({
            ...data,
            title: listing.title || '',
            description: listing.description,
            images: listing.images,
            features: listing.features
        });
        localStorage.setItem('domus_listings', JSON.stringify(userListings));

        return data;
    } catch (error) {
        console.error('Error creating listing:', error);
        return Promise.reject('Failed to create listing');
    }
}

/**
 * Take a property off market in Supabase
 * @param {string} propertyId - The ID of the property to deactivate
 * @param {Object} saleData - Optional data about the sale (price, date)
 * @returns {Promise<Object>} - A promise that resolves to the updated property data
 */
async function takeOffMarket(propertyId, saleData = {}) {
    if (!propertyId) {
        return Promise.reject('No property ID specified');
    }
    try {
        // 1. Update property status to 'off-market'
        let { error: propError } = await window.supabase
            .from('properties')
            .update({ status: 'off-market' })
            .or(`id.eq.${propertyId},oid.eq.${propertyId},finca_regi.eq.${propertyId}`);
        if (propError) throw propError;
        // 2. Update listing status to 'off_market'
        let { error: listError } = await window.supabase
            .from('listings')
            .update({ status: 'off_market' })
            .or(`finca_regi.eq.${propertyId}`);
        if (listError) throw listError;
        // Return updated property
        return await loadPropertyData(propertyId);
    } catch (error) {
        console.error('Error taking property off market:', error);
        return Promise.reject('Failed to update property status');
    }
}

/**
 * Get only off-market properties
 * @param {Array} properties - The array of all properties
 * @returns {Array} - Array of off-market properties
 */
function getOffMarketProperties(properties) {
    return properties.filter(property => property.status === 'off-market' || property.status === 'Off Market');
}

/**
 * Load full property details, registry data, and listing for a given finca_regi
 * @param {string} finca_regi - The registry number
 * @returns {Promise<Object>} - A promise that resolves to the merged property object
 */
async function loadFullProperty(finca_regi) {
    // 1. Get the property (minimal info)
    const { data: property, error: propError } = await window.supabase
        .from('properties')
        .select('*')
        .eq('finca_regi', finca_regi)
        .single();
    if (propError || !property) throw new Error('Property not found');

    // 2. Get registry data (optional)
    const { data: registry, error: regError } = await window.supabase
        .from('registry_data')
        .select('*')
        .eq('finca_regi', finca_regi)
        .single();

    // 3. Get listing data (optional)
    const { data: listing, error: listError } = await window.supabase
        .from('listings')
        .select('*')
        .eq('finca_regi', finca_regi)
        .single();

    // 4. Merge all data for display
    return {
        ...property,
        registry: registry || null,
        listing: listing || null
    };
}

// Export functions for global use
window.loadPropertyData = loadPropertyData;
window.loadAllProperties = loadAllProperties;
window.searchProperties = searchProperties;
window.convertGISToProperty = convertGISToProperty;
window.formatPrice = formatPrice;
window.createListing = createListing;
window.takeOffMarket = takeOffMarket;
window.getOffMarketProperties = getOffMarketProperties;
window.loadFullProperty = loadFullProperty; 