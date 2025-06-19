const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realestate')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Property Schema
const propertySchema = new mongoose.Schema({
    title: String,
    price: Number,
    type: String,
    propertyType: String,
    area: Number,
    bedrooms: Number,
    bathrooms: Number,
    address: String,
    description: String,
    features: [String],
    images: [String],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
});

const Property = mongoose.model('Property', propertySchema);

// Import Routes
const gisRoutes = require('./routes/gisRoutes');

// Routes
app.get('/api/properties', async (req, res) => {
    try {
        const { type, search } = req.query;
        let query = {};
        
        if (type) {
            query.type = type;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { propertyType: { $regex: search, $options: 'i' } }
            ];
        }
        
        const properties = await Property.find(query);
        res.json(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});

// Use GIS Routes
app.use('/api/gis', gisRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 