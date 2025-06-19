const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'escazu_plots.json');

function validateGeoJSON(file) {
  try {
    const stream = fs.createReadStream(file, { encoding: 'utf8' });
    let json = '';
    stream.on('data', chunk => {
      json += chunk;
      // Stop reading after 5MB (enough for header and first feature)
      if (json.length > 5 * 1024 * 1024) {
        stream.destroy();
      }
    });
    stream.on('close', () => {
      try {
        const data = JSON.parse(json);
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          console.error('Not a valid GeoJSON FeatureCollection.');
          process.exit(1);
        }
        console.log('GeoJSON is valid.');
        console.log('Number of features:', data.features.length);
        if (data.features.length > 0) {
          console.log('First feature:', JSON.stringify(data.features[0], null, 2));
        } else {
          console.log('No features found.');
        }
      } catch (e) {
        console.error('Error parsing JSON:', e.message);
        process.exit(1);
      }
    });
    stream.on('error', err => {
      console.error('Error reading file:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

validateGeoJSON(filePath); 