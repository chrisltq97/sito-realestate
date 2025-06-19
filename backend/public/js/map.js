// Simple Mapbox map implementation
window.mapInstance = null; // Global reference to map
let currentHighlightedProperty = null; // Track currently highlighted property

// Initialize Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXNsdHEiLCJhIjoiY21icndyYjJsMGZueTJqc2ZzZ3I4Zmp5MiJ9.P7jm8nv69d8qb_PTL4G-Tg';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing map...');
    
    // Initialize Supabase
    const supabase = window.initSupabase();
    if (!supabase) {
        console.error('Failed to initialize Supabase client');
        return;
    }
    
    // Initialize legend even before map loads
    initLegendToggle();

    // Map configuration
    const mapConfig = {
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-84.1307, 9.9181], // Escazu center
        zoom: 13,
        maxZoom: 19,
        minZoom: 10,
        preserveDrawingBuffer: false,
        antialias: true,
        fadeDuration: 0,
        trackResize: true,
        renderWorldCopies: false
    };

    try {
        console.log('Creating Mapbox map...');
        const map = new mapboxgl.Map(mapConfig);
        window.mapInstance = map;

        // Set initial view
        map.setCenter([-84.0833, 9.9333]);
        map.setZoom(10);
        
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // Load data when the map is ready
        map.on('load', async () => {
            console.log('Map loaded, fetching active listings...');
            
            // Store map instance globally
            window.mapInstance = map;
            
            // Add highlight layer
            if (!map.getSource('highlight-source')) {
                map.addSource('highlight-source', {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': []
                    }
                });

                map.addLayer({
                    'id': 'plot-highlight',
                    'type': 'fill',
                    'source': 'highlight-source',
                    'paint': {
                        'fill-color': '#06b6d4',
                        'fill-opacity': 0.5,
                        'fill-outline-color': '#0891b2'
                    }
                });
            }

            try {
                // Get active properties
                const { data: activeListings, error } = await supabase
                    .from('listings')
                    .select(`
                        *,
                        properties (*)
                    `);

                if (error) {
                    console.error('Error fetching active listings:', error);
                } else if (activeListings && activeListings.length > 0) {
                    console.log('Total active listings found:', activeListings.length);
                    
                    // Process each listing
                    const processedListings = activeListings.map(listing => {
                        const property = listing.properties;
                        if (!property) return null;

                        return {
                            ...property,
                            title: listing.title,
                            price: listing.price,
                            description: listing.description,
                            photos: listing.images || []
                        };
                    }).filter(Boolean); // Remove null entries

                    console.log('Processed listings:', processedListings);
                    updateSidebar(processedListings);
                }
            } catch (error) {
                console.error('Error in Supabase query:', error);
            }
            
            // Load base property data
            if (!window.initialDataLoadComplete) {
                loadAllMunicipalitiesData();
                window.initialDataLoadComplete = true;
            }

            // Set up map move handlers AFTER initial load
            const updateMapFeatures = () => {
                if (window.cachedGeoJSONData) {
                    const currentData = {
                        type: 'FeatureCollection',
                        features: filterFeaturesByViewport(window.cachedGeoJSONData.features, map)
                    };
                    displayPropertiesOnMap(currentData);
                }
            };

            // Debounced update for smoother performance
            const debouncedUpdate = debounce(updateMapFeatures, 150);

            // Attach move/zoom handlers
            map.on('moveend', debouncedUpdate);
            map.on('zoomend', debouncedUpdate);

            // Add highlight layer if it doesn't exist
            if (map.getLayer('property-highlight')) {
                map.removeLayer('property-highlight');
            }
            if (map.getSource('property-highlight-source')) {
                map.removeSource('property-highlight-source');
            }

            map.addSource('property-highlight-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            map.addLayer({
                'id': 'property-highlight',
                'type': 'fill',
                'source': 'property-highlight-source',
                'paint': {
                    'fill-color': '#2563eb',
                    'fill-opacity': 0.3,
                    'fill-outline-color': '#1d4ed8'
                }
            });
        });

    } catch (error) {
        console.error('Error initializing map:', error);
    }

    // Add footer to the page
    const footer = document.createElement('footer');
    footer.style.cssText = `
        text-align: center;
        padding: 12px;
        background-color: #f8f8f8;
        color: #6b7280;
        font-size: 0.875rem;
        border-top: 1px solid #e5e7eb;
        margin-top: 20px;
    `;
    footer.innerHTML = `© ${new Date().getFullYear()} Domus Impresa S.A. All rights reserved.`;

    // Add the footer to the sidebar
    const sidebar = document.getElementById('property-listings');
    if (sidebar) {
        // Reset any previous styles
        sidebar.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            background: white;
        `;
        
        // Append the footer at the end of the listings
        sidebar.appendChild(footer);
    }

    // Remove any previous adjustments to containers
    const mapContainer = document.querySelector('#map');
    if (mapContainer) {
        mapContainer.style.marginBottom = '0';
    }
});

// Helper function to debounce function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load all municipalities' data
async function loadAllMunicipalitiesData() {
    const sources = [
        { name: 'escazu', url: '/data/escazu_plots.json' },
        { name: 'san-jose', url: '/data/sanjose_plots.geojson' },
        { name: 'santa-ana', url: '/data/santaana_plots_proj4.geojson' }
    ];
    
    for (const src of sources) {
        try {
            const response = await fetch(src.url);
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.features)) {
                    const processedFeatures = data.features.map(f => {
                        const p = f.properties || {};
                        let finca_regi = '';
                        if (src.name === 'escazu') {
                            finca_regi = p.finca_regi || '';
                        } else if (src.name === 'san-jose') {
                            finca_regi = p.FINCA || '';
                        } else {
                            finca_regi = p.finca || '';
                        }
                        const id = finca_regi || p.idpredio || f.id || '';
                        return {
                            ...f,
                            id: id,
                            properties: {
                                ...f.properties,
                                id: id,
                                finca_regi: finca_regi,
                                area: p.area_regis || p.area_catas || p.area || '',
                                distrito: p.distrito || p.LOCALIZACION || src.name,
                                zona: p.uso || '',
                                uso: p.uso || '',
                                owner: p.npersona || p.owner || '',
                                status: 'off_market',
                                pcatastro: p.pcatastro || '',
                                ncuenta: p.ncuenta || '',
                                municipality: src.name
                            }
                        };
                    });

                    if (!window.cachedGeoJSONData) {
                        window.cachedGeoJSONData = { type: 'FeatureCollection', features: [] };
                    }
                    window.cachedGeoJSONData.features = window.cachedGeoJSONData.features.concat(processedFeatures);

                    const currentData = { 
                        type: 'FeatureCollection', 
                        features: filterFeaturesByViewport(window.cachedGeoJSONData.features, window.mapInstance)
                    };
                    displayPropertiesOnMap(currentData);
                }
            }
        } catch (error) {
            console.error('Error loading', src.name, error);
        }
    }
}

// Display properties on the map
function displayPropertiesOnMap(data) {
    if (!window.mapInstance) return;
    const map = window.mapInstance;

    try {
        // Remove existing layers
        ['property-plots-fill', 'property-plots-outline'].forEach(layerId => {
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
            }
        });
        if (map.getSource('property-plots')) {
            map.removeSource('property-plots');
        }

        // Add the source
        map.addSource('property-plots', {
            type: 'geojson',
            data: data,
            generateId: true
        });

        // Add fill layer
        map.addLayer({
            id: 'property-plots-fill',
            type: 'fill',
            source: 'property-plots',
            paint: {
                'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'highlighted'], false],
                    '#FFD700',  // Gold/yellow when highlighted
                    '#888888'   // Grey by default
                ],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'highlighted'], false],
                    0.3,        // More visible when highlighted
                    0.1         // Subtle when not highlighted
                ]
            }
        });

        // Add outline layer with thicker lines
        map.addLayer({
            id: 'property-plots-outline',
            type: 'line',
            source: 'property-plots',
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['feature-state', 'highlighted'], false],
                    '#FFD700',  // Gold when highlighted
                    '#888888'   // Dark grey by default
                ],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'highlighted'], false],
                    3,  // Thicker when highlighted
                    2   // Default width increased
                ]
            }
        });

        // Remove any existing click handlers
        map.off('click', 'property-plots-fill');
        map.off('click', 'property-plots-outline');
        map.off('click');

        // Click handler for properties
        const handlePropertyClick = (e) => {
            e.preventDefault(); // Prevent event from bubbling
            
            if (e.features && e.features.length > 0) {
                const feature = e.features[0];
                
                // Remove highlight from previously highlighted property
                if (currentHighlightedProperty !== null) {
                    map.setFeatureState(
                        { source: 'property-plots', id: currentHighlightedProperty },
                        { highlighted: false }
                    );
                }
                
                // Add highlight to clicked property
                map.setFeatureState(
                    { source: 'property-plots', id: feature.id },
                    { highlighted: true }
                );
                
                currentHighlightedProperty = feature.id;
                showPropertyDetails(feature.id, feature);
            }
        };

        // Add click handlers to both fill and outline layers
        map.on('click', 'property-plots-fill', handlePropertyClick);
        map.on('click', 'property-plots-outline', handlePropertyClick);

        // Click handler for map background
        map.on('click', (e) => {
            // Check if we clicked on a property
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['property-plots-fill', 'property-plots-outline']
            });
            
            // Only clear highlight if we didn't click on a property
            if (features.length === 0 && currentHighlightedProperty !== null) {
                map.setFeatureState(
                    { source: 'property-plots', id: currentHighlightedProperty },
                    { highlighted: false }
                );
                currentHighlightedProperty = null;
            }
        });

        // Hover effects
        map.on('mouseenter', 'property-plots-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'property-plots-fill', () => {
            map.getCanvas().style.cursor = '';
        });

    } catch (error) {
        console.error('Error adding source or layers:', error);
    }
}

// Show property details in a popup
function showPropertyDetails(propertyId, feature) {
    try {
        const props = feature.properties;
        
        const popupContent = document.createElement('div');
        popupContent.className = 'property-popup';
        popupContent.innerHTML = `
            <div class="property-header">
                <div class="header-content">
                    <h3>${props.title || `Property #${props.finca_regi || propertyId}`}</h3>
                    <span class="status-badge">Active</span>
                </div>
            </div>
            <div class="property-info">
                <div class="info-grid">
                    <div class="info-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${props.area ? props.area + ' m²' : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${props.distrito || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-tag"></i>
                        <span>${props.zona || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="property-actions">
                <a href="property.html?id=${props.finca_regi}" class="view-details-btn">
                    View Details <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;

        // Add popup styles
        const style = document.createElement('style');
        style.textContent = `
            .mapboxgl-popup-content {
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                min-width: 280px;
            }
            .property-popup {
                font-family: 'Inter', -apple-system, sans-serif;
            }
            .property-popup .property-header {
                margin-bottom: 16px;
            }
            .property-popup .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .property-popup h3 {
                margin: 0;
                font-size: 1.15em;
                color: #111827;
                font-weight: 600;
                line-height: 1.4;
            }
            .property-popup .status-badge {
                background: #22c55e;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75em;
                font-weight: 500;
                letter-spacing: 0.025em;
                text-transform: uppercase;
            }
            .property-popup .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 12px;
                margin: 16px 0;
            }
            .property-popup .info-item {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #4b5563;
                font-size: 0.9em;
            }
            .property-popup .info-item i {
                color: #6b7280;
                font-size: 1em;
            }
            .property-popup .property-actions {
                margin-top: 20px;
                text-align: right;
                padding-top: 16px;
                border-top: 1px solid #f3f4f6;
            }
            .property-popup .view-details-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: #2563eb;
                text-decoration: none;
                font-weight: 500;
                font-size: 0.95em;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.2s ease;
                background: #f0f5ff;
            }
            .property-popup .view-details-btn:hover {
                background: #e6edff;
                color: #1d4ed8;
                text-decoration: none;
            }
            .property-popup .view-details-btn i {
                font-size: 0.9em;
                transition: transform 0.2s ease;
            }
            .property-popup .view-details-btn:hover i {
                transform: translateX(4px);
            }
            .mapboxgl-popup-close-button {
                padding: 8px;
                right: 8px;
                top: 8px;
                color: #6b7280;
                font-size: 16px;
                border-radius: 50%;
                transition: all 0.2s ease;
            }
            .mapboxgl-popup-close-button:hover {
                background: #f3f4f6;
                color: #111827;
            }
        `;
        document.head.appendChild(style);

        // Remove any existing popups first
        const existingPopups = document.getElementsByClassName('mapboxgl-popup');
        if (existingPopups.length) {
            Array.from(existingPopups).forEach(popup => popup.remove());
        }

        new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '320px',
            className: 'property-details-popup'
        })
        .setLngLat(feature.geometry.coordinates[0][0])
        .setDOMContent(popupContent)
        .addTo(window.mapInstance);

    } catch (error) {
        console.error('Error showing property details:', error);
    }
}

// Helper function to filter features by viewport
function filterFeaturesByViewport(features, map, maxFeatures = 2000) {
    if (!map) return features;
    const bounds = map.getBounds();
    const filtered = features.filter(f => {
        if (!f.geometry) return false;
        let coords = [];
        if (f.geometry.type === 'Polygon') {
            coords = f.geometry.coordinates && f.geometry.coordinates[0] ? f.geometry.coordinates[0] : [];
        } else if (f.geometry.type === 'MultiPolygon') {
            coords = f.geometry.coordinates && f.geometry.coordinates[0] && f.geometry.coordinates[0][0] ? f.geometry.coordinates[0][0] : [];
        }
        if (!Array.isArray(coords) || coords.length === 0) return false;
        return coords.some(coord =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number' &&
            coord[0] >= bounds.getWest() && coord[0] <= bounds.getEast() &&
            coord[1] >= bounds.getSouth() && coord[1] <= bounds.getNorth()
        );
    });
    return filtered.slice(0, maxFeatures);
}

// Initialize the legend toggle
function initLegendToggle() {
    const legendToggle = document.getElementById('legend-toggle');
    const legendContainer = document.getElementById('legend-container');
    const arrow = legendToggle.querySelector('.arrow');
    
    if (legendToggle && legendContainer) {
        legendToggle.addEventListener('click', () => {
            const isHidden = legendContainer.style.display === 'none';
            legendContainer.style.display = isHidden ? 'block' : 'none';
            arrow.textContent = isHidden ? '▼' : '▲';
        });
    }
}

// Re-filter features on map moveend/zoomend
if (window.mapInstance) {
    window.mapInstance.on('moveend', () => {
        if (window.cachedGeoJSONData) {
            const currentData = {
                type: 'FeatureCollection',
                features: filterFeaturesByViewport(window.cachedGeoJSONData.features, window.mapInstance)
            };
            displayPropertiesOnMap(currentData);
        }
    });
    window.mapInstance.on('zoomend', () => {
        if (window.cachedGeoJSONData) {
            const currentData = {
                type: 'FeatureCollection',
                features: filterFeaturesByViewport(window.cachedGeoJSONData.features, window.mapInstance)
            };
            displayPropertiesOnMap(currentData);
        }
    });
}

// Update the sidebar with active listings
function updateSidebar(activeListings) {
    const sidebar = document.getElementById('property-listings');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }

    // Clear existing content
    sidebar.innerHTML = '';

    if (!activeListings || activeListings.length === 0) {
        sidebar.innerHTML = `
            <div class="no-listings">
                <i class="fas fa-home" style="font-size: 2em; color: #9ca3af; margin-bottom: 16px;"></i>
                <p>No active listings found in this area.</p>
            </div>
        `;
        return;
    }

    // Create and append listing cards
    activeListings.forEach(property => {
        const card = document.createElement('div');
        card.className = 'property-card';
        
        // Create thumbnail gallery HTML if there are photos
        const thumbnailGallery = property.photos?.length ? `
            <div class="thumbnail-gallery">
                <div class="thumbnail-container">
                    ${property.photos.slice(0, 4).map((photo, index) => `
                        <div class="thumbnail" style="background-image: url('${photo}')">
                            ${index === 3 && property.photos.length > 4 ? 
                                `<div class="more-photos">+${property.photos.length - 4}</div>` : 
                                ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="thumbnail-gallery">
                <div class="thumbnail-placeholder">
                    <i class="fas fa-image"></i>
                    <span>No photos available</span>
                </div>
            </div>
        `;

        card.innerHTML = `
            <div class="card-clickable-area">
                ${thumbnailGallery}
                <div class="property-content">
                    <div class="property-header">
                        <div class="header-content">
                            <h3>${property.title || `Property #${property.finca_regi}`}</h3>
                            <span class="status-badge">Active</span>
                        </div>
                        ${property.price ? `
                            <div class="price">
                                $${property.price.toLocaleString()}
                            </div>
                        ` : ''}
                    </div>
                    <div class="property-info">
                        <div class="info-grid">
                            <div class="info-item">
                                <i class="fas fa-ruler-combined"></i>
                                <span>${property.area ? property.area + ' m²' : 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${property.distrito || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-tag"></i>
                                <span>${property.zona || 'N/A'}</span>
                            </div>
                        </div>
                        ${property.description ? `
                            <div class="description">
                                ${property.description}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="property-actions">
                <a href="property.html?id=${property.finca_regi}" class="view-details-btn" onclick="event.stopPropagation();">
                    View Details <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;

        // Add click handler to highlight property on map
        const clickableArea = card.querySelector('.card-clickable-area');
        clickableArea.addEventListener('click', () => {
            // Remove highlight class from all cards
            document.querySelectorAll('.property-card').forEach(c => c.classList.remove('selected'));
            // Add highlight class to clicked card
            card.classList.add('selected');

            if (window.mapInstance && property.finca_regi) {
                console.log('Zooming to property:', property.finca_regi);
                
                // Get the property's GeoJSON from the source
                const source = window.mapInstance.getSource('property-plots');
                if (!source) {
                    console.error('Property plots source not found');
                    return;
                }

                // Query the features
                const features = window.mapInstance.querySourceFeatures('property-plots', {
                    filter: ['==', ['get', 'finca_regi'], property.finca_regi]
                });

                console.log('Found features:', features);

                if (features.length > 0) {
                    const feature = features[0];
                    console.log('Selected feature:', feature);

                    // Update highlight layer
                    window.mapInstance.getSource('highlight-source').setData({
                        type: 'FeatureCollection',
                        features: [feature]
                    });

                    // Get the coordinates
                    if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
                        const coordinates = feature.geometry.coordinates[0];
                        console.log('Coordinates:', coordinates);

                        // Create bounds
                        const bounds = new mapboxgl.LngLatBounds();
                        coordinates.forEach(coord => {
                            bounds.extend(coord);
                        });

                        // Zoom to bounds
                        window.mapInstance.fitBounds(bounds, {
                            padding: { top: 50, bottom: 50, left: 350, right: 50 }, // Added more padding on the left for the sidebar
                            maxZoom: 18,
                            duration: 1500,
                            essential: true
                        });
                    } else {
                        console.error('Invalid feature geometry:', feature.geometry);
                    }
                } else {
                    console.error('No features found for property:', property.finca_regi);
                }
            } else {
                console.error('Map instance or property ID not available');
            }
        });

        sidebar.appendChild(card);
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #property-listings {
            padding: 20px;
            overflow-y: auto;
            background: white;
        }
        .property-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 20px;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        .card-clickable-area {
            cursor: pointer;
        }
        .property-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        .property-card.selected {
            background: linear-gradient(to right, rgba(37, 99, 235, 0.02), rgba(37, 99, 235, 0.05));
            transform: translateY(-2px) scale(1.01);
            box-shadow: 
                0 8px 20px rgba(0, 0, 0, 0.1),
                0 0 0 1px rgba(37, 99, 235, 0.2);
        }
        .property-card.selected::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 4px;
            background: linear-gradient(to bottom, #3b82f6, #2563eb);
            border-radius: 4px 0 0 4px;
        }
        .property-card.selected .property-header h3 {
            color: #2563eb;
        }
        .property-content {
            padding: 20px;
        }
        .property-header {
            margin-bottom: 16px;
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .property-header h3 {
            margin: 0;
            font-size: 1.15em;
            color: #111827;
            font-weight: 600;
            line-height: 1.4;
            transition: color 0.3s ease;
        }
        .price {
            font-size: 1.25em;
            font-weight: 600;
            color: #2563eb;
            margin: 8px 0;
        }
        .status-badge {
            background: #22c55e;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 500;
            letter-spacing: 0.025em;
            text-transform: uppercase;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 12px;
            margin: 16px 0;
        }
        .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #4b5563;
            font-size: 0.9em;
        }
        .info-item i {
            color: #6b7280;
            font-size: 1em;
            transition: color 0.3s ease;
        }
        .property-card.selected .info-item i {
            color: #2563eb;
        }
        .description {
            color: #6b7280;
            font-size: 0.9em;
            margin-top: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .property-actions {
            margin-top: 20px;
            text-align: right;
            padding: 16px 20px;
            border-top: 1px solid #f3f4f6;
            background: white;
            position: relative;
            z-index: 1;
        }
        .view-details-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95em;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.3s ease;
            background: #f0f5ff;
            cursor: pointer;
            z-index: 2;
            position: relative;
        }
        .view-details-btn:hover {
            background: #e6edff;
            color: #1d4ed8;
            text-decoration: none;
            transform: translateX(4px);
        }
        .view-details-btn i {
            transition: transform 0.3s ease;
        }
        .view-details-btn:hover i {
            transform: translateX(4px);
        }
        .property-card.selected .view-details-btn {
            background: #2563eb;
            color: white;
        }
        .property-card.selected .view-details-btn:hover {
            background: #1d4ed8;
        }
        .thumbnail-gallery {
            width: 100%;
            height: 200px;
            background: #f3f4f6;
            position: relative;
            overflow: hidden;
        }
        .thumbnail-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 2px;
            height: 100%;
        }
        .thumbnail {
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            transition: transform 0.3s ease;
        }
        .property-card.selected .thumbnail {
            transform: scale(1.05);
        }
        .thumbnail:hover {
            opacity: 0.9;
        }
        .more-photos {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2em;
            font-weight: 600;
        }
        .thumbnail-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            gap: 8px;
        }
        .thumbnail-placeholder i {
            font-size: 2em;
        }
        .thumbnail-placeholder span {
            font-size: 0.9em;
        }
        .no-listings {
            text-align: center;
            color: #6b7280;
            padding: 40px 20px;
            background: #f9fafb;
            border-radius: 12px;
            margin: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
    `;
    document.head.appendChild(style);
}