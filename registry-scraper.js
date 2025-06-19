const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Registry URL
const REGISTRY_URL = 'https://www.registronacional.go.cr/';

class RegistryScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.outputDir = path.join(__dirname, 'scraped_data');
        this.processedCount = 0;
        this.totalCount = 0;
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }

    async initialize() {
        this.log('Initializing browser...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ]
        });
        this.page = await this.browser.newPage();
        this.log('Browser initialized successfully');
    }

    async scrapeProperty(finca_regi) {
        try {
            this.log(`Starting scrape for finca registral: ${finca_regi}`);
            
            // Navigate to registry website
            this.log(`Navigating to ${REGISTRY_URL}`);
            await this.page.goto(REGISTRY_URL);
            
            // Input finca registral number
            this.log(`Entering finca number: ${finca_regi}`);
            await this.page.type('#finca-input', finca_regi);
            await this.page.click('#search-button');
            
            // Wait for results
            this.log('Waiting for results to load...');
            await this.page.waitForSelector('.property-details', { timeout: 5000 });
            
            // Extract data
            this.log('Extracting property data...');
            const data = await this.page.evaluate(() => {
                const details = document.querySelector('.property-details');
                return {
                    saleDate: details.querySelector('.sale-date')?.textContent || null,
                    fiscalValue: details.querySelector('.fiscal-value')?.textContent || null,
                    size: details.querySelector('.size')?.textContent || null,
                    gravamenes: details.querySelector('.gravamenes')?.textContent || null,
                    isForeclosure: details.querySelector('.foreclosure-flag')?.textContent.includes('Yes') || false
                };
            });
            
            // Add finca_regi to data
            data.finca_regi = finca_regi;
            
            // Save to local file
            const filePath = path.join(this.outputDir, `${finca_regi}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            
            this.processedCount++;
            this.log(`Successfully scraped and saved data for finca registral: ${finca_regi}`);
            this.log(`Progress: ${this.processedCount}/${this.totalCount} properties processed (${Math.round((this.processedCount/this.totalCount)*100)}%)`);
            
            return data;
            
        } catch (error) {
            this.log(`ERROR scraping finca registral ${finca_regi}: ${error.message}`);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            this.log('Closing browser...');
            await this.browser.close();
            this.log('Browser closed');
        }
    }
}

// Main function to process all properties
async function processProperties() {
    const scraper = new RegistryScraper();

    try {
        // Read finca numbers from minimal_properties.json
        scraper.log('Reading properties from minimal_properties.json...');
        const minimalPath = path.join(__dirname, 'backend/public/data/minimal_properties.json');
        if (!fs.existsSync(minimalPath)) throw new Error(`File not found: ${minimalPath}`);
        const minimalData = JSON.parse(fs.readFileSync(minimalPath, 'utf8'));
        scraper.log('Loaded minimalData keys: ' + Object.keys(minimalData));
        scraper.log('minimalData.features type: ' + typeof minimalData.features + ', length: ' + (minimalData.features ? minimalData.features.length : 'undefined'));

        // Read or initialize enriched_properties.json
        const enrichedPath = path.join(__dirname, 'backend/public/data/enriched_properties.json');
        let enrichedData = { features: [] };
        if (fs.existsSync(enrichedPath)) {
            enrichedData = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
            if (!Array.isArray(enrichedData.features)) {
                enrichedData.features = [];
            }
        }

        // Create a map for quick lookup/update
        const enrichedMap = new Map(
            enrichedData.features.map(f => [f.properties.finca_regi, f])
        );

        // Get finca numbers to process
        const fincaNumbers = minimalData.features
            .map(f => f.properties?.finca_regi)
            .filter(Boolean);

        scraper.totalCount = fincaNumbers.length;
        if (scraper.totalCount === 0) throw new Error('No finca_regi numbers found in the file');
        scraper.log(`Found ${scraper.totalCount} finca_regi numbers to process`);

        await scraper.initialize();

        for (const finca_regi of fincaNumbers) {
            try {
                const scraped = await scraper.scrapeProperty(finca_regi);
                // Update or add the feature in enrichedMap
                let feature = enrichedMap.get(finca_regi);
                if (!feature) {
                    // If not present, create a new feature
                    feature = { type: 'Feature', properties: { finca_regi } };
                }
                // Merge scraped data into properties
                feature.properties = { ...feature.properties, ...scraped };
                enrichedMap.set(finca_regi, feature);

                scraper.log('Waiting 2 seconds before next request...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                scraper.log(`Failed to process finca registral ${finca_regi}: ${error.message}`);
                continue;
            }
        }

        // Save updated enriched data
        enrichedData.features = Array.from(enrichedMap.values());
        fs.writeFileSync(enrichedPath, JSON.stringify(enrichedData, null, 2));
        scraper.log('All properties processed and saved to enriched_properties.json!');

    } catch (error) {
        scraper.log(`Fatal error: ${error.message}`);
        if (error.stack) scraper.log(`Stack trace: ${error.stack}`);
    } finally {
        await scraper.close();
    }
}

// Run if called directly
if (require.main === module) {
    processProperties().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { RegistryScraper, processProperties }; 