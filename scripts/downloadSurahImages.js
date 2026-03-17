const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'images', 'surah-names');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sources = [
  (n) => `https://raw.githubusercontent.com/rn0x/Quran-Surah-Images/main/surah_png/${n}.png`,
  (n) => `https://raw.githubusercontent.com/AhmedMater/Quran-Surah-Names/master/PNG/light/${n}.png`,
  (n) => `https://raw.githubusercontent.com/AhmedMater/Quran-Surah-Names/master/PNG/${n}.png`,
  (n) => `https://cdn.islamic.network/quran/images/surah/${n}.png`,
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
    }).on('error', reject);
  });
}

async function downloadAll() {
  let successCount = 0;
  let failCount = 0;

  for (let i = 1; i <= 114; i++) {
    const dest = path.join(dir, `${i}.png`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
      console.log(`${i} already exists`);
      successCount++;
      continue;
    }

    let success = false;
    for (const getUrl of sources) {
      const url = getUrl(i);
      try {
        await download(url, dest);
        const size = fs.statSync(dest).size;
        if (size < 100) {
          fs.unlinkSync(dest);
          throw new Error('File too small');
        }
        console.log(`Downloaded ${i}/114 (${size} bytes)`);
        success = true;
        successCount++;
        break;
      } catch (e) {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
      }
    }
    if (!success) {
      console.log(`FAILED ${i}`);
      failCount++;
    }
  }
  console.log(`\nDone! Success: ${successCount}, Failed: ${failCount}`);
}

downloadAll();
