const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// Handle contact form submission
router.post('/', async (req, res) => {
    try {
        const { propertyId, name, email, message } = req.body;

        // Find the property to get realtor and lawyer information
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Here you would typically:
        // 1. Send an email to the realtor
        // 2. Send an email to the lawyer
        // 3. Store the inquiry in a database
        // For now, we'll just log the information
        console.log('New property inquiry:', {
            propertyId,
            propertyTitle: property.title,
            realtor: property.realtor,
            lawyer: property.lawyer,
            inquiry: {
                name,
                email,
                message
            }
        });

        res.json({ message: 'Inquiry received successfully' });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ message: 'Error processing your inquiry' });
    }
});

module.exports = router; 