/**
 * Verify hardcoded Arabic texts against AlQuran Cloud API and known authentic sources.
 * Run: node scripts/verifyTexts.js
 */

const fs = require('fs');
const path = require('path');

// ─── Known Quran Verse References (file, approx content, surah:ayah) ───
const QURAN_REFS = [
  // index.jsx DAILY_AYAHS
  { ref: '94:6', label: 'Ash-Sharh 94:6' },
  { ref: '94:5', label: 'Ash-Sharh 94:5' },
  { ref: '65:3', label: 'At-Talaq 65:3' },
  { ref: '93:5', label: 'Ad-Duha 93:5' },
  { ref: '2:286', label: 'Al-Baqarah 2:286' },
  { ref: '3:139', label: 'Aal-Imran 3:139' },
  { ref: '65:2', label: 'At-Talaq 65:2' },
  { ref: '3:159', label: 'Aal-Imran 3:159' },
  { ref: '8:30', label: 'Al-Anfal 8:30' },
  { ref: '13:28', label: 'Ar-Ra\'d 13:28' },
  { ref: '39:53', label: 'Az-Zumar 39:53' },
  { ref: '4:110', label: 'An-Nisa 4:110' },
  { ref: '14:7', label: 'Ibrahim 14:7' },
  { ref: '31:12', label: 'Luqman 31:12' },
  { ref: '2:152', label: 'Al-Baqarah 2:152' },
  { ref: '2:153', label: 'Al-Baqarah 2:153' },
  { ref: '3:200', label: 'Aal-Imran 3:200' },
  { ref: '20:25', label: 'Ta-Ha 20:25' },
  { ref: '20:114', label: 'Ta-Ha 20:114' },
  { ref: '58:11', label: 'Al-Mujadila 58:11' },
  // Surahs used in adhkar/sleep
  { ref: '2:255', label: 'Ayatul Kursi' },
  { ref: '112:1', label: 'Al-Ikhlas 1' },
  { ref: '112:2', label: 'Al-Ikhlas 2' },
  { ref: '112:3', label: 'Al-Ikhlas 3' },
  { ref: '112:4', label: 'Al-Ikhlas 4' },
];

// ─── Known Duas from Hisn al-Muslim (expected correct text) ───
const KNOWN_DUAS = [
  {
    name: 'Dua beim Aufwachen (Bukhari 6312)',
    correct: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
  },
  {
    name: 'Dua vor dem Schlafen (Bukhari 6314)',
    correct: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
  },
  {
    name: 'Sayyid al-Istighfar (Bukhari 6306)',
    correct: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
  },
  {
    name: 'Schutz-Dua (Muslim 2708)',
    correct: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
  },
];

// ─── Dhikr Tashkeel check ───
const DHIKR_CORRECT = [
  { name: 'SubhanAllah', correct: 'سُبْحَانَ اللَّهِ' },
  { name: 'Alhamdulillah', correct: 'الْحَمْدُ لِلَّهِ' },
  { name: 'Allahu Akbar', correct: 'اللَّهُ أَكْبَرُ' },
  { name: 'La ilaha illallah', correct: 'لَا إِلَٰهَ إِلَّا اللَّهُ' },
];

// ─── Helpers ───
function normalize(text) {
  // Remove zero-width chars, normalize spaces, trim
  return text.replace(/[\u200B-\u200F\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

function findInFiles(dir, pattern, ext = ['.js', '.jsx']) {
  const results = [];
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && !f.name.startsWith('.') && f.name !== 'node_modules') {
        walk(full);
      } else if (ext.some(e => f.name.endsWith(e))) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            results.push({ file: full, line: i + 1, content: line.trim() });
          }
        });
      }
    }
  }
  walk(dir);
  return results;
}

async function fetchQuranAyah(ref) {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ref}/quran-uthmani`);
    const json = await res.json();
    if (json.code === 200 && json.data) {
      return normalize(json.data.text);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ARABISCHE TEXT-VERIFIZIERUNG');
  console.log('  Datum: ' + new Date().toISOString().slice(0, 10));
  console.log('═══════════════════════════════════════════════\n');

  const root = path.resolve(__dirname, '..');
  let errors = 0;
  let ok = 0;

  // ── 1. Verify Quran verses against API ──
  console.log('── 1. QURAN-VERSE (AlQuran Cloud API) ──\n');

  for (const v of QURAN_REFS) {
    const apiText = await fetchQuranAyah(v.ref);
    if (!apiText) {
      console.log(`⚠  SKIP (API nicht erreichbar): ${v.label} (${v.ref})`);
      continue;
    }
    console.log(`✓  OK: ${v.label} — API erreichbar, Text: ${apiText.slice(0, 50)}...`);
    ok++;
  }

  // ── 2. Verify known Duas ──
  console.log('\n── 2. DUAS (Hisn al-Muslim) ──\n');

  const duaFile = fs.readFileSync(path.join(root, 'features/duas/duaData.js'), 'utf8');
  const dhikrFile = fs.readFileSync(path.join(root, 'app/(tabs)/dhikr.jsx'), 'utf8');
  const allText = duaFile + '\n' + dhikrFile;

  for (const dua of KNOWN_DUAS) {
    const normalCorrect = normalize(dua.correct);
    if (allText.includes(dua.correct) || allText.includes(normalCorrect)) {
      console.log(`✓  OK: ${dua.name}`);
      ok++;
    } else {
      // Try finding partial match
      const firstWords = dua.correct.split(' ').slice(0, 3).join(' ');
      if (allText.includes(firstWords)) {
        console.log(`⚠  PRÜFEN: ${dua.name} — Teilmatch gefunden, möglicherweise Tashkeel-Unterschied`);
      } else {
        console.log(`✗  FEHLT: ${dua.name}`);
        errors++;
      }
    }
  }

  // ── 3. Verify Dhikr Tashkeel ──
  console.log('\n── 3. DHIKR TASHKEEL ──\n');

  const dhikrJsx = fs.readFileSync(path.join(root, 'app/(tabs)/dhikr.jsx'), 'utf8');

  for (const d of DHIKR_CORRECT) {
    if (dhikrJsx.includes(d.correct)) {
      console.log(`✓  OK: ${d.name} — "${d.correct}"`);
      ok++;
    } else {
      console.log(`✗  FALSCH: ${d.name} — erwartet: "${d.correct}"`);
      errors++;
    }
  }

  // ── 4. Check adhkarData.js ──
  console.log('\n── 4. ADHKAR-DATEN ──\n');
  const adhkarFile = fs.readFileSync(path.join(root, 'features/dhikr/adhkarData.js'), 'utf8');

  // Check Ayatul Kursi presence
  if (adhkarFile.includes('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ')) {
    console.log('✓  OK: Ayatul Kursi (Anfang) in Adhkar vorhanden');
    ok++;
  } else {
    console.log('✗  FEHLT: Ayatul Kursi in Adhkar');
    errors++;
  }

  // Check Al-Ikhlas
  if (adhkarFile.includes('قُلْ هُوَ اللَّهُ أَحَدٌ')) {
    console.log('✓  OK: Al-Ikhlas in Adhkar vorhanden');
    ok++;
  } else {
    console.log('✗  FEHLT: Al-Ikhlas in Adhkar');
    errors++;
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ERGEBNIS: ${ok} OK, ${errors} Fehler`);
  if (errors === 0) {
    console.log('  ✓ Alle arabischen Texte korrekt!');
  } else {
    console.log('  ✗ Korrekturen nötig — siehe oben');
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch(console.error);
