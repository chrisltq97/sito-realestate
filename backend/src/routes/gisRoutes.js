const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Serve Escazu GIS plot data from local file
router.get('/plots', async (req, res) => {
    try {
        // Read the GIS data file
        const gisData = await fs.readFile(
            path.join(__dirname, '../data/escazu-plots.geojson'),
            'utf8'
        );
        
        res.json(JSON.parse(gisData));
    } catch (error) {
        console.error('Error serving GIS data:', error);
        res.status(500).json({ message: 'Failed to load GIS data' });
    }
});

// Get plot details by ID
router.get('/plots/:id', async (req, res) => {
    try {
        const plotId = req.params.id;
        const gisData = await fs.readFile(
            path.join(__dirname, '../data/escazu-plots.geojson'),
            'utf8'
        );
        
        const data = JSON.parse(gisData);
        const plot = data.features.find(feature => 
            feature.properties.id === plotId
        );
        
        if (plot) {
            res.json(plot.properties);
        } else {
            res.status(404).json({ message: 'Plot not found' });
        }
    } catch (error) {
        console.error('Error fetching plot details:', error);
        res.status(500).json({ message: 'Error fetching plot data' });
    }
});

// Proxy endpoint for identify (using local data)
router.get('/identify', async (req, res) => {
    try {
        const { geometry } = req.query;
        if (!geometry) {
            return res.status(400).json({ message: 'Geometry parameter is required' });
        }
        
        // Parse the coordinates
        const [lng, lat] = geometry.split(',').map(parseFloat);
        
        // Read the GIS data file
        const gisData = await fs.readFile(
            path.join(__dirname, '../data/escazu-plots.geojson'),
            'utf8'
        );
        
        const data = JSON.parse(gisData);
        
        // Find plots that contain the point (simple check for demo purposes)
        // In a real implementation, use proper point-in-polygon calculation
        const results = data.features.filter(feature => {
            const coords = feature.geometry.coordinates[0];
            
            // Simple bounding box check
            const lngs = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);
            
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            
            return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
        
        // Format results to match ArcGIS identify response
        res.json({
            results: results.map(feature => ({
                layerId: 0,
                layerName: "Parcelas",
                displayFieldName: "id",
                attributes: {
                    ...feature.properties,
                    OBJECTID: feature.properties.id,
                    Shape_Area: feature.properties.area
                }
            }))
        });
    } catch (error) {
        console.error('Error identifying plots:', error);
        res.status(500).json({ message: 'Error identifying plot data' });
    }
});

module.exports = router; 