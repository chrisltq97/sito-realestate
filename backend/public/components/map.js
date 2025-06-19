// Map Component Configuration
const MAP_CONFIG = {
    accessToken: 'pk.eyJ1IjoiZG9tdXNyZWFsZXN0YXRlIiwiYSI6ImNscXFmaTAycTF1MGoya3BpNWQ3MWxyc2kifQ.HpEu4Phjf7_QcYmFmVK90Q',
    defaultStyle: 'mapbox://styles/mapbox/streets-v12',
    defaultCenter: [-84.1307, 9.9181], // Escazu coordinates
    defaultZoom: 13
};

class MapComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = { ...MAP_CONFIG, ...options };
        this.map = null;
        this.markers = [];
        this.popups = [];
    }

    initialize() {
        if (!this.containerId) {
            console.error('Map container ID is required');
            return;
        }

        mapboxgl.accessToken = this.options.accessToken;

        this.map = new mapboxgl.Map({
            container: this.containerId,
            style: this.options.defaultStyle,
            center: this.options.defaultCenter,
            zoom: this.options.defaultZoom
        });

        // Add default controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.FullscreenControl());
        this.map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));

        return this;
    }

    addMarker(coordinates, options = {}) {
        const marker = new mapboxgl.Marker(options)
            .setLngLat(coordinates)
            .addTo(this.map);
        this.markers.push(marker);
        return marker;
    }

    addPopup(coordinates, content, options = {}) {
        const popup = new mapboxgl.Popup(options)
            .setLngLat(coordinates)
            .setHTML(content)
            .addTo(this.map);
        this.popups.push(popup);
        return popup;
    }

    setStyle(style) {
        if (this.map) {
            this.map.setStyle(style);
        }
    }

    fitBounds(bounds) {
        if (this.map && bounds) {
            this.map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15
            });
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    clearPopups() {
        this.popups.forEach(popup => popup.remove());
        this.popups = [];
    }

    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.clearPopups();
            this.map.remove();
            this.map = null;
        }
    }
}

// Export the component
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MapComponent, MAP_CONFIG };
} 