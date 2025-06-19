const fs = require('fs');
const path = require('path');

class SanJoseGisService {
    constructor() {
        this.localPath = path.join(__dirname, '../public/data/sanjose_plots.geojson');
    }

    async getSanJosePlots() {
        try {
            const fileData = await fs.promises.readFile(this.localPath, 'utf8');
            return JSON.parse(fileData);
        } catch (error) {
            console.error('Error reading San Jose plots data:', error);
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }
}

module.exports = new SanJoseGisService(); 