const express = require('express');
const router = express.Router();
const gisService = require('../services/gisService');
const santaAnaGisService = require('../services/santaAnaGisService');

// Get property boundaries by coordinates
router.get('/boundaries', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const boundaries = await gisService.getPropertyBoundaries({ lat, lng });
        res.json(boundaries);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching property boundaries', error: error.message });
    }
});

// Get property details by ID
router.get('/property/:id', async (req, res) => {
    try {
        const propertyDetails = await gisService.getPropertyDetails(req.params.id);
        res.json(propertyDetails);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching property details', error: error.message });
    }
});

// Search properties by area
router.get('/search', async (req, res) => {
    try {
        const { south, west, north, east } = req.query;
        const properties = await gisService.searchPropertiesByArea({
            south: parseFloat(south),
            west: parseFloat(west),
            north: parseFloat(north),
            east: parseFloat(east)
        });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Error searching properties', error: error.message });
    }
});

// Get Escazu plots GeoJSON data
router.get('/plots', async (req, res) => {
    try {
        const plotsData = await gisService.getEscazuPlots();
        res.json(plotsData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching plot data', error: error.message });
    }
});

// Get Santa Ana plots GeoJSON data
router.get('/santa-ana/plots', async (req, res) => {
    try {
        const plotsData = await santaAnaGisService.getSantaAnaPlots();
        res.json(plotsData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Santa Ana plot data', error: error.message });
    }
});

module.exports = router; 