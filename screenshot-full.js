const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Home page
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'result-home.png', fullPage: true });
  console.log('Home screenshot saved');

  // Catalogue
  await page.goto('http://localhost:3000/catalogue.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'result-catalogue.png', fullPage: true });
  console.log('Catalogue screenshot saved');

  // Panier (empty state)
  await page.goto('http://localhost:3000/panier.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'result-panier.png', fullPage: true });
  console.log('Panier screenshot saved');

  // Pre-fill cart then screenshot panier with items
  await page.goto('http://localhost:3000/panier.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const cart = [
      { id: '1', title: 'Les Misérables', author: 'Victor Hugo', price: 3500, image: '', qty: 1 },
      { id: '3', title: "L'Alchimiste", author: 'Paulo Coelho', price: 3000, image: '', qty: 2 },
    ];
    localStorage.setItem('livreo_cart', JSON.stringify(cart));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'result-panier-items.png', fullPage: true });
  console.log('Panier (with items) screenshot saved');

  // Commande (checkout) — cart still has items from localStorage
  await page.goto('http://localhost:3000/commande.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'result-commande.png', fullPage: true });
  console.log('Commande screenshot saved');

  // Confirmation page
  await page.goto('http://localhost:3000/confirmation.html?num=LV-00042', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'result-confirmation.png', fullPage: true });
  console.log('Confirmation screenshot saved');

  // Admin login
  await page.goto('http://localhost:3000/admin/login.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'result-admin-login.png', fullPage: true });
  console.log('Admin login screenshot saved');

  await browser.close();
  console.log('All screenshots complete!');
})();
