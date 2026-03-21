// Quran Text Verification Script
// Fetches correct texts from AlQuran Cloud API (quran-uthmani edition)
// Note: Run with `node scripts/verifyQuranTexts.js` — requires network access to api.alquran.cloud
// Last run: 2026-03-21 — API blocked in CI environment, manual verification performed

const verses = [
  // DAILY_AYAHS in index.jsx
  { ref: '94:6', location: 'DAILY_AYAHS' },
  { ref: '94:5', location: 'DAILY_AYAHS' },
  { ref: '65:3', location: 'DAILY_AYAHS' },
  { ref: '93:5', location: 'DAILY_AYAHS' },
  { ref: '2:286', location: 'DAILY_AYAHS' },
  { ref: '3:139', location: 'DAILY_AYAHS' },
  { ref: '65:2', location: 'DAILY_AYAHS' },
  { ref: '3:159', location: 'DAILY_AYAHS' },
  { ref: '8:30', location: 'DAILY_AYAHS' },
  { ref: '13:28', location: 'DAILY_AYAHS' },
  { ref: '39:53', location: 'DAILY_AYAHS' },
  { ref: '4:110', location: 'DAILY_AYAHS' },
  { ref: '14:7', location: 'DAILY_AYAHS' },
  { ref: '31:12', location: 'DAILY_AYAHS' },
  { ref: '2:152', location: 'DAILY_AYAHS' },
  { ref: '2:153', location: 'DAILY_AYAHS' },
  { ref: '3:200', location: 'DAILY_AYAHS' },
  { ref: '20:25', location: 'DAILY_AYAHS' },
  { ref: '20:114', location: 'DAILY_AYAHS' },
  { ref: '58:11', location: 'DAILY_AYAHS' },
  { ref: '33:41', location: 'DAILY_AYAHS' },
  { ref: '29:45', location: 'DAILY_AYAHS' },
  { ref: '2:186', location: 'DAILY_AYAHS' },
  { ref: '7:156', location: 'DAILY_AYAHS' },
  { ref: '7:56', location: 'DAILY_AYAHS' },
  { ref: '12:87', location: 'DAILY_AYAHS' },
  { ref: '2:201', location: 'DAILY_AYAHS' },
  { ref: '17:82', location: 'DAILY_AYAHS' },
  { ref: '40:60', location: 'DAILY_AYAHS' },
  { ref: '15:9', location: 'DAILY_AYAHS' },
  // SLEEP_CONTENT in dhikr.jsx — Ayatul Kursi
  { ref: '2:255', location: 'Ayatul Kursi (dhikr.jsx + duaData.js)' },
  // Suren in dhikr.jsx
  { ref: '112:1', location: 'Al-Ikhlas v1' },
  { ref: '112:2', location: 'Al-Ikhlas v2' },
  { ref: '112:3', location: 'Al-Ikhlas v3' },
  { ref: '112:4', location: 'Al-Ikhlas v4' },
  { ref: '113:1', location: 'Al-Falaq v1' },
  { ref: '113:2', location: 'Al-Falaq v2' },
  { ref: '113:3', location: 'Al-Falaq v3' },
  { ref: '113:4', location: 'Al-Falaq v4' },
  { ref: '113:5', location: 'Al-Falaq v5' },
  { ref: '114:1', location: 'An-Nas v1' },
  { ref: '114:2', location: 'An-Nas v2' },
  { ref: '114:3', location: 'An-Nas v3' },
  { ref: '114:4', location: 'An-Nas v4' },
  { ref: '114:5', location: 'An-Nas v5' },
  { ref: '114:6', location: 'An-Nas v6' },
  // Quran refs in duaData.js
  { ref: '43:13', location: 'Reise-Dua (duaData.js) v1' },
  { ref: '43:14', location: 'Reise-Dua (duaData.js) v2' },
  { ref: '17:24', location: 'Dua Eltern (duaData.js)' },
  { ref: '3:173', location: 'HasbunAllah (duaData.js)' },
  { ref: '2:156', location: 'Inna lillahi (duaData.js)' },
  { ref: '21:87', location: 'Yunus Dua (duaData.js)' },
  { ref: '37:100', location: 'Dua Kinder (duaData.js)' },
  { ref: '25:74', location: 'Dua Ehepartner (duaData.js)' },
  { ref: '20:114', location: 'Wissen (duaData.js)' },
];

async function verify() {
  const results = [];
  for (const v of verses) {
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${v.ref}/quran-uthmani`);
      const data = await res.json();
      if (data.status === 'OK') {
        results.push({ ref: v.ref, location: v.location, text: data.data.text });
        console.log(`${v.ref} (${v.location}): ${data.data.text}`);
      } else {
        console.error(`${v.ref}: API error — ${data.status}`);
      }
    } catch (err) {
      console.error(`${v.ref}: Fetch error — ${err.message}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

verify().then(() => console.log('\n=== DONE ==='));
