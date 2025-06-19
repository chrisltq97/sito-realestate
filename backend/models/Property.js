const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    area: {
        type: Number,
        required: true
    },
    bedrooms: Number,
    bathrooms: Number,
    propertyType: {
        type: String,
        enum: ['house', 'apartment', 'land', 'commercial'],
        required: true
    },
    images: [{
        type: String,
        required: true
    }],
    features: [String],
    amenities: [String],
    realtor: {
        name: String,
        email: String,
        phone: String,
        company: String
    },
    lawyer: {
        name: String,
        email: String,
        phone: String,
        office: String
    },
    status: {
        type: String,
        enum: ['available', 'pending', 'sold'],
        default: 'available'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for geospatial queries
propertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', propertySchema); 