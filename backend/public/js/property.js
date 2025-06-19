// Property Detail Page JavaScript
// Remove the old DOMContentLoaded handler that uses loadPropertyWithRegistry

// Basic page troubleshooting
function troubleshootPage() {
    console.log('Starting page troubleshooting...');
    
    // Check for main elements
    const elements = [
        'mainImage',
        'thumbnailStrip',
        'propertyTitle',
        'propertyAddress',
        'propertyPrice',
        'propertyBeds',
        'propertyBaths',
        'propertyArea',
        'propertyType',
        'propertyDescription',
        'propertyMap',
        'featuresGrid'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        console.log(`Element "${elementId}": ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Check for scripts
    const scripts = [
        'mapbox-gl-js',
        'lightgallery.min.js',
        'lg-zoom.min.js',
        'lg-thumbnail.min.js',
        'main.js',
        'profile.js',
        'property.js'
    ];
    
    scripts.forEach(scriptName => {
        console.log(`Script "${scriptName}": ${document.querySelector(`script[src*="${scriptName}"]`) ? 'Loaded' : 'Not found or not loaded'}`);
    });
    
    // Check for external resources
    const externalResources = [
        { name: 'Font Awesome', selector: 'link[href*="font-awesome"]' },
        { name: 'Mapbox CSS', selector: 'link[href*="mapbox-gl.css"]' },
        { name: 'Lightgallery CSS', selector: 'link[href*="lightgallery"]' }
    ];
    
    externalResources.forEach(resource => {
        console.log(`External resource "${resource.name}": ${document.querySelector(resource.selector) ? 'Loaded' : 'Not found or not loaded'}`);
    });
    
    console.log('Troubleshooting complete');
}

// Helper: Convert GIS feature to property format (copy from property-data.js)
function convertGISToProperty(feature) {
    const props = feature.properties || {};
    // Calculate center coordinates from geometry
    function calculateGeometryCenter(geometry) {
        if (!geometry) return [-84.1487, 9.9333];
        if (geometry.type === 'Point') return geometry.coordinates;
        if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates[0])) {
            const coords = geometry.coordinates[0];
            let sumX = 0, sumY = 0;
            coords.forEach(coord => { sumX += coord[0]; sumY += coord[1]; });
            return [sumX / coords.length, sumY / coords.length];
        }
        return [-84.1487, 9.9333];
    }
    const center = calculateGeometryCenter(feature.geometry);
    const lng = center[0] || -84.1487;
    const lat = center[1] || 9.9333;
    return {
        id: props.id || `OID-${props.OBJECTID || Math.floor(Math.random() * 1000)}`,
        finca_regi: props.finca_regi || null,
        address: props.address || `${props.id || 'Unknown'} Example Street, Escazu, Costa Rica`,
        location: { lat: lat, lng: lng },
        area: props.area || Math.floor(Math.random() * 3000) + 1000,
        zone: props.zone || 'Residential',
        title: props.name || `Property ${props.id || 'Unknown'}`,
        price: props.price ? `$${props.price.toLocaleString()}` : '',
        priceNumber: props.price || 0,
        bedrooms: props.bedrooms || Math.floor(Math.random() * 5) + 1,
        bathrooms: props.bathrooms || Math.floor(Math.random() * 4) + 1,
        images: [
            './images/property-1.jpg',
            './images/property-2.jpg',
            './images/property-3.jpg',
            './images/property-4.jpg'
        ],
        type: props.type || 'Unknown',
        yearBuilt: props.year_built || (2000 + Math.floor(Math.random() * 23)),
        lot: props.lot_size || `${(Math.random() * 2 + 0.1).toFixed(2)} acres`,
        mlsNumber: props.mls || `CR${Math.floor(Math.random() * 900000) + 100000}`,
        description: props.description || 'This stunning property offers modern amenities and a prime location in Escazu. Perfect for families looking for comfort and convenience.',
        features: props.features || [],
        status: 'off-market',
        lastSoldDate: '',
        lastSoldPrice: ''
    };
}

// New: Load property from Supabase
async function loadPropertyWithRegistry(propertyId) {
    try {
        console.log('[DEBUG] Querying property with finca_regi:', propertyId);
        
        // 1. First get base property data - this should always work
        const { data: property, error: propertyError } = await supabase
            .from('properties')
            .select('*')
            .eq('finca_regi', propertyId)
            .single();
        
        console.log('[DEBUG] Property query result:', { property, propertyError });
        
        // If we can't get the base property data, we can't continue
        if (propertyError) throw propertyError;
        if (!property) {
            console.error('Property not found:', propertyId);
            return null;
        }

        // Initialize the result with the base property
        let result = { ...property, status: 'off-market' };

        // 2. Try to get listing data (for active properties)
        try {
            const { data: listing } = await supabase
                .from('listings')
                .select('*')
                .eq('finca_regi', propertyId)
                .single();
            
            if (listing) {
                console.log('[DEBUG] Found active listing:', listing);
                // Make sure images array exists and is properly formatted
                const images = listing.images || [];
                console.log('[DEBUG] Listing images:', images);
                
                result = {
                    ...result,
                    ...listing,
                    status: 'active',
                    images: images, // Keep original image URLs
                    listing: listing // Keep original listing data separate too
                };
            }
        } catch (listingError) {
            console.log('[DEBUG] No active listing found:', listingError);
            // Continue without listing data - property is off-market
        }

        // 3. Try to get registry data if available (optional)
        try {
            const { data: registry } = await supabase
                .from('registry_data')
                .select('*')
                .eq('finca_regi', propertyId)
                .single();
            
            if (registry) {
                console.log('[DEBUG] Found registry data:', registry);
                result.registry = registry;
            }
        } catch (registryError) {
            console.log('[DEBUG] No registry data found:', registryError);
            // Continue without registry data - it's optional
        }

        console.log('[DEBUG] Final property data:', result);
        return result;
    } catch (error) {
        console.error('Error loading property:', error);
        throw error;
    }
}

// Populate property details in the UI
function populatePropertyDetails(property) {
    // Helper to treat 'Unknown', null, or empty as missing
    function safeValue(val) {
        if (val === undefined || val === null || val === '' || val === 'Unknown') return 'N/A';
        return val;
    }

    // Setup gallery first
    const images = property.listing?.images || property.images || [];
    console.log('[DEBUG] Setting up gallery with images:', images);

    // Create thumbnails
    const thumbnailStripElem = document.getElementById('thumbnailStrip');
    const mainImageElem = document.getElementById('mainImage');

    // Handle no images case
    if (!images || images.length === 0) {
        if (thumbnailStripElem) thumbnailStripElem.style.display = 'none';
        if (mainImageElem) mainImageElem.src = 'https://via.placeholder.com/800x600?text=No+Image+Available';
        return;
    }

    // Show thumbnail strip
    if (thumbnailStripElem) {
        thumbnailStripElem.style.display = 'flex';
        thumbnailStripElem.innerHTML = images.map((img, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                <img src="${img}" alt="Property thumbnail ${index + 1}" onerror="this.src='https://via.placeholder.com/80x60?text=Error'">
            </div>
        `).join('');

        // Add click handlers to thumbnails
        thumbnailStripElem.querySelectorAll('.thumbnail').forEach((thumb, index) => {
            thumb.addEventListener('click', () => {
                if (mainImageElem) mainImageElem.src = images[index];
                thumbnailStripElem.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }

    // Set main image
    if (mainImageElem) {
        mainImageElem.src = images[0];
        mainImageElem.onerror = () => {
            mainImageElem.src = 'https://via.placeholder.com/800x600?text=Error+Loading+Image';
        };
    }

    // Setup gallery navigation
    setupGalleryNavigation(images);

    // Title
    document.getElementById('propertyTitle').textContent = safeValue(property.listing?.title || property.title);
    // Address
    document.getElementById('propertyAddress').textContent = safeValue(property.address);
    // Price and status
    const priceElem = document.getElementById('propertyPrice');
    const priceTypeElem = document.getElementById('priceType');
    if (property.status === 'active' && property.listing?.price) {
        priceElem.textContent = `$${property.listing.price}`;
        if (priceTypeElem) priceTypeElem.style.display = 'none';
    } else {
        priceElem.textContent = property.price ? `$${property.price}` : 'N/A';
        if (priceTypeElem) {
            priceTypeElem.style.display = 'inline';
            priceTypeElem.textContent = '(Estimated)';
        }
    }

    // Beds
    document.getElementById('propertyBeds').textContent = safeValue(property.listing?.bedrooms ?? property.bedrooms);
    // Baths
    document.getElementById('propertyBaths').textContent = safeValue(property.listing?.bathrooms ?? property.bathrooms);
    // Area (m²)
    let area = property.listing?.area ?? property.area;
    document.getElementById('propertyArea').textContent = area && area !== 'Unknown' ? `${area} m²` : 'N/A';
    // Type
    document.getElementById('propertyType').textContent = safeValue(property.listing?.type || property.type);
    // Year Built
    document.getElementById('propertyYear').textContent = safeValue(property.listing?.yearBuilt || property.yearBuilt);
    // Lot
    document.getElementById('propertyLot').textContent = safeValue(property.listing?.lot || property.lot);
    // MLS
    document.getElementById('propertyMLS').textContent = safeValue(property.listing?.mlsNumber || property.mlsNumber);
    // Description
    document.getElementById('propertyDescription').textContent = safeValue(property.listing?.description || property.description || 'No description available.');

    // Features
    const featuresGrid = document.getElementById('featuresGrid');
    featuresGrid.innerHTML = '';
    const features = property.listing?.features || property.features || [];
    if (features.length > 0) {
        features.forEach(feature => {
            const featureItem = document.createElement('div');
            featureItem.className = 'feature-item';
            featureItem.innerHTML = `<span>${feature}</span>`;
            featuresGrid.appendChild(featureItem);
        });
    } else {
        featuresGrid.innerHTML = '<p>No features listed</p>';
    }

    // Registry info (optional)
    const historySection = [];
    if (property.finca_regi) historySection.push(`<div><strong>Registry Number (Finca):</strong> ${property.finca_regi}</div>`);
    if (property.registry) {
        for (const [key, value] of Object.entries(property.registry)) {
            if (key === 'finca_regi') continue;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            historySection.push(`<div><strong>${label}:</strong> ${safeValue(value)}</div>`);
        }
    }
    // Only update registry sections if registry data exists
    if (historySection.length > 0 && property.registry) {
        if (document.getElementById('taxValuation')) document.getElementById('taxValuation').innerHTML = '';
        if (document.getElementById('taxHistory')) document.getElementById('taxHistory').innerHTML = '';
        if (document.getElementById('salesHistory')) document.getElementById('salesHistory').innerHTML = '';
        if (document.getElementById('clearTitle')) document.getElementById('clearTitle').innerHTML = '';
        const historyDiv = document.createElement('div');
        historyDiv.innerHTML = historySection.join('');
        const parent = document.getElementById('taxValuation')?.parentElement?.parentElement;
        if (parent) {
            parent.appendChild(historyDiv);
        }
    }

    // Update page title
    document.title = `${safeValue(property.listing?.title || property.title)} | DOMUS Real Estate`;

    // Set status badge and contact card
    const listingStatus = document.getElementById('listingStatus');
    const offMarketNotice = document.getElementById('offMarketNotice');
    const contactTitle = document.querySelector('.contact-title');
    const agentName = document.getElementById('agentName');
    const agentCompany = document.getElementById('agentCompany');
    const agentPhone = document.getElementById('agentPhone');
    const agentPhoto = document.getElementById('agentPhoto');

    if (property.status === 'active' && property.listing) {
        // Update status badge
        if (listingStatus) {
            listingStatus.textContent = 'Active';
            listingStatus.className = 'listing-status on-market';
        }

        // Update contact card for active listing
        if (offMarketNotice) offMarketNotice.style.display = 'none';
        if (contactTitle) contactTitle.textContent = 'Contact Listing Agent';
        
        // Update agent info
        if (property.listing.agent) {
            if (agentName) agentName.textContent = property.listing.agent.name || 'Agent Name';
            if (agentCompany) agentCompany.textContent = property.listing.agent.company || 'Sito Real Estate';
            if (agentPhone) agentPhone.textContent = property.listing.agent.phone || '+506 1234-5678';
            if (agentPhoto) agentPhoto.src = property.listing.agent.photo || 'images/default-agent.jpg';
        }
    } else {
        // Update status badge
        if (listingStatus) {
            listingStatus.textContent = 'Off Market';
            listingStatus.className = 'listing-status off-market';
        }

        // Update contact card for off-market property
        if (offMarketNotice) offMarketNotice.style.display = 'block';
        if (contactTitle) contactTitle.textContent = 'Contact Agent for Similar Properties';
        
        // Reset agent info to defaults
        if (agentName) agentName.textContent = 'Agent Name';
        if (agentCompany) agentCompany.textContent = 'Sito Real Estate';
        if (agentPhone) agentPhone.textContent = '+506 1234-5678';
        if (agentPhoto) agentPhoto.src = 'images/default-agent.jpg';
    }

    // Hide gallery for off-market or no images
    if (
        property.status === 'off-market' ||
        property.status === 'Off Market' ||
        (!property.images && !property.image_urls)
    ) {
        const gallerySection = document.querySelector('.photo-gallery');
        if (gallerySection) gallerySection.style.display = 'none';
        return;
    }
    
    // Get gallery elements
    const mainImage = document.getElementById('mainImage');
    const thumbnailStrip = document.getElementById('thumbnailStrip');
    
    if (!mainImage || !thumbnailStrip) {
        console.error('Gallery elements not found');
        return;
    }
    
    // Get image URLs array from listing
    const imageUrls = property.listing?.images || [];
    console.log('[DEBUG] Image URLs:', imageUrls);
    
    // Set main image
    if (imageUrls.length > 0) {
        const primaryImageUrl = imageUrls[0];
        console.log('[DEBUG] Setting primary image:', primaryImageUrl);
        
        mainImage.onerror = function() {
            console.error('Failed to load image:', this.src);
            this.src = 'https://via.placeholder.com/800x600?text=No+Image+Available';
        };
        mainImage.src = primaryImageUrl;
        mainImage.alt = property.title || 'Property image';
        
        // Clear existing thumbnails
        thumbnailStrip.innerHTML = '';
        
        // Add thumbnails
        imageUrls.forEach((imgUrl, index) => {
            console.log('[DEBUG] Creating thumbnail for image:', imgUrl);
            
            const thumbnail = document.createElement('div');
            thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            
            const thumbImg = document.createElement('img');
            thumbImg.alt = `Property image ${index + 1}`;
            thumbImg.onerror = function() {
                console.error('Failed to load thumbnail:', imgUrl);
                this.src = 'https://via.placeholder.com/150x150?text=No+Image';
            };
            thumbImg.src = imgUrl;
            
            thumbnail.appendChild(thumbImg);
            
            thumbnail.addEventListener('click', () => {
                console.log('[DEBUG] Thumbnail clicked, setting main image to:', imgUrl);
                mainImage.src = imgUrl;
                document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
                thumbnail.classList.add('active');
            });
            
            thumbnailStrip.appendChild(thumbnail);
        });
        
        // Setup gallery navigation
        setupGalleryNavigation(imageUrls);
        
        // Setup lightbox for full screen viewing
        if (typeof lightGallery === 'function') {
            setupLightbox(imageUrls);
        } else {
            console.warn('LightGallery not available');
        }
    } else {
        console.error('No property images available');
        mainImage.src = 'https://via.placeholder.com/800x600?text=No+Image+Available';
        mainImage.alt = 'No image available';
        
        const prevBtn = document.querySelector('.gallery-nav.prev');
        const nextBtn = document.querySelector('.gallery-nav.next');
        const viewAllBtn = document.querySelector('.btn-view-all-photos');
        
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (viewAllBtn) viewAllBtn.style.display = 'none';
    }
    
    // Make sure gallery container is visible
    const galleryContainer = document.querySelector('.property-gallery-container');
    if (galleryContainer) {
        galleryContainer.style.display = 'block';
    }
}

// Initialize the property map
function initializePropertyMap(property) {
    let plot = null;
    let mapCenter = null;

    // Use geometry_geojson for the plot
    if (property.geometry_geojson) {
        try {
            plot = typeof property.geometry_geojson === 'string'
                ? JSON.parse(property.geometry_geojson)
                : property.geometry_geojson;

            // Calculate centroid from GeoJSON coordinates
            if (plot && plot.type === 'Polygon' && plot.coordinates) {
                const coords = plot.coordinates[0];
                let sumX = 0, sumY = 0;
                coords.forEach(coord => {
                    sumX += coord[0];
                    sumY += coord[1];
                });
                mapCenter = [sumX / coords.length, sumY / coords.length];
            } else if (plot && plot.type === 'Feature' && plot.geometry && plot.geometry.type === 'Polygon') {
                const coords = plot.geometry.coordinates[0];
                let sumX = 0, sumY = 0;
                coords.forEach(coord => {
                    sumX += coord[0];
                    sumY += coord[1];
                });
                mapCenter = [sumX / coords.length, sumY / coords.length];
            }
        } catch (e) {
            console.warn('Failed to parse geometry_geojson:', e);
        }
    }

    // Fallback: show message if no map data
    const mapContainer = document.getElementById('propertyMap');
    if (!mapCenter || !mapContainer) {
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="color:#888; text-align:center; padding:40px 0;">No map data available for this property.</div>';
        }
        return;
    }

    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXNsdHEiLCJhIjoiY204amdtYWhhMG1wODJrc2U5ajl6bG51NSJ9.N2HukvJN48oRAiNw488B5g';

    const map = new mapboxgl.Map({
        container: 'propertyMap',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mapCenter,
        zoom: 17
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add plot as a GeoJSON layer if available
    if (plot) {
        map.on('load', function() {
            map.addSource('property-plot', {
                type: 'geojson',
                data: plot.type === 'Feature' ? plot : { type: 'Feature', geometry: plot, properties: {} }
            });
            map.addLayer({
                id: 'property-plot-fill',
                type: 'fill',
                source: 'property-plot',
                paint: {
                    'fill-color': '#FFD700',
                    'fill-opacity': 0.3
                }
            });
            map.addLayer({
                id: 'property-plot-outline',
                type: 'line',
                source: 'property-plot',
                paint: {
                    'line-color': '#FFD700',
                    'line-width': 2
                }
            });
            map.resize();
        });
    } else {
        map.on('load', function() {
            map.resize();
        });
    }
}

// Setup gallery navigation with arrow buttons
function setupGalleryNavigation(images) {
    const mainImageElem = document.getElementById('mainImage');
    const prevBtn = document.querySelector('.gallery-nav.prev');
    const nextBtn = document.querySelector('.gallery-nav.next');
    const thumbnailElems = document.querySelectorAll('.thumbnail');
    const viewAllBtn = document.querySelector('.btn-view-all-photos');
    
    // Hide navigation if no images or only one image
    if (!images || images.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (viewAllBtn) viewAllBtn.style.display = 'none';
        return;
    }
    
    // Show navigation
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
    if (viewAllBtn) viewAllBtn.style.display = 'flex';
    
    if (!mainImageElem || !prevBtn || !nextBtn) {
        console.log('Gallery navigation elements not found');
        return;
    }
    
    // Track current image index
    let currentIndex = 0;
    
    // Function to update the active thumbnail
    const updateActiveThumbnail = (index) => {
        thumbnailElems.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    };
    
    // Function to update main image
    const updateMainImage = (index) => {
        if (index >= 0 && index < images.length) {
            mainImageElem.src = images[index];
            mainImageElem.onerror = () => {
                mainImageElem.src = 'https://via.placeholder.com/800x600?text=Error+Loading+Image';
            };
            currentIndex = index;
            updateActiveThumbnail(index);
        }
    };
    
    // Set up click handlers for navigation
    prevBtn.addEventListener('click', () => {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = images.length - 1;
        updateMainImage(prevIndex);
    });
    
    nextBtn.addEventListener('click', () => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= images.length) nextIndex = 0;
        updateMainImage(nextIndex);
    });
    
    // Make the first thumbnail active
    updateActiveThumbnail(0);
    
    // Set up "See all photos" button
    if (viewAllBtn) {
        viewAllBtn.textContent = `See all ${images.length} photos`;
        viewAllBtn.addEventListener('click', function() {
            // If lightGallery is available, open in lightbox mode
            if (typeof lightGallery === 'function') {
                // Trigger lightbox from the current index
                const galleryElem = document.getElementById('property-gallery');
                if (galleryElem && galleryElem.lgInstance) {
                    galleryElem.lgInstance.openGallery(currentIndex);
                } else {
                    // Open new lightbox
                    setupLightbox(images, currentIndex);
                }
            } else {
                console.warn('LightGallery not available');
            }
        });
    }
}

// Setup lightbox for full screen image viewing
function setupLightbox(images, startIndex = 0) {
    const galleryElem = document.getElementById('property-gallery');
    if (!galleryElem || !images || images.length === 0) {
        console.log('No gallery element or images found');
        return;
    }
    
    // Create array of items for lightGallery
    const items = images.map(img => ({
        src: img,
        thumb: img,
        subHtml: `<div class="lightGallery-captions"></div>`
    }));
    
    try {
        // Destroy existing instance if it exists
        if (galleryElem.lgInstance) {
            galleryElem.lgInstance.destroy();
            delete galleryElem.lgInstance;
        }
        
        // Initialize lightGallery
        const lgInstance = lightGallery(galleryElem, {
            dynamic: true,
            dynamicEl: items,
            index: startIndex,
            download: false,
            closable: true,
            controls: true,
            counter: true,
            enableDrag: true,
            enableSwipe: true,
            modules: [lgZoom, lgThumbnail],
            mobileSettings: {
                controls: true,
                showCloseIcon: true
            },
            thumbnail: true,
            animateThumb: true,
            showThumbByDefault: true
        });
        
        // Store lightGallery instance for later use
        galleryElem.lgInstance = lgInstance;
        
        // Don't open the gallery immediately - wait for user to click "See all photos"
        return lgInstance;
    } catch (error) {
        console.error('Error initializing lightGallery:', error);
    }
}

// Setup Save Property button
function setupSaveButton(propertyId) {
    const saveBtn = document.getElementById('btnSaveProperty');
    
    if (!saveBtn) return;
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('domus_user');
    
    if (isLoggedIn) {
        const user = JSON.parse(localStorage.getItem('domus_user'));
        
        // Check if property is already saved
        const isSaved = user.savedProperties && user.savedProperties.includes(propertyId);
        
        // Update button appearance
        if (isSaved) {
            saveBtn.innerHTML = '<i class="fas fa-heart"></i> Saved';
            saveBtn.classList.add('saved');
        }
        
        // Add click handler
        saveBtn.addEventListener('click', () => {
            if (user.accountType === 'individual') {
                toggleSaveProperty(propertyId, saveBtn);
            } else {
                alert('Only individual users can save properties');
            }
        });
    } else {
        // Add click handler for non-logged in users
        saveBtn.addEventListener('click', () => {
            if (typeof showAuthModal === 'function') {
                showAuthModal();
            } else {
                alert('Please sign in to save properties');
            }
        });
    }
}

// Toggle saved property
function toggleSaveProperty(propertyId, button) {
    const user = JSON.parse(localStorage.getItem('domus_user'));
    
    if (!user.savedProperties) {
        user.savedProperties = [];
    }
    
    const isSaved = user.savedProperties.includes(propertyId);
    
    if (isSaved) {
        // Remove from saved properties
        user.savedProperties = user.savedProperties.filter(id => id !== propertyId);
        button.innerHTML = '<i class="far fa-heart"></i> Save';
        button.classList.remove('saved');
    } else {
        // Add to saved properties
        user.savedProperties.push(propertyId);
        button.innerHTML = '<i class="fas fa-heart"></i> Saved';
        button.classList.add('saved');
    }
    
    // Update localStorage
    localStorage.setItem('domus_user', JSON.stringify(user));
    
    // Update users array
    const users = JSON.parse(localStorage.getItem('domus_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    
    if (userIndex !== -1) {
        users[userIndex].savedProperties = user.savedProperties;
        localStorage.setItem('domus_users', JSON.stringify(users));
    }
}

// Load similar properties
async function loadSimilarProperties(currentProperty) {
    const similarPropertiesContainer = document.getElementById('similarProperties');
    if (!similarPropertiesContainer) return;

    // Get the current property's location
    const currentLat = currentProperty.location?.lat || currentProperty.geometry?.coordinates[1];
    const currentLng = currentProperty.location?.lng || currentProperty.geometry?.coordinates[0];

    if (!currentLat || !currentLng) {
        console.log('No location data for current property');
        return;
    }

    // Function to calculate distance between two points in km
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2-lat1);
        const dLon = deg2rad(lon2-lon1); 
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    try {
        // Query properties from Supabase
        const { data: properties, error } = await supabase
            .from('properties')
            .select('*');

        if (error) throw error;

        // Filter and sort properties by distance
        const nearbyProperties = properties
            .filter(p => {
                // Filter out the current property
                if (p.finca_regi === currentProperty.finca_regi) return false;

                // Get property location
                const propLat = p.location?.lat || p.geometry?.coordinates[1];
                const propLng = p.location?.lng || p.geometry?.coordinates[0];
                
                if (!propLat || !propLng) return false;

                // Calculate distance
                const distance = getDistanceFromLatLonInKm(
                    currentLat, currentLng,
                    propLat, propLng
                );

                // Keep properties within 5km
                return distance <= 5;
            })
            .sort((a, b) => {
                // Sort by distance
                const distA = getDistanceFromLatLonInKm(
                    currentLat, currentLng,
                    a.location?.lat || a.geometry?.coordinates[1],
                    a.location?.lng || a.geometry?.coordinates[0]
                );
                const distB = getDistanceFromLatLonInKm(
                    currentLat, currentLng,
                    b.location?.lat || b.geometry?.coordinates[1],
                    b.location?.lng || b.geometry?.coordinates[0]
                );
                return distA - distB;
            })
            .slice(0, 3); // Limit to 3 properties

        // Render properties
        similarPropertiesContainer.innerHTML = '';
        nearbyProperties.forEach(prop => {
            const distance = getDistanceFromLatLonInKm(
                currentLat, currentLng,
                prop.location?.lat || prop.geometry?.coordinates[1],
                prop.location?.lng || prop.geometry?.coordinates[0]
            ).toFixed(1);

            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = `
                <div class="property-card-image" style="background-image: url('${prop.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image'}')">
                    <div class="property-card-status off-market">Off Market</div>
                </div>
                <div class="property-card-info">
                    <div class="property-card-price">$${prop.price?.toLocaleString() || 'N/A'}</div>
                    <div class="property-card-specs">
                        ${prop.bedrooms || 0} beds • ${prop.bathrooms || 0} baths • ${prop.area || 0} m² • ${distance}km away
                    </div>
                    <div class="property-card-address">${prop.address || 'Address not available'}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                window.location.href = `property.html?id=${prop.finca_regi}`;
            });
            similarPropertiesContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading similar properties:', error);
        similarPropertiesContainer.innerHTML = '<p>Error loading similar properties</p>';
    }
}

async function takeOffMarket(propertyId, saleData = {}) {
    if (!propertyId) {
        throw new Error('No property ID specified');
    }
    
    try {
        // Get current property data
        const property = await loadPropertyData(propertyId);
        
        const saleDate = saleData.date || new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const salePrice = saleData.price || property.price;
        
        // Update the property to off-market status
        const updatedProperty = {
            ...property,
            status: 'off-market',
            lastSoldDate: saleDate,
            lastSoldPrice: salePrice
        };
        
        // Update in backend
        const response = await fetch(`http://localhost:4000/api/properties/${propertyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProperty)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update property status');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error taking property off market:', error);
        throw error;
    }
}

async function activateListing(propertyId, listingData) {
    if (!propertyId) {
        throw new Error('No property ID specified');
    }
    
    try {
        // Get current property data
        const property = await loadPropertyData(propertyId);
        
        // Update the property with new listing info
        const updatedProperty = {
            ...property,
            price: listingData.price,
            priceNumber: listingData.price,
            description: listingData.description,
            features: listingData.features || property.features,
            status: 'active',
            lastSoldDate: null,
            lastSoldPrice: null,
            images: listingData.images || []
        };
        
        // Update in backend
        const response = await fetch(`http://localhost:4000/api/properties/${propertyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProperty)
        });
        
        if (!response.ok) {
            throw new Error('Failed to activate listing');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Error activating listing:', error);
        throw error;
    }
}

// On page load, get propertyId from URL or context and load property with registry data
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const finca_regi = urlParams.get('id');
    if (finca_regi) {
        if (typeof loadFullProperty === 'function') {
            try {
                const fullProperty = await loadFullProperty(finca_regi);
                populatePropertyDetails(fullProperty);
                setupImageGallery(fullProperty);
            } catch (err) {
                const titleEl = document.getElementById('propertyTitle');
                if (titleEl) {
                    titleEl.textContent = 'Property not found';
                }
            }
        } else {
            const titleEl = document.getElementById('propertyTitle');
            if (titleEl) {
                titleEl.textContent = 'Property data loader not available';
            }
        }
    }
});

// Make functions available globally for inline script usage
window.loadPropertyWithRegistry = loadPropertyWithRegistry;
window.populatePropertyDetails = populatePropertyDetails;