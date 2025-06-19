const express = require('express');
const { supabase } = require('../supabaseClient');
const router = express.Router();
const Property = require('../models/Property');

// Search properties by location
router.post('/search', async (req, res) => {
    try {
        const { coordinates } = req.body;
        
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            return res.status(400).json({ message: 'Invalid coordinates. Please provide [longitude, latitude]' });
        }

        const [longitude, latitude] = coordinates;

        // Find properties within 10km of the given coordinates
        const properties = await Property.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: 10000 // 10km in meters
                }
            }
        });

        if (!properties.length) {
            return res.status(404).json({ message: 'No properties found in this area' });
        }

        res.json(properties);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching properties: ' + error.message });
    }
});

// Get all properties
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get a single property
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
});

// Create a new property
router.post('/', async (req, res) => {
    const { data, error } = await supabase.from('properties').insert([req.body]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
});

// Update a property
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('properties').update(req.body).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete a property
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).end();
});

module.exports = router; 