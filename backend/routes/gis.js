const express = require('express');
const router = express.Router();
const sanJoseGisService = require('../services/sanJoseGisService');
const santaAnaGisService = require('../services/santaAnaGisService');

// Endpoint for San Jose properties
router.get('/san-jose/plots', async (req, res) => {
    try {
        const plots = await sanJoseGisService.getSanJosePlots();
        res.json(plots);
    } catch (error) {
        console.error('Error fetching San Jose plots:', error);
        res.status(500).json({ error: 'Failed to fetch San Jose plots' });
    }
});

// Endpoint for Santa Ana properties
router.get('/santa-ana/plots', async (req, res) => {
    try {
        const plots = await santaAnaGisService.getSantaAnaPlots();
        res.json(plots);
    } catch (error) {
        console.error('Error fetching Santa Ana plots:', error);
        res.status(500).json({ error: 'Failed to fetch Santa Ana plots' });
    }
});

module.exports = router; 