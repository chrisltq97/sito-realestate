const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// Get all properties with filters
router.get('/', async (req, res) => {
    try {
        const {
            propertyType,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            minArea,
            maxArea,
            status
        } = req.query;

        const query = {};

        if (propertyType) query.propertyType = propertyType;
        if (status) query.status = status;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (bedrooms) query.bedrooms = Number(bedrooms);
        if (bathrooms) query.bathrooms = Number(bathrooms);
        if (minArea || maxArea) {
            query.area = {};
            if (minArea) query.area.$gte = Number(minArea);
            if (maxArea) query.area.$lte = Number(maxArea);
        }

        const properties = await Property.find(query);
        res.json(properties);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching properties', error: error.message });
    }
});

// Search properties by coordinates
router.get('/search', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            // If no coordinates provided, return all properties
            const properties = await Property.find();
            return res.json(properties);
        }

        // Search for properties near the given coordinates
        const properties = await Property.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 2000 // 2km radius
                }
            }
        }).limit(10);

        res.json(properties);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get property by ID
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (property) {
            res.json(property);
        } else {
            res.status(404).json({ message: 'Property not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new property
router.post('/', async (req, res) => {
    try {
        const property = new Property(req.body);
        await property.save();
        res.status(201).json(property);
    } catch (error) {
        res.status(400).json({ message: 'Error creating property', error: error.message });
    }
});

// Update property
router.put('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json(property);
    } catch (error) {
        res.status(400).json({ message: 'Error updating property', error: error.message });
    }
});

// Delete property
router.delete('/:id', async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting property', error: error.message });
    }
});

module.exports = router; 