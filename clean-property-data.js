const fs = require('fs');

function calculateCentroid(coords) {
  // coords: array of [lng, lat] pairs
  if (!Array.isArray(coords) || coords.length === 0) return null;
  let x = 0, y = 0;
  coords.forEach(([lng, lat]) => {
    x += lng;
    y += lat;
  });
  return [x / coords.length, y / coords.length];
}

// Escazú processing
try {
  const escazuInputPath = './data/escazu_plots.json';
  const escazuOutputPath = './data/minimal_properties_escazu.json';
  if (fs.existsSync(escazuInputPath)) {
    const escazuFullData = JSON.parse(fs.readFileSync(escazuInputPath, 'utf8'));
    const escazuMinimalData = {
      type: 'FeatureCollection',
      features: escazuFullData.features.map(feature => {
        const finca_regi = feature.properties.finca_regi || feature.properties.FINCA_REGISTRAL || feature.properties.FINCA || feature.properties.NUMERO_FINCA || '';
        const oid = feature.properties.objectId || feature.properties.OBJECTID || feature.properties.FID || feature.properties.ID || '';
        const address = feature.properties.DIRECCION || feature.properties.ADDRESS || feature.properties.LOCALIZACION || 'Unknown';
        let centroid = null;
        if (feature.geometry) {
          if (feature.geometry.type === 'Polygon' && Array.isArray(feature.geometry.coordinates[0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0]);
          } else if (feature.geometry.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates[0][0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0][0]);
          } else if (feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            centroid = feature.geometry.coordinates;
          } else {
            console.warn(`Escazú: Unknown geometry type or malformed coordinates for feature with oid ${oid}`);
          }
        }
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            finca_regi,
            oid,
            address,
            centroid: centroid ? { type: 'Point', coordinates: centroid } : null
          }
        };
      })
    };
    fs.writeFileSync(escazuOutputPath, JSON.stringify(escazuMinimalData, null, 2));
    console.log('Escazú minimal properties written to', escazuOutputPath);
  } else {
    console.log('Escazú input file not found, skipping.');
  }
} catch (err) {
  console.error('Error processing Escazú:', err);
}

// San José processing
try {
  const sanjoseInputPath = './data/sanjose_plots.geojson';
  const sanjoseOutputPath = './data/minimal_properties_sanjose.json';
  if (fs.existsSync(sanjoseInputPath)) {
    const sanjoseFullData = JSON.parse(fs.readFileSync(sanjoseInputPath, 'utf8'));
    const sanjoseMinimalData = {
      type: 'FeatureCollection',
      features: sanjoseFullData.features.map(feature => {
        const finca_regi = feature.properties.FINCA || '';
        const oid = feature.properties.objectId || feature.properties.OBJECTID || feature.properties.FID || feature.properties.ID || '';
        const address = feature.properties.DIRECCION || feature.properties.ADDRESS || feature.properties.LOCALIZACION || 'Unknown';
        let centroid = null;
        if (feature.geometry) {
          if (feature.geometry.type === 'Polygon' && Array.isArray(feature.geometry.coordinates[0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0]);
          } else if (feature.geometry.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates[0][0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0][0]);
          } else if (feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            centroid = feature.geometry.coordinates;
          } else {
            console.warn(`San José: Unknown geometry type or malformed coordinates for feature with oid ${oid}`);
          }
        }
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            finca_regi,
            oid,
            address,
            centroid: centroid ? { type: 'Point', coordinates: centroid } : null
          }
        };
      })
    };
    fs.writeFileSync(sanjoseOutputPath, JSON.stringify(sanjoseMinimalData, null, 2));
    console.log('San José minimal properties written to', sanjoseOutputPath);
  } else {
    console.log('San José input file not found, skipping.');
  }
} catch (err) {
  console.error('Error processing San José:', err);
}

// Santa Ana processing
try {
  const santaanaInputPath = './data/santaana_plots.geojson';
  const santaanaOutputPath = './data/minimal_properties_santaana.json';
  if (fs.existsSync(santaanaInputPath)) {
    const santaanaFullData = JSON.parse(fs.readFileSync(santaanaInputPath, 'utf8'));
    const santaanaMinimalData = {
      type: 'FeatureCollection',
      features: santaanaFullData.features.map(feature => {
        const finca_regi = feature.properties.finca || feature.properties.FINCA || feature.properties.FINCA_REGISTRAL || feature.properties.NUMERO_FINCA || '';
        const oid = feature.properties.objectId || feature.properties.OBJECTID || feature.properties.FID || feature.properties.ID || '';
        const address = feature.properties.DIRECCION || feature.properties.ADDRESS || feature.properties.LOCALIZACION || 'Unknown';
        let centroid = null;
        if (feature.geometry) {
          if (feature.geometry.type === 'Polygon' && Array.isArray(feature.geometry.coordinates[0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0]);
          } else if (feature.geometry.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates[0][0])) {
            centroid = calculateCentroid(feature.geometry.coordinates[0][0]);
          } else if (feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            centroid = feature.geometry.coordinates;
          } else {
            console.warn(`Santa Ana: Unknown geometry type or malformed coordinates for feature with oid ${oid}`);
          }
        }
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            finca_regi,
            oid,
            address,
            centroid: centroid ? { type: 'Point', coordinates: centroid } : null
          }
        };
      })
    };
    fs.writeFileSync(santaanaOutputPath, JSON.stringify(santaanaMinimalData, null, 2));
    console.log('Santa Ana minimal properties written to', santaanaOutputPath);
  } else {
    console.log('Santa Ana input file not found, skipping.');
  }
} catch (err) {
  console.error('Error processing Santa Ana:', err);
}

// --- Script to set feature.id = finca_regi (or oid) for all features in a GeoJSON file ---
function setIdToFincaRegi(inputPath, outputPath) {
  const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  let updated = 0;
  geojson.features.forEach(feature => {
    if (feature.properties) {
      // Set finca_regi from region-specific fields if not present
      if (!feature.properties.finca_regi && feature.properties.FINCA) {
        feature.properties.finca_regi = String(feature.properties.FINCA);
      } else if (!feature.properties.finca_regi && feature.properties.finca) {
        feature.properties.finca_regi = String(feature.properties.finca);
      }
      // Now set id to finca_regi if present, else oid
      if (feature.properties.finca_regi) {
        feature.id = String(feature.properties.finca_regi);
        updated++;
      } else if (feature.properties.oid) {
        feature.id = String(feature.properties.oid);
      }
    }
  });
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`Updated ${updated} features to use finca_regi as id. Saved to ${outputPath}`);
}

// Example usage:
setIdToFincaRegi('./backend/public/data/escazu_plots.json', './backend/public/data/cleaned_properties_escazu.json');
setIdToFincaRegi('./backend/public/data/sanjose_plots.geojson', './backend/public/data/cleaned_properties_sanjose.json');
setIdToFincaRegi('./backend/public/data/santaana_plots.geojson', './backend/public/data/cleaned_properties_santaana.json'); 