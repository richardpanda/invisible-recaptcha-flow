const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(true);
  await page.goto('http://localhost:3000');
  await page.click('.g-recaptcha');
  await page.waitFor(2000);

  const isCaptchaVisible = await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    for (let div of divs) {
      const style = div.getAttribute('style');
      console.log(style, style && style.startsWith('visibility'));
      if (style && style.startsWith('visibility')) {
        if (style.startsWith('visibility: visible;')) {
          return true;
        }
        return false;
      }
    }
    return false;
  });
})();
