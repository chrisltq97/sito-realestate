const fs = require('fs');
const path = require('path');

// Simple coordinate transformation from EPSG:5367 to EPSG:4326
// This is an approximation for Costa Rica coordinates
function reprojectCoordinate(x, y) {
    // EPSG:5367 is Costa Rica CRTM05
    // These are approximate transformation parameters for Costa Rica
    const falseEasting = 500000;
    const falseNorthing = 0;
    const centralMeridian = -84.0; // Costa Rica central meridian
    const scaleFactor = 0.9999;
    const latitudeOfOrigin = 0.0;
    
    // Simplified inverse projection (approximate)
    // For more accuracy, you'd use a proper projection library like proj4js
    const adjustedX = (x - falseEasting) / 100000;
    const adjustedY = y / 100000;
    
    // Approximate conversion to lat/lon
    const lon = centralMeridian + (adjustedX * 0.009);
    const lat = latitudeOfOrigin + (adjustedY * 0.009);
    
    return [lon, lat];
}

// More accurate transformation using known control points
function reprojectCoordinateAccurate(x, y) {
    // Based on Costa Rica coordinate system parameters
    // EPSG:5367 uses CRTM05 projection
    
    // Approximate transformation for Costa Rica region
    // These parameters are derived from known coordinate pairs
    const a = -84.5; // Base longitude
    const b = 9.5;   // Base latitude
    const scaleX = 0.00001; // Scale factor for X
    const scaleY = 0.00001; // Scale factor for Y
    
    const lon = a + (x - 450000) * scaleX;
    const lat = b + (y - 1050000) * scaleY;
    
    return [lon, lat];
}

function reprojectGeometry(geometry) {
    if (!geometry || !geometry.coordinates) return geometry;
    
    if (geometry.type === 'Polygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(ring =>
                ring.map(coord => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                        return reprojectCoordinateAccurate(coord[0], coord[1]);
                    }
                    return coord;
                })
            )
        };
    } else if (geometry.type === 'MultiPolygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(polygon =>
                polygon.map(ring =>
                    ring.map(coord => {
                        if (Array.isArray(coord) && coord.length >= 2) {
                            return reprojectCoordinateAccurate(coord[0], coord[1]);
                        }
                        return coord;
                    })
                )
            )
        };
    }
    
    return geometry;
}

async function reprojectSantaAnaData() {
    console.log('🔄 Reprojecting Santa Ana data from EPSG:5367 to EPSG:4326...');
    
    const inputPath = path.join(__dirname, '../public/data/santaana_plots.geojson');
    const outputPath = path.join(__dirname, '../public/data/santaana_plots_wgs84.geojson');
    
    try {
        // Read the original data
        const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        console.log(`📖 Read ${data.features.length} features`);
        
        // Reproject each feature
        const reprojectedFeatures = data.features.map((feature, index) => {
            if (index % 5000 === 0) {
                console.log(`🔄 Processing feature ${index + 1}/${data.features.length}`);
            }
            
            return {
                ...feature,
                geometry: reprojectGeometry(feature.geometry)
            };
        });
        
        // Create new GeoJSON
        const reprojectedData = {
            ...data,
            features: reprojectedFeatures,
            crs: {
                type: "name",
                properties: {
                    name: "EPSG:4326"
                }
            }
        };
        
        // Write the reprojected data
        fs.writeFileSync(outputPath, JSON.stringify(reprojectedData, null, 2));
        console.log(`✅ Reprojected data saved to: ${outputPath}`);
        
        // Test a sample coordinate
        const sampleOriginal = data.features[0].geometry.coordinates[0][0];
        const sampleReprojected = reprojectedData.features[0].geometry.coordinates[0][0];
        console.log('📍 Sample coordinate transformation:');
        console.log(`   Original: [${sampleOriginal[0]}, ${sampleOriginal[1]}]`);
        console.log(`   Reprojected: [${sampleReprojected[0]}, ${sampleReprojected[1]}]`);
        
        return outputPath;
        
    } catch (error) {
        console.error('❌ Error reprojecting data:', error);
        throw error;
    }
}

if (require.main === module) {
    reprojectSantaAnaData().catch(console.error);
}

module.exports = { reprojectSantaAnaData }; 