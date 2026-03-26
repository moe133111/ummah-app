/**
 * Kuratierte Liste von 60 lernwürdigen Quran-Versen
 * für das "Vers des Tages"-Modul.
 */

export const MEMORIZE_VERSES = [
  { surah: 1, ayah: 1, theme: 'Grundlage' },
  { surah: 1, ayah: 2, theme: 'Grundlage' },
  { surah: 1, ayah: 3, theme: 'Grundlage' },
  { surah: 1, ayah: 4, theme: 'Grundlage' },
  { surah: 1, ayah: 5, theme: 'Grundlage' },
  { surah: 1, ayah: 6, theme: 'Grundlage' },
  { surah: 1, ayah: 7, theme: 'Grundlage' },
  { surah: 2, ayah: 255, theme: 'Schutz' },       // Ayatul Kursi
  { surah: 2, ayah: 286, theme: 'Bittgebet' },
  { surah: 3, ayah: 139, theme: 'Mut' },
  { surah: 3, ayah: 159, theme: 'Vertrauen' },
  { surah: 2, ayah: 152, theme: 'Dhikr' },
  { surah: 2, ayah: 153, theme: 'Geduld' },
  { surah: 2, ayah: 186, theme: 'Bittgebet' },
  { surah: 2, ayah: 201, theme: 'Bittgebet' },
  { surah: 13, ayah: 28, theme: 'Dhikr' },
  { surah: 14, ayah: 7, theme: 'Dankbarkeit' },
  { surah: 20, ayah: 114, theme: 'Wissen' },
  { surah: 21, ayah: 87, theme: 'Bittgebet' },
  { surah: 23, ayah: 115, theme: 'Sinn des Lebens' },
  { surah: 25, ayah: 74, theme: 'Familie' },
  { surah: 29, ayah: 45, theme: 'Gebet' },
  { surah: 33, ayah: 41, theme: 'Dhikr' },
  { surah: 33, ayah: 56, theme: 'Prophet' },
  { surah: 39, ayah: 53, theme: 'Vergebung' },
  { surah: 40, ayah: 60, theme: 'Bittgebet' },
  { surah: 49, ayah: 13, theme: 'Gleichheit' },
  { surah: 55, ayah: 13, theme: 'Dankbarkeit' },
  { surah: 65, ayah: 3, theme: 'Vertrauen' },
  { surah: 93, ayah: 5, theme: 'Hoffnung' },
  { surah: 94, ayah: 5, theme: 'Hoffnung' },
  { surah: 94, ayah: 6, theme: 'Hoffnung' },
  { surah: 112, ayah: 1, theme: 'Tawhid' },
  { surah: 112, ayah: 2, theme: 'Tawhid' },
  { surah: 112, ayah: 3, theme: 'Tawhid' },
  { surah: 112, ayah: 4, theme: 'Tawhid' },
  { surah: 113, ayah: 1, theme: 'Schutz' },
  { surah: 114, ayah: 1, theme: 'Schutz' },
  { surah: 17, ayah: 24, theme: 'Familie' },
  { surah: 17, ayah: 80, theme: 'Bittgebet' },
  { surah: 3, ayah: 8, theme: 'Bittgebet' },
  { surah: 3, ayah: 26, theme: 'Macht Allahs' },
  { surah: 57, ayah: 4, theme: 'Allwissen' },
  { surah: 2, ayah: 45, theme: 'Geduld' },
  { surah: 73, ayah: 8, theme: 'Vertrauen' },
  { surah: 9, ayah: 51, theme: 'Qadr' },
  { surah: 4, ayah: 110, theme: 'Vergebung' },
  { surah: 66, ayah: 8, theme: 'Reue' },
  { surah: 2, ayah: 216, theme: 'Vertrauen' },
  { surah: 18, ayah: 10, theme: 'Bittgebet' },
  { surah: 67, ayah: 2, theme: 'Sinn des Lebens' },
  { surah: 51, ayah: 56, theme: 'Sinn des Lebens' },
  { surah: 3, ayah: 173, theme: 'Vertrauen' },
  { surah: 48, ayah: 29, theme: 'Gemeinschaft' },
  { surah: 16, ayah: 97, theme: 'Gutes Tun' },
  { surah: 31, ayah: 17, theme: 'Gebet' },
  { surah: 2, ayah: 269, theme: 'Wissen' },
  { surah: 59, ayah: 22, theme: 'Namen Allahs' },
  { surah: 59, ayah: 23, theme: 'Namen Allahs' },
  { surah: 59, ayah: 24, theme: 'Namen Allahs' },
];

/**
 * Berechnet den Tagesvers-Index basierend auf dem Datum.
 * Zyklisch: nach 60 Tagen beginnt die Rotation erneut.
 */
export function getTodayVerseIndex(dayOffset = 0) {
  const startDate = new Date(2026, 0, 1); // 1. Januar 2026
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - startDate) / 86400000) + dayOffset;
  return ((daysDiff % MEMORIZE_VERSES.length) + MEMORIZE_VERSES.length) % MEMORIZE_VERSES.length;
}

/**
 * Berechnet den aktuellen Tag im Zyklus (1-basiert).
 */
export function getDayInCycle(dayOffset = 0) {
  const idx = getTodayVerseIndex(dayOffset);
  return idx + 1;
}

/**
 * Berechnet die globale Ayah-Nummer (1-6236) für eine Surah:Ayah Kombination.
 * Wird für die Audio-URL benötigt.
 */
const SURAH_AYAH_OFFSETS = [
  0, 7, 293, 493, 669, 789, 954, 1160, 1235, 1364, 1473, 1596, 1707, 1750, 1802,
  1901, 2029, 2140, 2250, 2348, 2483, 2595, 2673, 2791, 2855, 2932, 3159, 3252,
  3340, 3409, 3469, 3503, 3533, 3606, 3660, 3705, 3788, 3970, 4058, 4133, 4218,
  4272, 4325, 4414, 4473, 4510, 4545, 4583, 4612, 4630, 4675, 4735, 4784, 4846,
  4901, 4979, 5075, 5104, 5126, 5150, 5163, 5177, 5188, 5199, 5217, 5229, 5241,
  5271, 5323, 5375, 5419, 5447, 5475, 5495, 5551, 5591, 5622, 5672, 5718, 5764,
  5810, 5836, 5905, 5930, 5948, 5965, 5993, 6023, 6043, 6058, 6073, 6087, 6098,
  6106, 6125, 6130, 6138, 6146, 6157, 6168, 6176, 6179, 6188, 6193, 6197, 6204,
  6207, 6213, 6216, 6221, 6225, 6230, 6236,
];

export function getGlobalAyahNumber(surah, ayah) {
  if (surah < 1 || surah > 114) return 1;
  return SURAH_AYAH_OFFSETS[surah - 1] + ayah;
}
