require('dotenv').config();

const { createReadStream, readdirSync } = require('fs');
const { launch } = require('puppeteer');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');

const { textToNum } = require('./converter');

const speechToText = new SpeechToTextV1({
  username: process.env.IRF__WATSON__USERNAME, 
  password: process.env.IRF__WATSON__PASSWORD,
});
const recognize = (params) => (
  new Promise((resolve, reject) => {
    speechToText.recognize(params, (err, transcript) => {
      if (err) {
        reject(err);
      }
      resolve(transcript);
    });
  })
);
const isCaptcha = (page) => (
  page.evaluate(() => {
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
  })
);

(async () => {
  const browser = await launch({ headless: false });
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(true);
  await page.goto('http://localhost:3000');
  await page.click('.g-recaptcha');
  await page.waitFor(300);

  let captcha = await isCaptcha(page);
  if (!captcha) {
    await page.waitFor(1000);
    await browser.close();
    return;
  }

  const recaptchaFrame = page.frames().find(f => Boolean(f.name()));

  const audioButton = await recaptchaFrame.$('#recaptcha-audio-button');
  await audioButton.click();
  await page.waitFor(300);

  do {
    const audioDownload = await recaptchaFrame.$('.rc-audiochallenge-tdownload-link');
    await audioDownload.click();
    await page.waitFor(2000);

    const m = __dirname.match(/^\/Users\/\w+/g);
    const downloadPath = m[0] + '/Downloads';
    const audioFileNames = readdirSync(downloadPath)
      .filter(fn => fn.startsWith('audio'));
    const numAudioFiles = audioFileNames.length;
    const latestAudioFileName = numAudioFiles === 1
      ? 'audio.mp3'
      : `audio (${numAudioFiles-1}).mp3`;
    const filePath = `${downloadPath}/${latestAudioFileName}`;

    const params = {
      audio: createReadStream(filePath),
      content_type: 'audio/mp3',
      model: 'en-US_NarrowbandModel',
    };
    const transcript = await recognize(params);

    const instructions = await recaptchaFrame.$eval('#audio-instructions', elem => elem.innerText);
    const isNumCaptcha = instructions === 'Press PLAY and enter the numbers you hear';

    let solution = '';
    if (isNumCaptcha) {
      solution = transcript.results
        .map(r => r.alternatives[0].transcript.trim())
        .map(word => textToNum(word))
        .join('');
    } else {
      solution = transcript.results
        .map(r => r.alternatives[0].transcript.trim())
        .join('');
    }
    console.log(solution);

    const playButton = await recaptchaFrame.$('.rc-button-default');
    await playButton.click();
    await page.waitFor(15000);
      
    const input = await recaptchaFrame.$('#audio-response');
    await input.type(solution, { delay: 200 });
    await page.waitFor(2000);
    
    const verifyButton = await recaptchaFrame.$('#recaptcha-verify-button');
    await verifyButton.click();
    await page.waitFor(3000);

    captcha = await isCaptcha(page);
  } while (captcha);

  await browser.close();
})();
