const fs = require('fs');
const path = require('path');

class SantaAnaDownloader {
    constructor() {
        this.baseUrl = 'https://gis.santa-ana.org/server/rest/services';
        this.outputPath = path.join(__dirname, '../../data/santaana_plots.geojson');
    }

    async discoverServices() {
        console.log('🔍 Discovering Santa Ana GIS services...');
        
        try {
            // First, get the main services directory
            const response = await fetch(`${this.baseUrl}?f=json`);
            const data = await response.json();
            
            console.log('Available folders:', data.folders);
            console.log('Available services:', data.services);
            
            // Check Public folder for cadastral services
            if (data.folders && data.folders.includes('Public')) {
                const publicResponse = await fetch(`${this.baseUrl}/Public?f=json`);
                const publicData = await publicResponse.json();
                
                console.log('Public services:', publicData.services);
                
                // Look for services that might contain parcels/properties
                const potentialServices = publicData.services.filter(service => 
                    service.name.toLowerCase().includes('parcel') ||
                    service.name.toLowerCase().includes('property') ||
                    service.name.toLowerCase().includes('cadastr') ||
                    service.name.toLowerCase().includes('land') ||
                    service.name.toLowerCase().includes('tax') ||
                    service.name.toLowerCase().includes('assessor')
                );
                
                console.log('Potential cadastral services:', potentialServices);
                
                return potentialServices;
            }
            
            return [];
        } catch (error) {
            console.error('Error discovering services:', error);
            return [];
        }
    }

    async exploreService(serviceName, serviceType) {
        console.log(`🔍 Exploring service: ${serviceName} (${serviceType})`);
        
        try {
            const serviceUrl = `${this.baseUrl}/Public/${serviceName}/${serviceType}`;
            const response = await fetch(`${serviceUrl}?f=json`);
            const data = await response.json();
            
            console.log(`Service: ${serviceName}`);
            console.log('Layers:', data.layers?.map(l => `${l.id}: ${l.name}`) || 'No layers');
            
            return data.layers || [];
        } catch (error) {
            console.error(`Error exploring service ${serviceName}:`, error);
            return [];
        }
    }

    async downloadFromLayer(serviceName, serviceType, layerId, layerName) {
        console.log(`📥 Attempting to download from layer: ${layerName} (ID: ${layerId})`);
        
        try {
            const layerUrl = `${this.baseUrl}/Public/${serviceName}/${serviceType}/${layerId}`;
            
            // First, get layer info
            const infoResponse = await fetch(`${layerUrl}?f=json`);
            const layerInfo = await infoResponse.json();
            
            console.log(`Layer info for ${layerName}:`, {
                geometryType: layerInfo.geometryType,
                fields: layerInfo.fields?.map(f => f.name) || 'No fields'
            });
            
            // Try to query all features
            const queryUrl = `${layerUrl}/query`;
            const queryParams = new URLSearchParams({
                where: '1=1',
                outFields: '*',
                f: 'geojson',
                returnGeometry: 'true'
            });
            
            console.log(`Querying: ${queryUrl}?${queryParams}`);
            
            const queryResponse = await fetch(`${queryUrl}?${queryParams}`);
            
            if (!queryResponse.ok) {
                throw new Error(`HTTP ${queryResponse.status}: ${queryResponse.statusText}`);
            }
            
            const geojsonData = await queryResponse.json();
            
            if (geojsonData.features && geojsonData.features.length > 0) {
                console.log(`✅ Successfully downloaded ${geojsonData.features.length} features from ${layerName}`);
                
                // Save to file
                fs.writeFileSync(this.outputPath, JSON.stringify(geojsonData, null, 2));
                console.log(`💾 Saved to: ${this.outputPath}`);
                
                return geojsonData;
            } else {
                console.log(`⚠️ No features found in layer ${layerName}`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Error downloading from layer ${layerName}:`, error);
            return null;
        }
    }

    async run() {
        console.log('🚀 Starting Santa Ana plot data download...');
        
        // First discover available services
        const services = await this.discoverServices();
        
        if (services.length === 0) {
            console.log('❌ No potential cadastral services found. Let me try some common service names...');
            
            // Try some common service names
            const commonNames = [
                'Parcels',
                'Properties', 
                'Cadastral',
                'LandRecords',
                'TaxParcels',
                'AssessorParcels',
                'PlanningParcels'
            ];
            
            for (const serviceName of commonNames) {
                console.log(`🔍 Trying service: ${serviceName}`);
                const layers = await this.exploreService(serviceName, 'MapServer');
                
                if (layers.length > 0) {
                    // Try to download from the first layer that looks like parcels
                    for (const layer of layers) {
                        const result = await this.downloadFromLayer(serviceName, 'MapServer', layer.id, layer.name);
                        if (result) {
                            return result;
                        }
                    }
                }
            }
        } else {
            // Explore discovered services
            for (const service of services) {
                const layers = await this.exploreService(service.name, service.type);
                
                if (layers.length > 0) {
                    // Try to download from each layer
                    for (const layer of layers) {
                        const result = await this.downloadFromLayer(service.name, service.type, layer.id, layer.name);
                        if (result) {
                            return result;
                        }
                    }
                }
            }
        }
        
        console.log('❌ Could not find or download Santa Ana plot data');
        return null;
    }
}

// Run the downloader
async function main() {
    const downloader = new SantaAnaDownloader();
    await downloader.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SantaAnaDownloader;