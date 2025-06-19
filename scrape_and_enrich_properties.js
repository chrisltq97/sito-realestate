/**
 * scrape_and_enrich_properties.js
 *
 * This script reads property data from data/minimal_properties.json, scrapes the Costa Rica National Registry
 * (https://www.rnpdigital.com/shopping/consultaDocumentos/paramConsultaFinca.jspx) for each finca_regi,
 * and saves the enriched results to data/enriched_properties.json.
 *
 * When ready to upload to Supabase, replace the file write section with a call to your upload-to-supabase.js script
 * or use the Supabase client to insert/update the enriched data.
 *
 * To run: node scrape_and_enrich_properties.js
 *
 * Requires: npm install playwright
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const INPUT_PATH = path.join(__dirname, 'data', 'minimal_properties.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'enriched_properties.json');
const REGISTRY_URL = 'https://www.rnpdigital.com/shopping/consultaDocumentos/paramConsultaFinca.jspx';

async function scrapeRegistryData(page, finca_regi) {
  // TODO: Update selectors and navigation as needed for the registry site
  try {
    await page.goto(REGISTRY_URL, { waitUntil: 'domcontentloaded' });
    // Example: fill in finca_regi and submit (update selector as needed)
    await page.fill('input[name="finca"]', finca_regi);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // Wait for results to load

    // TODO: Extract real data fields from the results page
    // Example selectors below (update to match actual site)
    const sale_date = await page.textContent('#sale_date');
    const fiscal_value = await page.textContent('#fiscal_value');
    const size = await page.textContent('#size');
    const gravamenes = await page.textContent('#gravamenes');
    const is_foreclosure = await page.textContent('#foreclosure') === 'Yes';

    return {
      sale_date,
      fiscal_value,
      size,
      gravamenes,
      is_foreclosure,
    };
  } catch (err) {
    console.error(`Error scraping finca_regi ${finca_regi}:`, err.message);
    return null;
  }
}

(async () => {
  const properties = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const enriched = [];
  for (const prop of properties) {
    const finca_regi = prop.finca_regi;
    if (!finca_regi) continue;
    console.log(`Scraping finca_regi: ${finca_regi}`);
    const registryData = await scrapeRegistryData(page, finca_regi);
    if (registryData) {
      enriched.push({ ...prop, registry: registryData });
    } else {
      enriched.push({ ...prop, registry: null });
    }
    // Optional: Save progress every N records
    if (enriched.length % 100 === 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
      console.log(`Saved ${enriched.length} records so far...`);
    }
  }

  await browser.close();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
  console.log(`Done! Enriched data saved to ${OUTPUT_PATH}`);
})(); 