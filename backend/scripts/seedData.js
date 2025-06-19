const mongoose = require('mongoose');
const Property = require('../models/Property');

const sampleProperties = [
    {
        title: 'Luxury Beachfront Villa',
        description: 'Stunning beachfront villa with panoramic ocean views and modern amenities in Tamarindo.',
        price: 1200000,
        location: {
            type: 'Point',
            coordinates: [-85.8395, 10.2992], // Tamarindo
            address: 'Playa Tamarindo, Guanacaste, Costa Rica'
        },
        area: 450,
        bedrooms: 4,
        bathrooms: 3,
        propertyType: 'house',
        images: [
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811',
            'https://images.unsplash.com/photo-1600596542815-ffad4c153aee9',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'
        ],
        features: [
            'Ocean View',
            'Private Pool',
            'Gourmet Kitchen',
            'Smart Home System',
            'Security System'
        ],
        amenities: [
            'Beach Access',
            'Garden',
            'Garage',
            'Air Conditioning',
            'High-Speed Internet'
        ],
        realtor: {
            name: 'John Smith',
            email: 'john.smith@domus.com',
            phone: '+506 8888-8888',
            company: 'Domus'
        },
        lawyer: {
            name: 'Maria Rodriguez',
            email: 'maria.rodriguez@lawfirm.com',
            phone: '+506 7777-7777',
            office: 'Costa Rica Legal Services'
        },
        status: 'available'
    },
    {
        title: 'Modern Escazu Penthouse',
        description: 'Luxurious penthouse with city and mountain views in the exclusive Escazu area.',
        price: 850000,
        location: {
            type: 'Point',
            coordinates: [-84.1307, 9.9181], // Escazu
            address: 'Escazu, San José Province, Costa Rica'
        },
        area: 280,
        bedrooms: 3,
        bathrooms: 2.5,
        propertyType: 'apartment',
        images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
            'https://images.unsplash.com/photo-1502005097973-6a7082348e28',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'
        ],
        features: [
            'Mountain View',
            'City View',
            'Private Terrace',
            'Wine Cellar',
            '24/7 Security'
        ],
        amenities: [
            'Gym',
            'Pool',
            'Spa',
            'Concierge',
            'Parking'
        ],
        realtor: {
            name: 'Ana Garcia',
            email: 'ana.garcia@domus.com',
            phone: '+506 9999-9999',
            company: 'Domus'
        },
        lawyer: {
            name: 'Carlos Fernandez',
            email: 'carlos.fernandez@lawfirm.com',
            phone: '+506 6666-6666',
            office: 'San Jose Legal Group'
        },
        status: 'available'
    },
    {
        title: 'Tropical Paradise Villa',
        description: 'Spectacular villa surrounded by tropical gardens in Manuel Antonio.',
        price: 950000,
        location: {
            type: 'Point',
            coordinates: [-84.1552, 9.3920], // Manuel Antonio
            address: 'Manuel Antonio, Puntarenas Province, Costa Rica'
        },
        area: 380,
        bedrooms: 5,
        bathrooms: 4,
        propertyType: 'house',
        images: [
            'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
            'https://images.unsplash.com/photo-1576941089067-2de3c901e126',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a'
        ],
        features: [
            'Ocean View',
            'Infinity Pool',
            'Tropical Gardens',
            'Guest House',
            'Outdoor Kitchen'
        ],
        amenities: [
            'Beach Access',
            'Nature Trails',
            'Security System',
            'Solar Panels',
            'Water Storage'
        ],
        realtor: {
            name: 'Sofia Torres',
            email: 'sofia.torres@domus.com',
            phone: '+506 7777-8888',
            company: 'Domus'
        },
        lawyer: {
            name: 'Diego Mora',
            email: 'diego.mora@lawfirm.com',
            phone: '+506 8888-7777',
            office: 'Pacific Coast Legal'
        },
        status: 'available'
    },
    {
        title: 'Santa Teresa Beach House',
        description: 'Modern beach house steps from the famous surf spots of Santa Teresa.',
        price: 780000,
        location: {
            type: 'Point',
            coordinates: [-85.1647, 9.6433], // Santa Teresa
            address: 'Santa Teresa, Puntarenas Province, Costa Rica'
        },
        area: 220,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: 'house',
        images: [
            'https://images.unsplash.com/photo-1523217582562-09d0def993a6',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
            'https://images.unsplash.com/photo-1600566753376-12c8ab8c17a5'
        ],
        features: [
            'Beach View',
            'Surf Storage',
            'Outdoor Shower',
            'Yoga Deck',
            'Sustainable Design'
        ],
        amenities: [
            'Swimming Pool',
            'Garden',
            'BBQ Area',
            'Parking',
            'Security System'
        ],
        realtor: {
            name: 'Lucas Herrera',
            email: 'lucas.herrera@domus.com',
            phone: '+506 6666-9999',
            company: 'Domus'
        },
        lawyer: {
            name: 'Isabella Campos',
            email: 'isabella.campos@lawfirm.com',
            phone: '+506 9999-6666',
            office: 'Nicoya Legal Services'
        },
        status: 'available'
    },
    {
        title: 'Arenal Lake View Estate',
        description: 'Stunning estate with panoramic views of Arenal Volcano and Lake.',
        price: 1100000,
        location: {
            type: 'Point',
            coordinates: [-84.7697, 10.4796], // La Fortuna
            address: 'La Fortuna, Alajuela Province, Costa Rica'
        },
        area: 520,
        bedrooms: 6,
        bathrooms: 5,
        propertyType: 'house',
        images: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
            'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde',
            'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3'
        ],
        features: [
            'Volcano View',
            'Lake View',
            'Private Forest',
            'Helipad',
            'Wine Cellar'
        ],
        amenities: [
            'Infinity Pool',
            'Tennis Court',
            'Guest House',
            'Staff Quarters',
            'Organic Garden'
        ],
        realtor: {
            name: 'Gabriel Jimenez',
            email: 'gabriel.jimenez@domus.com',
            phone: '+506 8888-6666',
            company: 'Domus'
        },
        lawyer: {
            name: 'Valentina Rojas',
            email: 'valentina.rojas@lawfirm.com',
            phone: '+506 7777-9999',
            office: 'Northern Zone Legal'
        },
        status: 'available'
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect('mongodb://localhost:27017/costa-rica-real-estate');
        console.log('Connected to MongoDB');

        // Clear existing data
        await Property.deleteMany({});
        console.log('Cleared existing properties');

        // Insert sample data
        await Property.insertMany(sampleProperties);
        console.log('Added sample properties');

        console.log('Database seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase(); 