// Initialize Supabase client
let supabase = null;
let map;
let selectedProperty = null;
let propertiesData = [];
let uploadedImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    supabase = window.initSupabase();
    if (!supabase) {
        document.getElementById('auth-error').style.display = 'block';
        document.getElementById('listing-form').style.display = 'none';
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        document.getElementById('auth-error').style.display = 'block';
        document.getElementById('listing-form').style.display = 'none';
        return;
    }

    document.getElementById('listing-form').style.display = 'grid';
    initializeMap();
    setupEventListeners();
    
    // Show initial message
    const resultsContainer = document.getElementById('property-results');
    resultsContainer.innerHTML = `
        <div class="no-results">
            <p>Enter a registry ID (finca_regi) or address to search properties</p>
        </div>
    `;
});

async function searchProperties(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        const resultsContainer = document.getElementById('property-results');
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>Enter at least 2 characters to search</p>
            </div>
        `;
        return;
    }

    const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .or(`finca_regi.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,oid.ilike.%${searchTerm}%`)
        .limit(20);

    if (error) {
        console.error('Error searching properties:', error);
        document.getElementById('property-results').innerHTML = `
            <div class="error-message">
                Failed to search properties. Please try again later.
            </div>
        `;
        return;
    }

    propertiesData = properties;
    displayProperties(properties);
}

function displayProperties(properties) {
    const resultsContainer = document.getElementById('property-results');
    
    if (!properties || properties.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No properties found matching your search</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = properties.map(property => `
        <div class="property-item" data-property-id="${property.id}">
            <h4>Registry ID: ${property.finca_regi || 'N/A'}</h4>
            <p>Address: ${property.address || 'Unknown'}</p>
            <p>OID: ${property.oid || 'N/A'}</p>
        </div>
    `).join('');
}

function initializeMap() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXNsdHEiLCJhIjoiY21icndyYjJsMGZueTJqc2ZzZ3I4Zmp5MiJ9.P7jm8nv69d8qb_PTL4G-Tg';
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-84.0907246, 9.9280694],
        zoom: 13
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());
}

function updateMap(property) {
    if (!property) return;

    try {
        // If we have GeoJSON data, display the property boundaries
        if (property.geometry_geojson) {
            // Remove existing source and layer if they exist
            if (map.getSource('property-source')) {
                map.removeLayer('property-fill');
                map.removeLayer('property-line');
                map.removeSource('property-source');
            }

            const geojson = property.geometry_geojson;
            
            // Add the GeoJSON source
            map.addSource('property-source', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: geojson
                }
            });

            // Add fill layer
            map.addLayer({
                id: 'property-fill',
                type: 'fill',
                source: 'property-source',
                paint: {
                    'fill-color': '#0080ff',
                    'fill-opacity': 0.3
                }
            });

            // Add line layer
            map.addLayer({
                id: 'property-line',
                type: 'line',
                source: 'property-source',
                paint: {
                    'line-color': '#0080ff',
                    'line-width': 2
                }
            });

            // Calculate center from GeoJSON coordinates
            const coords = geojson.coordinates[0];
            let sumLng = 0;
            let sumLat = 0;
            coords.forEach(coord => {
                sumLng += coord[0];
                sumLat += coord[1];
            });
            const center = [sumLng / coords.length, sumLat / coords.length];

            // Fly to the center
            map.flyTo({
                center: center,
                zoom: 18
            });

            // Clear existing markers
            const existingMarker = document.querySelector('.mapboxgl-marker');
            if (existingMarker) {
                existingMarker.remove();
            }

            // Add new marker at the center
            new mapboxgl.Marker()
                .setLngLat(center)
                .addTo(map);
        }
    } catch (e) {
        console.error('Error updating map:', e);
    }
}

function updatePropertyPreview(property) {
    const previewContainer = document.getElementById('selected-property-preview');
    
    if (!property) {
        previewContainer.innerHTML = `
            <p class="no-results">Select a property to create a listing</p>
        `;
        return;
    }

    previewContainer.innerHTML = `
        <h2 class="section-title">Property Details</h2>
        <div class="property-details">
            <p><strong>Registry ID:</strong> ${property.finca_regi || 'N/A'}</p>
            <p><strong>Address:</strong> ${property.address || 'Unknown'}</p>
            <p><strong>OID:</strong> ${property.oid || 'N/A'}</p>
        </div>
    `;
}

function setupEventListeners() {
    // Property search with debounce
    const searchInput = document.getElementById('property-search');
    let debounceTimeout;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // Clear the previous timeout
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        
        // Show loading state
        if (searchTerm.length >= 2) {
            document.getElementById('property-results').innerHTML = `
                <div class="no-results">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Searching properties...</p>
                </div>
            `;
        }
        
        // Set a new timeout
        debounceTimeout = setTimeout(() => {
            searchProperties(searchTerm);
        }, 300); // Wait 300ms after user stops typing
    });

    // Property selection
    document.getElementById('property-results').addEventListener('click', (e) => {
        const propertyItem = e.target.closest('.property-item');
        if (!propertyItem) return;

        // Remove selection from other items
        document.querySelectorAll('.property-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked item
        propertyItem.classList.add('selected');

        // Update selected property
        const propertyId = propertyItem.dataset.propertyId;
        selectedProperty = propertiesData.find(p => p.id === propertyId);
        
        updatePropertyPreview(selectedProperty);
        updateMap(selectedProperty);
    });

    // Image upload handling
    const imageInput = document.getElementById('listing-images');
    const imagePreview = document.getElementById('image-preview');
    
    imageInput.addEventListener('change', handleImageUpload);

    // Form submission
    document.getElementById('listing-details-form').addEventListener('submit', handleFormSubmit);
}

function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const imagePreview = document.getElementById('image-preview');
    
    // Clear previous previews
    imagePreview.innerHTML = '';
    uploadedImages = [];
    
    files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview-item';
                previewDiv.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}">
                    <button type="button" class="remove-image" onclick="removeImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                imagePreview.appendChild(previewDiv);
                uploadedImages.push(file);
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
}

function updateImagePreview() {
    const imagePreview = document.getElementById('image-preview');
    imagePreview.innerHTML = '';
    
    uploadedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="remove-image" onclick="removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            imagePreview.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

async function uploadImages() {
    if (uploadedImages.length === 0) return [];
    
    const imageUrls = [];
    
    try {
        for (const image of uploadedImages) {
            // Generate a clean filename - remove spaces and special characters
            const cleanFileName = image.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `property-additional-${Date.now()}_${Math.random().toString(36).substring(7)}_${cleanFileName}`;
            
            // Upload the file
            const { data, error: uploadError } = await supabase.storage
                .from('property-images')  // Use the correct bucket name
                .upload(fileName, image, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: image.type
                });
                
            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                continue; // Skip this image but continue with others
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('property-images')  // Use the correct bucket name
                .getPublicUrl(fileName);
                
            imageUrls.push(publicUrl);
        }
        
        return imageUrls;
    } catch (error) {
        console.error('Error in uploadImages:', error);
        return []; // Return empty array if upload fails
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!selectedProperty) {
        showError('Please select a property from the search results');
        return;
    }

    try {
        // Try to upload images, but continue even if it fails
        let imageUrls = [];
        try {
            if (uploadedImages.length > 0) {
                imageUrls = await uploadImages();
                if (imageUrls.length === 0) {
                    showWarning('Unable to upload images. The listing will be created without images.');
                } else if (imageUrls.length < uploadedImages.length) {
                    showWarning('Some images failed to upload. The listing will be created with the successfully uploaded images.');
                }
            }
        } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            showWarning('Failed to upload images. The listing will be created without images.');
            imageUrls = [];
        }
        
        const formData = {
            title: document.querySelector('#listing-title').value,
            description: document.querySelector('#listing-description').value,
            price: parseFloat(document.querySelector('#listing-price').value),
            finca_regi: selectedProperty.finca_regi,
            // Property features
            bedrooms: parseInt(document.querySelector('#bedrooms').value),
            bathrooms: parseFloat(document.querySelector('#bathrooms').value),
            parking_spaces: parseInt(document.querySelector('#parking').value) || 0,
            square_feet: parseInt(document.querySelector('#square-feet').value),
            // Amenities
            amenities: Array.from(document.querySelectorAll('input[name="amenities"]:checked'))
                .map(checkbox => checkbox.value),
            // Contact information
            contact_name: document.querySelector('#contact-name').value,
            contact_phone: document.querySelector('#contact-phone').value,
            contact_email: document.querySelector('#contact-email').value,
            contact_whatsapp: document.querySelector('#contact-whatsapp').value || null,
            // Images
            images: imageUrls,
            // Add user_id and status
            user_id: (await supabase.auth.getUser()).data.user.id,
            status: 'active',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('listings')
            .insert([formData])
            .select();

        if (error) {
            console.error('Error creating listing:', error);
            throw error;
        }

        // Show success message and redirect
        showSuccess('Listing created successfully!' + (imageUrls.length === 0 ? ' (No images were uploaded)' : ''));
        setTimeout(() => {
            window.location.href = '/my-listings.html';
        }, 2000);

    } catch (error) {
        console.error('Error creating listing:', error);
        if (error.message?.includes('foreign key constraint')) {
            showError('Failed to create listing: Invalid property selected. Please try selecting the property again.');
        } else {
            showError('Failed to create listing. Please try again. Error: ' + error.message);
        }
    }
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.textContent = message;
    document.querySelector('#listing-details-form').prepend(alertDiv);
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-error';
    alertDiv.textContent = message;
    document.querySelector('#listing-details-form').prepend(alertDiv);
}

function showWarning(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning';
    alertDiv.textContent = message;
    document.querySelector('#listing-details-form').prepend(alertDiv);
}