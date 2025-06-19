const fs = require('fs');
const path = require('path');
const axios = require('axios');

class GISService {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/escazu_plots.json');
        this.cache = null;
    }

    async fetchPlots() {
        try {
            // Fetch data from Escazu GIS portal
            const response = await axios.get('https://gis.escazu.go.cr/api/plots');
            const plots = response.data;

            // Process and enhance the data
            const enhancedPlots = plots.map(plot => ({
                ...plot,
                center: this.calculateCenter(plot.geometry),
                area: this.calculateArea(plot.geometry)
            }));

            // Save to local storage
            await this.savePlots(enhancedPlots);

            return enhancedPlots;
        } catch (error) {
            console.error('Error fetching GIS data:', error);
            throw error;
        }
    }

    async getPlots() {
        if (this.cache) {
            return this.cache;
        }

        try {
            const data = await fs.promises.readFile(this.dataPath, 'utf8');
            this.cache = JSON.parse(data);
            return this.cache;
        } catch (error) {
            console.error('Error reading GIS data:', error);
            return [];
        }
    }

    async savePlots(plots) {
        try {
            await fs.promises.writeFile(
                this.dataPath,
                JSON.stringify(plots, null, 2)
            );
            this.cache = plots;
        } catch (error) {
            console.error('Error saving GIS data:', error);
            throw error;
        }
    }

    calculateCenter(geometry) {
        // Calculate the center point of a polygon
        const coordinates = geometry.coordinates[0];
        const bounds = coordinates.reduce((bounds, coord) => {
            return {
                minLng: Math.min(bounds.minLng, coord[0]),
                maxLng: Math.max(bounds.maxLng, coord[0]),
                minLat: Math.min(bounds.minLat, coord[1]),
                maxLat: Math.max(bounds.maxLat, coord[1])
            };
        }, {
            minLng: Infinity,
            maxLng: -Infinity,
            minLat: Infinity,
            maxLat: -Infinity
        });

        return [
            (bounds.minLng + bounds.maxLng) / 2,
            (bounds.minLat + bounds.maxLat) / 2
        ];
    }

    calculateArea(geometry) {
        // Calculate the area of a polygon using the shoelace formula
        const coordinates = geometry.coordinates[0];
        let area = 0;
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            area += coordinates[i][0] * coordinates[i + 1][1];
            area -= coordinates[i][1] * coordinates[i + 1][0];
        }
        
        return Math.abs(area / 2);
    }

    async updatePlots() {
        try {
            const plots = await this.fetchPlots();
            await this.savePlots(plots);
            return plots;
        } catch (error) {
            console.error('Error updating plots:', error);
            throw error;
        }
    }
}

// Export the service
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GISService;
} 