const config = {
    // Mapbox configuration
    mapbox: {
        accessToken: 'pk.eyJ1IjoiZG9tdXNyZWFsZXN0YXRlIiwiYSI6ImNscXFmaTAycTF1MGoya3BpNWQ3MWxyc2kifQ.HpEu4Phjf7_QcYmFmVK90Q',
        defaultStyle: 'mapbox://styles/mapbox/streets-v12',
        defaultCenter: [-84.1307, 9.9181], // Escazu coordinates
        defaultZoom: 13
    },

    // API endpoints
    api: {
        baseUrl: '/api',
        gis: {
            update: '/gis/update',
            plots: '/gis/plots'
        },
        properties: {
            list: '/properties',
            details: '/properties/:id',
            create: '/properties/create',
            update: '/properties/:id',
            delete: '/properties/:id'
        },
        users: {
            register: '/users/register',
            login: '/users/login',
            profile: '/users/profile',
            update: '/users/update'
        }
    },

    // File paths
    paths: {
        data: './data',
        images: './img',
        components: './components',
        tests: './tests'
    },

    // Cache settings
    cache: {
        gisData: {
            key: 'escazu_plots',
            expiry: 24 * 60 * 60 * 1000 // 24 hours
        }
    }
};

// Export the configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} 