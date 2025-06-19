const fs = require('fs');

const inputPath = './data/escazu_plots.json';
const outputPath = './data/properties.json';

const raw = fs.readFileSync(inputPath, 'utf8');
const geojson = JSON.parse(raw);

const properties = geojson.features
  .filter(f => f.properties && f.properties.finca_regi) // Only those with finca_regi
  .map(f => {
    // Copy all properties fields
    const prop = { ...f.properties };
    // Set id to OBJECTID
    prop.id = String(prop.OBJECTID);
    // Optionally, add centroid coordinates if available
    if (f.geometry && f.geometry.type === 'Polygon') {
      // Simple centroid calculation (average of first ring)
      const coords = f.geometry.coordinates[0];
      const centroid = coords.reduce(
        (acc, c) => [acc[0] + c[0], acc[1] + c[1]],
        [0, 0]
      ).map(sum => sum / coords.length);
      prop.coordinates = centroid;
    }
    return prop;
  });

fs.writeFileSync(outputPath, JSON.stringify(properties, null, 2));
console.log(`Wrote ${properties.length} properties to ${outputPath}`); 