const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'result.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved as result.png');
})();
