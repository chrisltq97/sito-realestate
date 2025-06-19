const axios = require('axios');

class GISService {
    constructor() {
        // Official Escazu GIS endpoints
        this.escazuGisBaseUrl = 'https://gis.escazu.go.cr/server/rest/services';
        this.predialMapUrl = 'https://gis.escazu.go.cr/server/rest/services/Mapa_Predial_2024/MapServer';
        this.webAppViewerUrl = 'https://gis.escazu.go.cr/portal/apps/webappviewer/index.html?id=34b8dd92877b4d969223c7c914ed44dd';
    }

    async getPropertyBoundaries(coordinates) {
        try {
            // Get property boundaries from Escazu GIS
            const response = await axios.get(
                `${this.predialMapUrl}/identify?` +
                `geometry=${coordinates.lng},${coordinates.lat}&` +
                'geometryType=esriGeometryPoint&' +
                'sr=4326&' +
                'layers=all&' +
                'tolerance=3&' +
                'mapExtent=-84.2,9.8,-84.0,10.0&' +
                'imageDisplay=800,600,96&' +
                'returnGeometry=true&' +
                'f=json'
            );
            
            return response.data;
        } catch (error) {
            console.error('Error fetching property boundaries:', error);
            throw error;
        }
    }

    async getPropertyDetails(propertyId) {
        try {
            // Query property details by ID from Escazu GIS
            const response = await axios.get(
                `${this.predialMapUrl}/query?` +
                'where=GIS=' + propertyId + '&' +
                'outFields=*&' +
                'returnGeometry=true&' +
                'f=json'
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching property details:', error);
            throw error;
        }
    }

    async searchPropertiesByArea(bounds) {
        try {
            // Search properties within specified bounds
            const response = await axios.get(
                `${this.predialMapUrl}/query?` +
                'where=1=1&' +
                'geometry=' + 
                bounds.west + ',' + bounds.south + ',' + 
                bounds.east + ',' + bounds.north + '&' +
                'geometryType=esriGeometryEnvelope&' +
                'inSR=4326&' +
                'spatialRel=esriSpatialRelIntersects&' +
                'outFields=*&' +
                'returnGeometry=true&' +
                'f=json'
            );
            return response.data;
        } catch (error) {
            console.error('Error searching properties:', error);
            throw error;
        }
    }

    async getEscazuPlots() {
        try {
            // Get all Escazu cadastral plots
            const response = await axios.get(
                `${this.predialMapUrl}/query?` +
                'where=1=1&' +
                'outFields=*&' +
                'returnGeometry=true&' +
                'f=geojson'
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching Escazu plots:', error);
            // Return empty GeoJSON if there's an error
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
    }
}

module.exports = new GISService(); 