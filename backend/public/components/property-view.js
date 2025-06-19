class PropertyView {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = options;
        this.property = null;
        this.map = null;
    }

    async initialize(propertyId) {
        try {
            // Fetch property data
            const response = await fetch(`/api/properties/${propertyId}`);
            this.property = await response.json();

            // Initialize map if container exists
            const mapContainer = document.getElementById('property-map');
            if (mapContainer) {
                this.map = new MapComponent('property-map', {
                    center: this.property.coordinates,
                    zoom: 15
                }).initialize();

                // Add property marker
                this.map.addMarker(this.property.coordinates, {
                    color: '#D4AF37'
                });

                // Add property popup
                this.map.addPopup(this.property.coordinates, `
                    <h3>${this.property.title}</h3>
                    <p>${this.property.price}</p>
                `);
            }

            this.render();
        } catch (error) {
            console.error('Error initializing property view:', error);
            this.showError('Failed to load property details');
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="property-header">
                <h1>${this.property.title}</h1>
                <div class="property-price">${this.property.price}</div>
            </div>

            <div class="property-gallery">
                ${this.renderGallery()}
            </div>

            <div class="property-details">
                <div class="property-info">
                    ${this.renderInfo()}
                </div>
                <div class="property-description">
                    ${this.property.description}
                </div>
                <div class="property-features">
                    ${this.renderFeatures()}
                </div>
            </div>

            <div class="property-location">
                <h2>Location</h2>
                <div id="property-map" class="property-map"></div>
            </div>

            <div class="property-contact">
                ${this.renderContact()}
            </div>
        `;
    }

    renderGallery() {
        return this.property.images.map(image => `
            <div class="gallery-item">
                <img src="${image.url}" alt="${image.alt || this.property.title}">
            </div>
        `).join('');
    }

    renderInfo() {
        return `
            <div class="info-item">
                <span class="label">Type:</span>
                <span class="value">${this.property.type}</span>
            </div>
            <div class="info-item">
                <span class="label">Bedrooms:</span>
                <span class="value">${this.property.bedrooms}</span>
            </div>
            <div class="info-item">
                <span class="label">Bathrooms:</span>
                <span class="value">${this.property.bathrooms}</span>
            </div>
            <div class="info-item">
                <span class="label">Area:</span>
                <span class="value">${this.property.area} m²</span>
            </div>
        `;
    }

    renderFeatures() {
        return this.property.features.map(feature => `
            <div class="feature-item">
                <i class="feature-icon ${feature.icon}"></i>
                <span class="feature-name">${feature.name}</span>
            </div>
        `).join('');
    }

    renderContact() {
        return `
            <div class="contact-card">
                <div class="agent-info">
                    <img src="${this.property.agent.photo}" alt="${this.property.agent.name}">
                    <div class="agent-details">
                        <h3>${this.property.agent.name}</h3>
                        <p>${this.property.agent.role}</p>
                    </div>
                </div>
                <div class="contact-actions">
                    <button class="btn-primary" onclick="contactAgent(${this.property.id})">
                        Contact Agent
                    </button>
                    <button class="btn-secondary" onclick="scheduleViewing(${this.property.id})">
                        Schedule Viewing
                    </button>
                </div>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="error-icon"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    destroy() {
        if (this.map) {
            this.map.destroy();
        }
    }
}

// Export the component
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PropertyView;
} 