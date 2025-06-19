const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

// Define CRTM05 (EPSG:5367) and WGS84 (EPSG:4326)
// CRTM05 proj4 string from official sources
const crtm05 = '+proj=tmerc +lat_0=0 +lon_0=-84 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs';
const wgs84 = proj4.WGS84;

proj4.defs('EPSG:5367', crtm05);

function reprojectCoords(coords, type) {
    if (type === 'Polygon') {
        return coords.map(ring => ring.map(([x, y]) => proj4('EPSG:5367', wgs84, [x, y])));
    } else if (type === 'MultiPolygon') {
        return coords.map(poly => poly.map(ring => ring.map(([x, y]) => proj4('EPSG:5367', wgs84, [x, y]))));
    }
    return coords;
}

function reprojectFeature(feature) {
    if (!feature.geometry) return feature;
    return {
        ...feature,
        geometry: {
            ...feature.geometry,
            coordinates: reprojectCoords(feature.geometry.coordinates, feature.geometry.type)
        }
    };
}

async function reprojectSantaAnaProj4() {
    const inputPath = path.join(__dirname, '../public/data/santaana_plots.geojson');
    const outputPath = path.join(__dirname, '../public/data/santaana_plots_proj4.geojson');
    console.log('Reading:', inputPath);
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`Features: ${data.features.length}`);
    const reprojected = {
        ...data,
        features: data.features.map(reprojectFeature),
        crs: {
            type: 'name',
            properties: { name: 'EPSG:4326' }
        }
    };
    fs.writeFileSync(outputPath, JSON.stringify(reprojected, null, 2));
    console.log('Saved:', outputPath);
    // Print a sample transformation
    const orig = data.features[0].geometry.type === 'Polygon'
        ? data.features[0].geometry.coordinates[0][0]
        : data.features[0].geometry.coordinates[0][0][0];
    const reproj = reprojected.features[0].geometry.type === 'Polygon'
        ? reprojected.features[0].geometry.coordinates[0][0]
        : reprojected.features[0].geometry.coordinates[0][0][0];
    console.log('Sample original:', orig);
    console.log('Sample reprojected:', reproj);
}

if (require.main === module) {
    reprojectSantaAnaProj4().catch(console.error);
} 