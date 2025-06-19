const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GIS_URL = 'https://mapas.msj.go.cr/server/rest/services/SIG_CATASTRO/SIG_SER_CATASTRO/MapServer/2/query';
const OUTPUT_PATH = path.join(__dirname, '../../data/sanjose_plots.geojson');

async function downloadSanJosePlots() {
    try {
        // The API supports up to 1000 features per request, so we need to paginate
        let allFeatures = [];
        let resultOffset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const url = `${GIS_URL}?where=1=1&outFields=*&returnGeometry=true&f=geojson&resultOffset=${resultOffset}&resultRecordCount=${pageSize}`;
            const response = await axios.get(url);
            const data = response.data;
            if (data.features && data.features.length > 0) {
                allFeatures = allFeatures.concat(data.features);
                resultOffset += data.features.length;
                hasMore = data.features.length === pageSize;
                console.log(`Fetched ${allFeatures.length} features so far...`);
            } else {
                hasMore = false;
            }
        }

        const geojson = {
            type: 'FeatureCollection',
            features: allFeatures
        };
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson, null, 2));
        console.log(`Saved ${allFeatures.length} features to ${OUTPUT_PATH}`);
    } catch (error) {
        console.error('Error downloading San Jose plots:', error);
    }
}

downloadSanJosePlots(); 