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
    propertyType: {
        type: String,
        enum: ['HOUSE', 'APARTMENT', 'COMMERCIAL', 'LAND'],
        required: true
    },
    bedrooms: {
        type: Number,
        default: 0
    },
    bathrooms: {
        type: Number,
        default: 0
    },
    area: {
        type: Number,
        required: true
    },
    images: [{
        type: String
    }],
    features: [{
        type: String
    }],
    amenities: [{
        type: String
    }],
    realtor: {
        name: String,
        email: String,
        phone: String
    },
    lawyer: {
        name: String,
        email: String,
        phone: String
    },
    status: {
        type: String,
        enum: ['Available', 'Pending', 'Sold'],
        default: 'Available'
    },
    plotInfo: {
        id: String,
        area: Number,
        number: String
    }
}, {
    timestamps: true
});

propertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', propertySchema); 