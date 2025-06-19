require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, 'backend', 'public', 'data', 'minimal_properties.json');
const OUTPUT_PATH = path.join(__dirname, 'backend', 'public', 'data', 'enriched_properties.json');
const LOGIN_URL = 'https://www.rnpdigital.com/shopping/login.jspx';
const EMAIL = process.env.REGISTRY_EMAIL;
const PASSWORD = process.env.REGISTRY_PASSWORD;
const BATCH_SIZE = 50; // Number of properties per session
const DELAY_BETWEEN = 3000; // ms between property scrapes

// Helper to wait for a given number of milliseconds
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractValue(page, label) {
  const row = await page.locator(`tr:has-text(\"${label}\")`).first();
  if (await row.count() === 0) return null;
  const text = await row.textContent();
  if (!text) return null;
  const parts = text.split(label);
  return parts[1] ? parts[1].replace(/\n/g, '').trim() : null;
}

async function scrapeFinca(page, finca_regi) {
  try {
    // Navigate to search form
    await page.click('a[title="Consultas Gratuitas"]');
    await page.waitForTimeout(1000);
    await page.click('text=Consulta por número de finca');
    await page.waitForTimeout(1000);
    await page.fill('#params\\:finca', finca_regi);
    await page.click('img[alt="Consultar"]');
    await page.waitForTimeout(3000);

    // Extract fields
    return {
      finca: finca_regi,
      provincia: await extractValue(page, 'PROVINCIA:'),
      naturaleza: await extractValue(page, 'NATURALEZA:'),
      linderos: await extractValue(page, 'LINDEROS:'),
      size: await extractValue(page, 'MIDE:'),
      plano: await extractValue(page, 'PLANO:'),
      fiscal_value: await extractValue(page, 'VALOR FISCAL:'),
      owner: await extractValue(page, 'PROPIETARIO:'),
      cedula_juridica: await extractValue(page, 'CEDULA JURIDICA'),
      sale_date: await extractValue(page, 'FECHA DE INSCRIPCIÓN:'),
      anotaciones: await extractValue(page, 'ANOTACIONES SOBRE LA FINCA:'),
      gravamenes: await extractValue(page, 'GRAVAMENES o AFECTACIONES:'),
      estimacion_precio: await extractValue(page, 'ESTIMACIÓN O PRECIO:'),
      presentacion: await extractValue(page, 'PRESENTACIÓN:'),
      folio_real: await extractValue(page, 'FOLIO REAL'),
      segregaciones: await extractValue(page, 'SEGREGACIONES:'),
    };
  } catch (err) {
    console.error(`Error scraping finca ${finca_regi}:`, err.message);
    return { finca: finca_regi, error: err.message };
  }
}

async function scrapeAllProperties() {
  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const features = Array.isArray(raw) ? raw : raw.features;
  let enriched = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    enriched = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  }
  const alreadyDone = new Set(enriched.map(e => e.finca));
  const toScrape = features.filter(f => f.properties && f.properties.finca_regi && !alreadyDone.has(f.properties.finca_regi));

  let processed = 0;
  for (let i = 0; i < toScrape.length; i += BATCH_SIZE) {
    const batch = toScrape.slice(i, i + BATCH_SIZE);
    console.log(`Starting batch ${i / BATCH_SIZE + 1} (${batch.length} properties)...`);
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="text"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(4000);

    for (const feature of batch) {
      const finca_regi = feature.properties.finca_regi;
      if (!finca_regi) continue;
      console.log(`Scraping finca_regi: ${finca_regi}`);
      const data = await scrapeFinca(page, finca_regi);
      enriched.push({ ...feature.properties, registry: data });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
      await page.waitForTimeout(DELAY_BETWEEN);
      processed++;
      if (processed % 10 === 0 && processed < (toScrape.length - i)) {
        console.log('Rate limit reached: waiting 90 seconds before next 10 searches...');
        await wait(90000); // 90 seconds
      }
    }
    await browser.close();
    console.log(`Batch ${i / BATCH_SIZE + 1} complete. Progress saved.`);
    // Optional: Wait longer between batches
    await new Promise(res => setTimeout(res, 10000));
  }
  console.log('All properties scraped!');
}

scrapeAllProperties(); 