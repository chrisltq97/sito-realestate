// Minimal main.js - contains only essential UI functions
// All map-related functionality is in map.js

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Setup mobile menu toggle
    setupMobileMenu();
    
    // Load and display featured properties
    loadFeaturedProperties();
});

// Setup mobile menu toggle
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            // Toggle active class on menu button
            this.classList.toggle('active');
            
            // Toggle mobile-active class on nav menu
            navMenu.classList.toggle('mobile-active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navMenu.contains(event.target);
            const isClickInsideToggle = mobileMenuToggle.contains(event.target);
            
            if (!isClickInsideMenu && !isClickInsideToggle && navMenu.classList.contains('mobile-active')) {
                navMenu.classList.remove('mobile-active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
}

// Load and display featured properties (active listings)
async function loadFeaturedProperties() {
    const featuredContainer = document.getElementById('featuredProperties');
    if (!featuredContainer) {
        console.log('Featured container not found');
        return;
    }

    try {
        // Get the initialized Supabase client
        const supabase = window.initSupabase();
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        console.log('Fetching featured properties...');

        // Query active listings from Supabase
        const { data: listings, error } = await supabase
            .from('listings')
            .select(`
                *,
                properties (*)
            `)
            .limit(6); // Limit to 6 featured properties

        console.log('Listings query result:', { listings, error });

        if (error) throw error;

        if (!listings || listings.length === 0) {
            console.log('No listings found');
            featuredContainer.innerHTML = '<p class="no-properties">No active listings available</p>';
            return;
        }

        // Create property cards
        const propertyCards = listings.map(listing => {
            const property = listing.properties;
            if (!property) return ''; // Skip if no property data

            const mainImage = listing.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image';
            
            return `
                <div class="property-card" onclick="window.location.href='property.html?id=${property.finca_regi}'">
                    <div class="property-card-image" style="background-image: url('${mainImage}')">
                        <div class="property-card-status active">Active</div>
                    </div>
                    <div class="property-card-info">
                        <div class="property-card-price">$${listing.price?.toLocaleString() || 'N/A'}</div>
                        <div class="property-card-specs">
                            ${property.bedrooms || 0} beds • ${property.bathrooms || 0} baths • ${property.area || 0} m²
                        </div>
                        <div class="property-card-address">${property.address || 'Address not available'}</div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('Generated property cards:', propertyCards ? 'Has content' : 'Empty');
        featuredContainer.innerHTML = propertyCards;

    } catch (error) {
        console.error('Error loading featured properties:', error);
        featuredContainer.innerHTML = '<p class="no-properties">Error loading properties</p>';
    }
} 