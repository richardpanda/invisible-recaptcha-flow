const { readdirSync } = require('fs');
const { launch } = require('puppeteer');

(async () => {
  const browser = await launch({ headless: false });
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(true);
  await page.goto('http://localhost:3000');
  await page.click('.g-recaptcha');
  await page.waitFor(300);

  const isCaptchaVisible = await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    for (let div of divs) {
      const style = div.getAttribute('style');
      if (style && style.startsWith('visibility')) {
        if (style.startsWith('visibility: visible;')) {
          return true;
        }
        return false;
      }
    }
    return false;
  });

  if (!isCaptchaVisible) {
    await page.waitFor(1000);
    await browser.close();
    return;
  }

  const recaptchaFrame = page.frames().find(f => Boolean(f.name()));

  const audioButton = await recaptchaFrame.$('#recaptcha-audio-button');
  await audioButton.click();

  await page.waitFor(300);
})();
