require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const LOGIN_URL = 'https://www.rnpdigital.com/shopping/login.jspx';
  const FINCA_REGI = '426958';
  const EMAIL = process.env.REGISTRY_EMAIL;
  const PASSWORD = process.env.REGISTRY_PASSWORD;
  const OUTPUT_PATH = 'finca_426958_data.json';

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  console.log('Page loaded. Logging in...');

  // Fill login form
  await page.fill('input[type="text"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('input[type="submit"]');
  await page.waitForTimeout(4000);

  // Click "Consultas Gratuitas" in the left menu
  await page.click('a[title="Consultas Gratuitas"]');
  await page.waitForTimeout(2000);

  // Click "Consulta por número de finca"
  await page.click('text=Consulta por número de finca');
  await page.waitForTimeout(2000);

  // Fill out the finca number
  await page.fill('#params\\:finca', FINCA_REGI);
  // Optionally, select province and other fields if needed
  // await page.selectOption('select[name="params:j_id270"]', '1'); // 1 = San José

  // Click the Consultar button (image/button next to finca input)
  await page.click('img[alt="Consultar"]');
  await page.waitForTimeout(5000);

  // Helper to extract value after a label
  async function extractValue(label) {
    const row = await page.locator(`tr:has-text(\"${label}\")`).first();
    if (await row.count() === 0) return null;
    const text = await row.textContent();
    if (!text) return null;
    const parts = text.split(label);
    return parts[1] ? parts[1].replace(/\n/g, '').trim() : null;
  }

  // Extract and clean important fields
  const data = {
    finca: FINCA_REGI,
    provincia: await extractValue('PROVINCIA:'),
    naturaleza: await extractValue('NATURALEZA:'),
    linderos: await extractValue('LINDEROS:'),
    size: await extractValue('MIDE:'),
    plano: await extractValue('PLANO:'),
    fiscal_value: await extractValue('VALOR FISCAL:'),
    owner: await extractValue('PROPIETARIO:'),
    cedula_juridica: await extractValue('CEDULA JURIDICA'),
    sale_date: await extractValue('FECHA DE INSCRIPCIÓN:'),
    anotaciones: await extractValue('ANOTACIONES SOBRE LA FINCA:'),
    gravamenes: await extractValue('GRAVAMENES o AFECTACIONES:'),
    estimacion_precio: await extractValue('ESTIMACIÓN O PRECIO:'),
    presentacion: await extractValue('PRESENTACIÓN:'),
    folio_real: await extractValue('FOLIO REAL'),
    segregaciones: await extractValue('SEGREGACIONES:'),
  };

  // Save to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Extracted data saved to ${OUTPUT_PATH}`);

  await browser.close();
})(); 