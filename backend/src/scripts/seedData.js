const mongoose = require('mongoose');
const Property = require('../models/Property');

const sampleProperties = [
    {
        title: "Luxury Beachfront Villa",
        description: "Beautiful villa with stunning ocean views and private beach access",
        price: 1500000,
        location: {
            type: "Point",
            coordinates: [-84.5, 10.0] // San Jose coordinates
        },
        area: 500,
        bedrooms: 4,
        bathrooms: 3,
        propertyType: "House",
        images: [
            "https://example.com/villa1.jpg",
            "https://example.com/villa2.jpg"
        ],
        features: [
            "Ocean View",
            "Private Pool",
            "Garden"
        ],
        amenities: [
            "Air Conditioning",
            "Security System",
            "Garage"
        ],
        realtor: {
            name: "John Doe",
            email: "john@example.com",
            phone: "+506 1234-5678"
        },
        lawyer: {
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+506 8765-4321"
        },
        status: "Available"
    },
    {
        title: "Modern Downtown Apartment",
        description: "Contemporary apartment in the heart of San Jose",
        price: 450000,
        location: {
            type: "Point",
            coordinates: [-84.1, 9.9] // Downtown San Jose coordinates
        },
        area: 120,
        bedrooms: 2,
        bathrooms: 1,
        propertyType: "Apartment",
        images: [
            "https://example.com/apt1.jpg",
            "https://example.com/apt2.jpg"
        ],
        features: [
            "City View",
            "Balcony",
            "Modern Kitchen"
        ],
        amenities: [
            "Elevator",
            "Gym",
            "Parking"
        ],
        realtor: {
            name: "Alice Johnson",
            email: "alice@example.com",
            phone: "+506 2345-6789"
        },
        lawyer: {
            name: "Bob Wilson",
            email: "bob@example.com",
            phone: "+506 9876-5432"
        },
        status: "Available"
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/costa-rica-real-estate');
        console.log('Connected to MongoDB');

        // Clear existing data
        await Property.deleteMany({});
        console.log('Cleared existing data');

        // Insert sample properties
        const properties = await Property.insertMany(sampleProperties);
        console.log(`Inserted ${properties.length} properties`);

        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

seedDatabase(); 