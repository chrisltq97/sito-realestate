const mongoose = require('mongoose');
require('dotenv').config();

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

// Sample properties
const sampleProperties = [
    {
        title: "Luxury Villa in Escazu",
        price: 850000,
        type: "Sale",
        propertyType: "Villa",
        area: 450,
        bedrooms: 5,
        bathrooms: 4,
        address: "Escazu, San Jose",
        description: "Beautiful luxury villa with modern amenities and stunning views",
        features: ["Pool", "Garden", "Security System", "Garage"],
        images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811"],
        location: {
            type: "Point",
            coordinates: [-84.1307, 9.9181]
        }
    },
    {
        title: "Modern Apartment",
        price: 450000,
        type: "Sale",
        propertyType: "Apartment",
        area: 120,
        bedrooms: 2,
        bathrooms: 2,
        address: "San Rafael, Escazu",
        description: "Modern apartment in the heart of Escazu with great amenities",
        features: ["Gym", "Pool", "24/7 Security", "Parking"],
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
        location: {
            type: "Point",
            coordinates: [-84.1407, 9.9281]
        }
    },
    {
        title: "Family Home",
        price: 650000,
        type: "Sale",
        propertyType: "House",
        area: 250,
        bedrooms: 4,
        bathrooms: 3,
        address: "San Antonio, Escazu",
        description: "Spacious family home with garden and mountain views",
        features: ["Garden", "Terrace", "Security", "Storage"],
        images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750"],
        location: {
            type: "Point",
            coordinates: [-84.1207, 9.9081]
        }
    }
];

// Connect to MongoDB and seed data
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realestate')
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Clear existing properties
        await Property.deleteMany({});
        console.log('Cleared existing properties');
        
        // Insert sample properties
        await Property.insertMany(sampleProperties);
        console.log('Added sample properties');
        
        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    }); 