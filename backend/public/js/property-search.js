// --- LIVE SUPABASE SEARCH AND MAP UPDATE ---
let selectedProperty = null;

const searchInput = document.getElementById('property-search');
const resultsContainer = document.getElementById('property-results');
const previewContainer = document.getElementById('property-preview');
const propertyDetails = document.getElementById('property-details');
const propertyMap = document.getElementById('property-map');

// Live search as you type
searchInput.addEventListener('input', async function() {
    const query = searchInput.value;
    resultsContainer.innerHTML = '<div class="property-item">Searching...</div>';
    const results = await window.searchProperties(query);
    displayPropertyResults(results);
});

document.getElementById('search-btn').addEventListener('click', async function() {
    const query = searchInput.value;
    resultsContainer.innerHTML = '<div class="property-item">Searching...</div>';
    const results = await window.searchProperties(query);
    displayPropertyResults(results);
});

function displayPropertyResults(properties) {
    resultsContainer.innerHTML = '';
    if (!properties || properties.length === 0) {
        resultsContainer.innerHTML = '<div class="property-item">No properties found</div>';
        return;
    }
    properties.forEach(property => {
        const propertyItem = document.createElement('div');
        propertyItem.className = 'property-item';
        propertyItem.dataset.id = property.finca_regi || property.id;
        propertyItem.innerHTML = `
            <div><strong>${property.finca_regi || 'Unknown Finca'}</strong></div>
            <div>ID: ${property.finca_regi || property.id}</div>
            <div>${property.area ? property.area + ' m²' : 'Area unknown'} | ${property.zone || 'Unknown Zone'}</div>
        `;
        propertyItem.addEventListener('click', function() {
            selectProperty(property);
        });
        resultsContainer.appendChild(propertyItem);
    });
}

// Select a property and show details + map
function selectProperty(property) {
    selectedProperty = property;
    previewContainer.classList.add('visible');
    propertyDetails.innerHTML = `
        <div class="selected-property-details">
            <p><strong>Finca #:</strong> ${property.finca_regi || property.id}</p>
            <p><strong>Address:</strong> ${property.address || 'Unknown'}</p>
            <p><strong>Area:</strong> ${property.area || 'Unknown'}</p>
            <p><strong>Zone:</strong> ${property.zone || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${property.status === 'active' ? 'active' : 'off-market'}">${property.status || 'Unknown'}</span></p>
        </div>
    `;
    // Show map
    showPropertyMap(property);
}

// Show property location and plot on the map
function showPropertyMap(property) {
    let plot = null;
    let mapCenter = null;

    // Use geometry_geojson for the plot if available
    if (property.geometry_geojson) {
        try {
            plot = typeof property.geometry_geojson === 'string'
                ? JSON.parse(property.geometry_geojson)
                : property.geometry_geojson;

            // Calculate centroid from GeoJSON coordinates
            if (plot && plot.type === 'Polygon' && plot.coordinates) {
                const coords = plot.coordinates[0];
                let sumX = 0, sumY = 0;
                coords.forEach(coord => {
                    sumX += coord[0];
                    sumY += coord[1];
                });
                mapCenter = [sumX / coords.length, sumY / coords.length];
            } else if (plot && plot.type === 'Feature' && plot.geometry && plot.geometry.type === 'Polygon') {
                const coords = plot.geometry.coordinates[0];
                let sumX = 0, sumY = 0;
                coords.forEach(coord => {
                    sumX += coord[0];
                    sumY += coord[1];
                });
                mapCenter = [sumX / coords.length, sumY / coords.length];
            }
        } catch (e) {
            console.warn('Failed to parse geometry_geojson:', e);
        }
    }

    // Fallback: show message if no map data
    if (!mapCenter) {
        propertyMap.innerHTML = '<div class="map-placeholder">No map data available for this property.</div>';
        return;
    }
    
    propertyMap.innerHTML = '';
    if (window.propertyMapboxInstance) {
        window.propertyMapboxInstance.remove();
    }
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXNsdHEiLCJhIjoiY21icndyYjJsMGZueTJqc2ZzZ3I4Zmp5MiJ9.P7jm8nv69d8qb_PTL4G-Tg';
    const map = new mapboxgl.Map({
        container: propertyMap,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mapCenter,
        zoom: 17
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    window.propertyMapboxInstance = map;

    // Add plot as a GeoJSON layer if available
    if (plot) {
        map.on('load', function() {
            map.addSource('property-plot', {
                type: 'geojson',
                data: plot.type === 'Feature' ? plot : { type: 'Feature', geometry: plot, properties: {} }
            });
            map.addLayer({
                id: 'property-plot-fill',
                type: 'fill',
                source: 'property-plot',
                paint: {
                    'fill-color': '#FFD700',
                    'fill-opacity': 0.3
                }
            });
            map.addLayer({
                id: 'property-plot-outline',
                type: 'line',
                source: 'property-plot',
                paint: {
                    'line-color': '#FFD700',
                    'line-width': 2
                }
            });
            map.resize();
        });
    } else {
        map.on('load', function() {
            map.resize();
        });
    }
}

// On page load, do an initial search to show some properties
window.addEventListener('DOMContentLoaded', async function() {
    const results = await window.searchProperties('');
    displayPropertyResults(results);
}); 