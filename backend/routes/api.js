const gisService = require('../services/gisService');

// GIS Data Routes
router.get('/gis/update', async (req, res) => {
    try {
        const data = await gisService.updateGISData();
        res.json({
            success: true,
            message: `Successfully updated GIS data with ${data.features.length} features`,
            featureCount: data.features.length
        });
    } catch (error) {
        console.error('Error updating GIS data:', error);
        res.status(500).json({
            success: false,
            message: `Error updating GIS data: ${error.message}`
        });
    }
});

router.get('/gis/data', async (req, res) => {
    try {
        const forceFetch = req.query.force === 'true';
        const data = await gisService.getGISData(forceFetch);
        res.json(data);
    } catch (error) {
        console.error('Error getting GIS data:', error);
        res.status(500).json({
            success: false,
            message: `Error getting GIS data: ${error.message}`
        });
    }
});

router.get('/gis/property/:id', async (req, res) => {
    try {
        const plotId = req.params.id;
        const data = await gisService.getPropertyDetails(plotId);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(`Error getting property details for plot ${req.params.id}:`, error);
        res.status(404).json({
            success: false,
            message: `Property not found: ${error.message}`
        });
    }
}); 