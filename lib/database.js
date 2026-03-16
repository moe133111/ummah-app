import * as SQLite from 'expo-sqlite';

let db = null;

export async function initDatabase() {
  db = await SQLite.openDatabaseAsync('quran_cache.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ayahs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_number INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      edition TEXT NOT NULL,
      UNIQUE(surah_number, ayah_number, edition)
    );
  `);
}

export async function saveSurah(surahNumber, edition, ayahs) {
  if (!db) await initDatabase();
  const statement = await db.prepareAsync(
    'INSERT OR REPLACE INTO ayahs (surah_number, ayah_number, text, edition) VALUES ($surah, $ayah, $text, $edition)'
  );
  try {
    for (const ayah of ayahs) {
      await statement.executeAsync({
        $surah: surahNumber,
        $ayah: ayah.numberInSurah,
        $text: ayah.text,
        $edition: edition,
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
}

export async function getSurah(surahNumber, edition) {
  if (!db) await initDatabase();
  const rows = await db.getAllAsync(
    'SELECT ayah_number AS numberInSurah, text FROM ayahs WHERE surah_number = ? AND edition = ? ORDER BY ayah_number',
    [surahNumber, edition]
  );
  return rows.length > 0 ? rows : null;
}

export async function isSurahCached(surahNumber, edition) {
  if (!db) await initDatabase();
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM ayahs WHERE surah_number = ? AND edition = ?',
    [surahNumber, edition]
  );
  return result.count > 0;
}
