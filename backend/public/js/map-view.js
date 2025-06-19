// Initialize map view
document.addEventListener('DOMContentLoaded', () => {
    const mapView = new MapView();
    mapView.initialize();
    initializeSidebar();
});

class MapView {
    constructor() {
        this.map = null;
        this.gisService = new GISService();
        this.properties = [];
        this.showingPlots = false;
        this.currentStyle = 'streets';
    }

    async initialize() {
        // Initialize map
        this.map = new MapComponent('main-map').initialize();

        // Load properties
        await this.loadProperties();

        // Initialize event listeners
        this.initializeEventListeners();

        // Load GIS data
        await this.loadGISData();
    }

    async loadProperties() {
        try {
            // Initialize Supabase
            const supabase = window.initSupabase();
            if (!supabase) {
                console.error('Failed to initialize Supabase client');
                return;
            }

            // Fetch active listings
            const { data: activeListings, error } = await supabase
                .from('properties')
                .select('*')
                .eq('status', 'active');

            if (error) {
                console.error('Error fetching active listings:', error);
                return;
            }

            this.properties = activeListings || [];
            this.renderPropertyList();
        } catch (error) {
            console.error('Error loading properties:', error);
            this.showError('Failed to load properties');
        }
    }

    async loadGISData() {
        try {
            const plots = await this.gisService.getPlots();
            this.plots = plots;
        } catch (error) {
            console.error('Error loading GIS data:', error);
        }
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        
        searchButton.addEventListener('click', () => this.handleSearch(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch(searchInput.value);
            }
        });

        // Filter controls
        document.getElementById('property-type').addEventListener('change', () => this.applyFilters());
        document.getElementById('price-range').addEventListener('change', () => this.applyFilters());

        // View controls
        document.getElementById('toggle-satellite').addEventListener('click', () => this.toggleSatellite());
        document.getElementById('toggle-plots').addEventListener('click', () => this.togglePlots());

        // Property list
        document.getElementById('close-list').addEventListener('click', () => this.togglePropertyList());
    }

    handleSearch(query) {
        if (!query) return;

        // Search in properties
        const results = this.properties.filter(property => 
            property.title.toLowerCase().includes(query.toLowerCase()) ||
            property.description.toLowerCase().includes(query.toLowerCase())
        );

        // Update property list
        this.renderPropertyList(results);

        // Fit map to results
        if (results.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            results.forEach(property => {
                bounds.extend(property.coordinates);
            });
            this.map.fitBounds(bounds);
        }
    }

    applyFilters() {
        const typeFilter = document.getElementById('property-type').value;
        const priceFilter = document.getElementById('price-range').value;

        let filtered = this.properties;

        if (typeFilter) {
            filtered = filtered.filter(property => property.type === typeFilter);
        }

        if (priceFilter) {
            const [min, max] = priceFilter.split('-').map(Number);
            filtered = filtered.filter(property => {
                const price = Number(property.price.replace(/[^0-9]/g, ''));
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        this.renderPropertyList(filtered);
        this.updatePropertyMarkers(filtered);
    }

    toggleSatellite() {
        this.currentStyle = this.currentStyle === 'streets' ? 'satellite' : 'streets';
        this.map.setStyle(
            this.currentStyle === 'streets' 
                ? 'mapbox://styles/mapbox/streets-v12'
                : 'mapbox://styles/mapbox/satellite-v9'
        );
    }

    async togglePlots() {
        this.showingPlots = !this.showingPlots;
        
        if (this.showingPlots) {
            // Add plot layers
            this.plots.forEach(plot => {
                this.map.addSource(`plot-${plot.id}`, {
                    type: 'geojson',
                    data: plot.geometry
                });

                this.map.addLayer({
                    id: `plot-${plot.id}`,
                    type: 'fill',
                    source: `plot-${plot.id}`,
                    paint: {
                        'fill-color': '#088',
                        'fill-opacity': 0.4,
                        'fill-outline-color': '#000'
                    }
                });
            });
        } else {
            // Remove plot layers
            this.plots.forEach(plot => {
                if (this.map.getLayer(`plot-${plot.id}`)) {
                    this.map.removeLayer(`plot-${plot.id}`);
                }
                if (this.map.getSource(`plot-${plot.id}`)) {
                    this.map.removeSource(`plot-${plot.id}`);
                }
            });
        }
    }

    renderPropertyList(properties = this.properties) {
        const container = document.getElementById('property-listings');
        if (!container) return;

        container.innerHTML = '';

        if (!properties.length) {
            container.innerHTML = `
                <div class="no-listings">
                    <i class="fas fa-home" style="font-size: 2em; color: #9ca3af; margin-bottom: 16px;"></i>
                    <p>No active listings found in this area.</p>
                </div>
            `;
            return;
        }

        properties.forEach(property => {
            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = `
                <div class="property-header">
                    <div class="header-content">
                        <h3>${property.title || `Property #${property.finca_regi}`}</h3>
                        <span class="status-badge">Active</span>
                    </div>
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
                </div>
                <div class="property-actions">
                    <a href="property.html?id=${property.finca_regi}" class="view-details-btn">
                        View Details <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;

            // Add click handler
            card.addEventListener('click', () => this.handlePropertyClick(property));

            container.appendChild(card);
        });

        // Add styles
        this.addSidebarStyles();
    }

    addSidebarStyles() {
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
                padding: 20px;
                margin-bottom: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            .property-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
            }
            .property-actions {
                margin-top: 20px;
                text-align: right;
                padding-top: 16px;
                border-top: 1px solid #f3f4f6;
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
                transition: all 0.2s ease;
                background: #f0f5ff;
            }
            .view-details-btn:hover {
                background: #e6edff;
                color: #1d4ed8;
                text-decoration: none;
            }
            .view-details-btn i {
                font-size: 0.9em;
                transition: transform 0.2s ease;
            }
            .view-details-btn:hover i {
                transform: translateX(4px);
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

    handlePropertyClick(property) {
        if (this.map) {
            // Find and highlight the property on the map
            const features = this.map.querySourceFeatures('property-plots', {
                filter: ['==', ['get', 'finca_regi'], property.finca_regi]
            });

            if (features.length > 0) {
                const feature = features[0];
                if (window.currentHighlightedProperty !== null) {
                    this.map.setFeatureState(
                        { source: 'property-plots', id: window.currentHighlightedProperty },
                        { highlighted: false }
                    );
                }
                this.map.setFeatureState(
                    { source: 'property-plots', id: feature.id },
                    { highlighted: true }
                );
                window.currentHighlightedProperty = feature.id;

                // Center map on property
                if (feature.geometry && feature.geometry.coordinates) {
                    this.map.flyTo({
                        center: feature.geometry.coordinates[0][0],
                        zoom: 16
                    });
                }
            }
        }
    }

    showError(message) {
        // Implement error display
        console.error(message);
    }
}

// Make MapView available globally
window.mapView = null;

async function initializeSidebar() {
    try {
        // Initialize Supabase
        const supabase = window.initSupabase();
        if (!supabase) {
            console.error('Failed to initialize Supabase client');
            return;
        }

        // Fetch active listings
        const { data: activeListings, error } = await supabase
            .from('properties')
            .select('*')
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching active listings:', error);
            return;
        }

        // Get the sidebar container
        const sidebar = document.getElementById('property-listings');
        if (!sidebar) {
            console.error('Sidebar container not found');
            return;
        }

        // Clear existing content
        sidebar.innerHTML = '';

        if (!activeListings || activeListings.length === 0) {
            sidebar.innerHTML = `
                <div class="no-listings">
                    <p>No active listings found in this area.</p>
                </div>
            `;
            return;
        }

        // Add each active listing to the sidebar
        activeListings.forEach(listing => {
            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = `
                <div class="property-header">
                    <div class="header-content">
                        <h3>${listing.title || `Property #${listing.finca_regi}`}</h3>
                        <span class="status-badge">Active</span>
                    </div>
                </div>
                <div class="property-info">
                    <div class="info-grid">
                        <div class="info-item">
                            <i class="fas fa-ruler-combined"></i>
                            <span>${listing.area ? listing.area + ' m²' : 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${listing.distrito || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-tag"></i>
                            <span>${listing.zona || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="property-actions">
                    <a href="property.html?id=${listing.finca_regi}" class="view-details-btn">
                        View Details <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;

            // Add click handler to highlight property on map
            card.addEventListener('click', () => {
                if (window.mapInstance) {
                    // Find and highlight the corresponding property on the map
                    const features = window.mapInstance.querySourceFeatures('property-plots', {
                        filter: ['==', ['get', 'finca_regi'], listing.finca_regi]
                    });

                    if (features.length > 0) {
                        const feature = features[0];
                        // Remove previous highlight
                        if (window.currentHighlightedProperty !== null) {
                            window.mapInstance.setFeatureState(
                                { source: 'property-plots', id: window.currentHighlightedProperty },
                                { highlighted: false }
                            );
                        }
                        // Add new highlight
                        window.mapInstance.setFeatureState(
                            { source: 'property-plots', id: feature.id },
                            { highlighted: true }
                        );
                        window.currentHighlightedProperty = feature.id;

                        // Center map on property
                        if (feature.geometry && feature.geometry.coordinates) {
                            window.mapInstance.flyTo({
                                center: feature.geometry.coordinates[0][0],
                                zoom: 16
                            });
                        }
                    }
                }
            });

            sidebar.appendChild(card);
        });

        // Add styles for the sidebar
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
                padding: 20px;
                margin-bottom: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            .property-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
            }
            .property-actions {
                margin-top: 20px;
                text-align: right;
                padding-top: 16px;
                border-top: 1px solid #f3f4f6;
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
                transition: all 0.2s ease;
                background: #f0f5ff;
            }
            .view-details-btn:hover {
                background: #e6edff;
                color: #1d4ed8;
                text-decoration: none;
            }
            .view-details-btn i {
                font-size: 0.9em;
                transition: transform 0.2s ease;
            }
            .view-details-btn:hover i {
                transform: translateX(4px);
            }
            .no-listings {
                text-align: center;
                color: #6b7280;
                padding: 40px 20px;
                background: #f9fafb;
                border-radius: 12px;
                margin: 20px;
            }
        `;
        document.head.appendChild(style);

    } catch (error) {
        console.error('Error initializing sidebar:', error);
    }
} 