const path = require('path');
const fs = require('fs');

class SantaAnaGisService {
    constructor() {
        this.localPath = path.join(__dirname, '../public/data/santaana_plots.geojson');
    }

    async getSantaAnaPlots() {
        try {
            // Use local GeoJSON file with Santa Ana plots data
            const fileData = await fs.promises.readFile(this.localPath, 'utf8');
            return JSON.parse(fileData);
        } catch (error) {
            console.error('Error reading Santa Ana plots data:', error);
            // If file not found, return an empty GeoJSON
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }
}

module.exports = new SantaAnaGisService(); 