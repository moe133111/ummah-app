import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from '../../hooks/useLocation';
import { useAppStore } from '../../hooks/useAppStore';
import { fetchPrayerTimes, getNextPrayer } from '../../features/prayer/prayerCalculation';
import { DarkTheme, LightTheme, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { DUAS } from '../../features/duas/duaData';
import Card from '../../components/ui/Card';
import HeaderBar from '../../components/ui/HeaderBar';
import { getStreakEmoji, getStreakMessage } from '../../features/streaks/streakManager';
import { PRAYER_META, TRACKABLE_KEYS } from '../../features/prayer/prayerMeta';
import ShareButton from '../../components/ui/ShareButton';

const DAILY_AYAHS = [
  // --- Trost ---
  { arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation: 'Wahrlich, mit der Erschwernis kommt die Erleichterung.', ref: 'Ash-Sharh 94:6' },
  { arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation: 'Denn wahrlich, mit der Erschwernis ist Erleichterung.', ref: 'Ash-Sharh 94:5' },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥ', translation: 'Und wer auf Allah vertraut, dem genügt Er.', ref: 'At-Talaq 65:3' },
  { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ', translation: 'Und dein Herr wird dir bestimmt geben, und du wirst zufrieden sein.', ref: 'Ad-Duha 93:5' },
  { arabic: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا', translation: 'Allah erlegt keiner Seele mehr auf, als sie zu leisten vermag.', ref: 'Al-Baqarah 2:286' },
  { arabic: 'وَلَا تَهِنُوا۟ وَلَا تَحْزَنُوا۟ وَأَنتُمُ ٱلْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', translation: 'Und werdet nicht schwach und seid nicht traurig, denn ihr seid die Obersten, wenn ihr gläubig seid.', ref: 'Aal-Imran 3:139' },
  // --- Vertrauen auf Allah ---
  { arabic: 'وَمَن يَتَّقِ ٱللَّهَ يَجْعَل لَّهُۥ مَخْرَجًا', translation: 'Und wer Allah fürchtet, dem schafft Er einen Ausweg.', ref: 'At-Talaq 65:2' },
  { arabic: 'فَتَوَكَّلْ عَلَى ٱللَّهِ ۖ إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُتَوَكِّلِينَ', translation: 'So vertraue auf Allah. Wahrlich, Allah liebt diejenigen, die auf Ihn vertrauen.', ref: 'Aal-Imran 3:159' },
  { arabic: 'وَيَمْكُرُونَ وَيَمْكُرُ ٱللَّهُ ۖ وَٱللَّهُ خَيْرُ ٱلْمَـٰكِرِينَ', translation: 'Und sie planen, und Allah plant. Und Allah ist der beste Planer.', ref: 'Al-Anfal 8:30' },
  { arabic: 'أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ', translation: 'Fürwahr, im Gedenken Allahs finden die Herzen Ruhe.', ref: 'Ar-Ra\'d 13:28' },
  // --- Vergebung ---
  { arabic: 'قُلْ يَـٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ ۚ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا', translation: 'Sprich: O Meine Diener, die ihr gegen euch selbst maßlos gewesen seid, verzweifelt nicht an Allahs Barmherzigkeit. Allah vergibt alle Sünden.', ref: 'Az-Zumar 39:53' },
  { arabic: 'وَمَن يَعْمَلْ سُوٓءًا أَوْ يَظْلِمْ نَفْسَهُۥ ثُمَّ يَسْتَغْفِرِ ٱللَّهَ يَجِدِ ٱللَّهَ غَفُورًا رَّحِيمًا', translation: 'Und wer Böses tut oder sich selbst Unrecht zufügt und dann Allah um Vergebung bittet, der wird Allah vergebend und barmherzig finden.', ref: 'An-Nisa 4:110' },
  // --- Dankbarkeit ---
  { arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ', translation: 'Wenn ihr dankbar seid, werde Ich euch bestimmt noch mehr geben.', ref: 'Ibrahim 14:7' },
  { arabic: 'وَمَن يَشْكُرْ فَإِنَّمَا يَشْكُرُ لِنَفْسِهِۦ', translation: 'Und wer dankbar ist, der ist nur dankbar zu seinem eigenen Vorteil.', ref: 'Luqman 31:12' },
  // --- Geduld ---
  { arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', translation: 'So gedenkt Meiner, damit Ich eurer gedenke.', ref: 'Al-Baqarah 2:152' },
  { arabic: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ', translation: 'Wahrlich, Allah ist mit den Geduldigen.', ref: 'Al-Baqarah 2:153' },
  { arabic: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱصْبِرُوا۟ وَصَابِرُوا۟ وَرَابِطُوا۟ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمْ تُفْلِحُونَ', translation: 'O die ihr glaubt, seid geduldig, wetteifert in Geduld, seid standhaft und fürchtet Allah, auf dass es euch wohl ergehe.', ref: 'Aal-Imran 3:200' },
  // --- Wissen ---
  { arabic: 'رَبِّ ٱشْرَحْ لِى صَدْرِى', translation: 'Mein Herr, weite mir meine Brust.', ref: 'Ta-Ha 20:25' },
  { arabic: 'وَقُل رَّبِّ زِدْنِى عِلْمًا', translation: 'Und sprich: Mein Herr, mehre mir mein Wissen.', ref: 'Ta-Ha 20:114' },
  { arabic: 'يَرْفَعِ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ مِنكُمْ وَٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ دَرَجَـٰتٍ', translation: 'Allah erhöht diejenigen von euch, die glauben, und diejenigen, denen das Wissen gegeben wurde, um Rangstufen.', ref: 'Al-Mujadila 58:11' },
  // --- Gebet & Dhikr ---
  { arabic: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱذْكُرُوا۟ ٱللَّهَ ذِكْرًا كَثِيرًا', translation: 'O die ihr glaubt, gedenkt Allahs in häufigem Gedenken.', ref: 'Al-Ahzab 33:41' },
  { arabic: 'إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ', translation: 'Wahrlich, das Gebet hält ab von Schändlichkeit und Verwerflichem.', ref: 'Al-Ankabut 29:45' },
  { arabic: 'وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ', translation: 'Und wenn Meine Diener dich nach Mir fragen, so bin Ich nahe. Ich erhöre den Ruf des Bittenden, wenn er Mich anruft.', ref: 'Al-Baqarah 2:186' },
  // --- Barmherzigkeit ---
  { arabic: 'وَرَحْمَتِى وَسِعَتْ كُلَّ شَىْءٍ', translation: 'Und Meine Barmherzigkeit umfasst alle Dinge.', ref: 'Al-A\'raf 7:156' },
  { arabic: 'إِنَّ رَحْمَتَ ٱللَّهِ قَرِيبٌ مِّنَ ٱلْمُحْسِنِينَ', translation: 'Wahrlich, Allahs Barmherzigkeit ist denen nahe, die Gutes tun.', ref: 'Al-A\'raf 7:56' },
  // --- Motivation & Stärke ---
  { arabic: 'وَلَا تَيْـَٔسُوا۟ مِن رَّوْحِ ٱللَّهِ ۖ إِنَّهُۥ لَا يَيْـَٔسُ مِن رَّوْحِ ٱللَّهِ إِلَّا ٱلْقَوْمُ ٱلْكَـٰفِرُونَ', translation: 'Und gebt nicht die Hoffnung auf die Gnade Allahs auf. Wahrlich, die Hoffnung auf Allahs Gnade gibt nur das ungläubige Volk auf.', ref: 'Yusuf 12:87' },
  { arabic: 'رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْـَٔاخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ', translation: 'Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes und bewahre uns vor der Strafe des Feuers.', ref: 'Al-Baqarah 2:201' },
  { arabic: 'وَنُنَزِّلُ مِنَ ٱلْقُرْءَانِ مَا هُوَ شِفَآءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ', translation: 'Und Wir senden vom Quran hinab, was Heilung und Barmherzigkeit ist für die Gläubigen.', ref: 'Al-Isra 17:82' },
  { arabic: 'وَٱدْعُونِىٓ أَسْتَجِبْ لَكُمْ', translation: 'Und ruft Mich an, so erhöre Ich euch.', ref: 'Ghafir 40:60' },
  { arabic: 'إِنَّا نَحْنُ نَزَّلْنَا ٱلذِّكْرَ وَإِنَّا لَهُۥ لَحَـٰفِظُونَ', translation: 'Wahrlich, Wir haben die Ermahnung hinabgesandt, und Wir werden sie ganz gewiss behüten.', ref: 'Al-Hijr 15:9' },
];

const DAILY_HADITHS = [
  { arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى', text: 'Wahrlich, die Taten sind nur entsprechend den Absichten, und jedem Menschen steht nur das zu, was er beabsichtigt hat.', source: 'Sahih al-Bukhari 1' },
  { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', text: 'Die Besten unter euch sind diejenigen, die den Quran lernen und ihn lehren.', source: 'Sahih al-Bukhari 5027' },
  { arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', text: 'Keiner von euch glaubt wirklich, bis er für seinen Bruder liebt, was er für sich selbst liebt.', source: 'Sahih al-Bukhari 13' },
  { arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', text: 'Der Muslim ist derjenige, vor dessen Zunge und Hand die anderen Muslime sicher sind.', source: 'Sahih al-Bukhari 10' },
  { arabic: '', text: 'Hüte dich vor den verbotenen Dingen, dann wirst du der frömmste der Menschen sein. Sei zufrieden mit dem, was Allah dir zugeteilt hat, dann wirst du der reichste der Menschen sein.', source: 'Sahih al-Bukhari 6018' },
  { arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', text: 'Wer an Allah und den Jüngsten Tag glaubt, der soll Gutes sprechen oder schweigen.', source: 'Sahih al-Bukhari 6018' },
  { arabic: 'أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا', text: 'Die vollkommensten Gläubigen im Glauben sind diejenigen mit dem besten Charakter.', source: 'Sahih Muslim 1810' },
  { arabic: 'إِنَّ أَوَّلَ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ مِنْ عَمَلِهِ صَلَاتُهُ', text: 'Das erste, worüber der Mensch am Tag der Auferstehung befragt wird, ist das Gebet.', source: 'Sahih Muslim 82' },
  { arabic: 'بَيْنَ الرَّجُلِ وَبَيْنَ الشِّرْكِ وَالْكُفْرِ تَرْكُ الصَّلَاةِ', text: 'Zwischen einem Menschen und dem Unglauben liegt das Unterlassen des Gebets.', source: 'Sahih Muslim 82' },
  { arabic: 'أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاكَ', text: 'Bete so, als ob du Allah siehst. Denn wenn du Ihn auch nicht siehst, so sieht Er doch dich.', source: 'Sahih al-Bukhari 50' },
  { arabic: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ', text: 'Wer den Ramadan aus Glauben und in der Hoffnung auf Belohnung fastet, dem werden seine früheren Sünden vergeben.', source: 'Sahih al-Bukhari 38' },
  { arabic: 'أَنَا عِنْدَ ظَنِّ عَبْدِي بِي وَأَنَا مَعَهُ إِذَا ذَكَرَنِي', text: 'Allah der Erhabene sagt: Ich bin so, wie Mein Diener Mich vermutet. Und Ich bin bei ihm, wenn er Meiner gedenkt.', source: 'Sahih al-Bukhari 7405' },
  { arabic: 'نِعْمَتَانِ مَغْبُونٌ فِيهِمَا كَثِيرٌ مِنَ النَّاسِ الصِّحَّةُ وَالْفَرَاغُ', text: 'Es gibt zwei Segnungen, um die viele Menschen betrogen werden: Gesundheit und freie Zeit.', source: 'Sahih al-Bukhari 6412' },
  { arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ', text: 'Wer einen Weg beschreitet, um Wissen zu erlangen, dem erleichtert Allah einen Weg ins Paradies.', source: 'Sahih Muslim 2699' },
  { arabic: 'يَسِّرُوا وَلَا تُعَسِّرُوا وَبَشِّرُوا وَلَا تُنَفِّرُوا', text: 'Erleichtert und erschwert nicht. Bringt frohe Botschaft und schreckt nicht ab.', source: 'Sahih al-Bukhari 69' },
  { arabic: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ', text: 'Der Starke ist nicht derjenige, der andere im Ringen besiegt, sondern der Starke ist derjenige, der sich bei Zorn beherrscht.', source: 'Sahih al-Bukhari 6114' },
  { arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ جَارَهُ', text: 'Wer an Allah und den Jüngsten Tag glaubt, der soll seinen Nachbarn gut behandeln.', source: 'Sahih al-Bukhari 6019' },
  { arabic: 'ارْحَمُوا مَنْ فِي الْأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ', text: 'Seid barmherzig zu denen auf der Erde, und der, Der im Himmel ist, wird barmherzig zu euch sein.', source: 'Sahih Muslim 2319' },
  { arabic: 'إِذَا مَاتَ الْإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ إِلَّا مِنْ صَدَقَةٍ جَارِيَةٍ أَوْ عِلْمٍ يُنْتَفَعُ بِهِ أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ', text: 'Wenn der Sohn Adams stirbt, hören seine Taten auf — außer drei: eine fortdauernde Spende, nützliches Wissen und ein rechtschaffenes Kind, das für ihn betet.', source: 'Sahih Muslim 1631' },
  { arabic: 'مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ', text: 'Wem Allah Gutes will, dem gibt Er Verständnis in der Religion.', source: 'Sahih al-Bukhari 71' },
  { arabic: '', text: 'Schaut auf diejenigen, die unter euch stehen, und nicht auf diejenigen, die über euch stehen. So werdet ihr die Gunst Allahs nicht gering schätzen.', source: 'Sahih Muslim 2963' },
  { arabic: 'عَجَبًا لِأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ', text: 'Wie wunderbar ist die Angelegenheit des Gläubigen! All seine Angelegenheiten sind gut für ihn.', source: 'Sahih Muslim 2999' },
  { arabic: '', text: 'Wer nicht für das Geringe dankt, wird auch nicht für das Viele danken.', source: 'Sahih Muslim 2963' },
  { arabic: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ', text: 'Ein gutes Wort ist eine Sadaqah (mildtätige Gabe).', source: 'Sahih al-Bukhari 2989' },
  { arabic: '', text: 'Lass deinen Zorn, und das Paradies gehört dir.', source: 'Sahih Muslim 2608' },
  { arabic: 'إِنَّ الدِّينَ يُسْرٌ وَلَنْ يُشَادَّ الدِّينَ أَحَدٌ إِلَّا غَلَبَهُ', text: 'Die Religion ist leicht. Wer die Religion zu übertreiben versucht, den wird sie überwältigen.', source: 'Sahih al-Bukhari 39' },
  { arabic: 'الطُّهُورُ شَطْرُ الْإِيمَانِ وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ', text: 'Die Reinheit ist die Hälfte des Glaubens, und Alhamdulillah füllt die Waage.', source: 'Sahih Muslim 223' },
  { arabic: 'أَفْضَلُ الذِّكْرِ لَا إِلَهَ إِلَّا اللَّهُ وَأَفْضَلُ الدُّعَاءِ الْحَمْدُ لِلَّهِ', text: 'Der beste Dhikr ist La ilaha illallah, und die beste Bittgebete ist Alhamdulillah.', source: 'Sahih Muslim 2137' },
  { arabic: '', text: 'Wer zwei Dinge aus den Besitztümern Allahs am Morgen und am Abend spricht, tritt ins Paradies ein: Subhanallah wal-Hamdulillah je hundertmal.', source: 'Sahih Muslim 2692' },
  { arabic: 'الدُّنْيَا سِجْنُ الْمُؤْمِنِ وَجَنَّةُ الْكَافِرِ', text: 'Die Welt ist das Gefängnis des Gläubigen und das Paradies des Ungläubigen.', source: 'Sahih Muslim 2956' },
];

const DHIKR_MINI = [
  { arabic: 'سُبْحَانَ اللَّهِ', text: 'SubhanAllah' },
  { arabic: 'الْحَمْدُ لِلَّهِ', text: 'Alhamdulillah' },
  { arabic: 'اللَّهُ أَكْبَرُ', text: 'Allahu Akbar' },
];

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function getDailyIndex(arr) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % arr.length;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentPrayer(times) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
    const mins = timeToMinutes(times[PRAYER_ORDER[i]]);
    if (cur >= mins) {
      const k = PRAYER_ORDER[i];
      return { key: k, name: PRAYER_META[k].name, time: times[k] };
    }
  }
  return { key: 'isha', name: 'Isha', time: times.isha };
}

function getPrayerProgress(times) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let currentIdx = -1;
  for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
    if (cur >= timeToMinutes(times[PRAYER_ORDER[i]])) { currentIdx = i; break; }
  }
  if (currentIdx === -1) {
    const prevEnd = timeToMinutes(times.isha);
    const nextStart = timeToMinutes(times.fajr);
    const totalSpan = (1440 - prevEnd) + nextStart;
    const elapsed = cur < nextStart ? (1440 - prevEnd) + cur : cur - prevEnd;
    return Math.min(1, Math.max(0, elapsed / totalSpan));
  }
  const currentTime = timeToMinutes(times[PRAYER_ORDER[currentIdx]]);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= PRAYER_ORDER.length) {
    const nextFajr = timeToMinutes(times.fajr) + 1440;
    const totalSpan = nextFajr - currentTime;
    return Math.min(1, Math.max(0, (cur - currentTime) / totalSpan));
  }
  const nextTime = timeToMinutes(times[PRAYER_ORDER[nextIdx]]);
  const totalSpan = nextTime - currentTime;
  if (totalSpan <= 0) return 0;
  return Math.min(1, Math.max(0, (cur - currentTime) / totalSpan));
}

const GOAL_META = {
  dhikr: { emoji: '📿', label: 'Dhikr' },
  quran: { emoji: '📖', label: 'Quran' },
  dua: { emoji: '🤲', label: 'Duas' },
};

function DailyGoalsRing({ goals, progress, t, expanded, onToggle }) {
  const enabled = Object.entries(goals).filter(([, v]) => v.enabled);
  const completed = enabled.filter(([key]) => (progress[key] || 0) >= goals[key].target).length;
  const total = enabled.length;
  const ratio = total > 0 ? completed / total : 0;
  const allDone = total > 0 && completed === total;

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <Pressable onPress={onToggle}>
      <Card centered>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={t.border} strokeWidth={strokeWidth} fill="none" />
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={allDone ? '#D4A843' : t.accent}
              strokeWidth={strokeWidth} fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: allDone ? '#D4A843' : t.accent }}>{completed}/{total}</Text>
        </View>
        <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>Tagesziele</Text>
      </Card>
    </Pressable>
  );
}

function DailyGoalsDetail({ goals, progress, t }) {
  const enabled = Object.entries(goals).filter(([, v]) => v.enabled);
  if (enabled.length === 0) return null;

  return (
    <Card>
      <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tagesziele Detail</Text>
      {enabled.map(([key, goal]) => {
        const meta = GOAL_META[key];
        const current = progress[key] || 0;
        const target = goal.target;
        const done = current >= target;
        const pct = Math.min(100, (current / target) * 100);
        return (
          <View key={key} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: done ? '#D4A843' : t.text }}>{meta.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: done ? '#D4A843' : t.accent }}>{current}/{target}</Text>
                {done && <Text style={{ fontSize: 14 }}>✅</Text>}
              </View>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 2, width: `${pct}%`, backgroundColor: done ? '#D4A843' : t.accent }} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export default function HomeScreen() {
  const { location, loading, error: locationError } = useLocation();
  const isDark = useAppStore((s) => s.theme === 'dark');
  const method = useAppStore((s) => s.calculationMethod);
  const todayPrayers = useAppStore((s) => s.todayPrayers);
  const lastReadSurah = useAppStore((s) => s.lastReadSurah);
  const incrementDhikr = useAppStore((s) => s.incrementDhikr);
  const currentStreak = useAppStore((s) => s.currentStreak) || 0;
  const fajrStreak = useAppStore((s) => s.fajrStreak) || 0;
  const dailyGoals = useAppStore((s) => s.dailyGoals);
  const dailyProgress = useAppStore((s) => s.dailyProgress);
  const t = isDark ? DarkTheme : LightTheme;
  const router = useRouter();

  const [miniCount, setMiniCount] = useState(0);
  const [miniSel, setMiniSel] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  const dateString = new Date().toISOString().slice(0, 10);
  const { data: prayerData } = useQuery({
    queryKey: ['prayerTimes', location?.lat, location?.lng, method, dateString],
    queryFn: () => fetchPrayerTimes(location.lat, location.lng, method),
    enabled: !!location,
    staleTime: 1000 * 60 * 60,
  });

  const times = prayerData?.times || null;
  const nextPrayer = useMemo(() => (times ? getNextPrayer(times) : null), [times]);
  const currentPrayer = useMemo(() => (times ? getCurrentPrayer(times) : null), [times]);

  useEffect(() => {
    if (!nextPrayer || !times) return;
    const update = () => {
      const now = new Date();
      const [h, m] = nextPrayer.time.split(':').map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target - now;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setProgress(getPrayerProgress(times));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextPrayer, times]);

  const hijriDate = useMemo(() => {
    try { return new Intl.DateTimeFormat('de-DE', { calendar: 'islamic-civil', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
    catch { return ''; }
  }, []);

  const gregorianDate = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const completedCount = Object.values(todayPrayers).filter(Boolean).length;
  const dailyAyah = DAILY_AYAHS[getDailyIndex(DAILY_AYAHS)];
  const dailyHadith = DAILY_HADITHS[getDailyIndex(DAILY_HADITHS)];
  const dailyDua = DUAS[getDailyIndex(DUAS)];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={styles.content}>
        {/* Header */}
        <HeaderBar titleAr="بِسْمِ ٱللَّهِ" title="Dein täglicher Begleiter" t={t} />

        {/* Date & Location */}
        <Card centered>
          <Text style={{ fontSize: FontSize.sm, color: t.textDim }}>{gregorianDate}</Text>
          {hijriDate ? <Text style={{ fontSize: FontSize.md, color: t.accent, marginTop: Spacing.xs }}>{hijriDate}</Text> : null}
          {location?.name ? (
            <View style={[styles.badge, { backgroundColor: t.accent + '18' }]}>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: t.accent }}>📍 {location.name}</Text>
            </View>
          ) : null}
          {locationError ? (
            <Text style={{ fontSize: 11, color: '#E65100', marginTop: 4 }}>📍 {locationError}</Text>
          ) : null}
        </Card>

        {/* Enhanced Prayer Countdown */}
        {nextPrayer && currentPrayer && (() => {
          const nextMeta = PRAYER_META[nextPrayer.key];
          const curMeta = PRAYER_META[currentPrayer.key];
          return (
            <View style={[styles.prayerCountdownCard, { borderColor: nextMeta.color + '44', backgroundColor: t.card }]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: nextMeta.color + '08', borderRadius: BorderRadius.md }]} />

              <View style={{ padding: Spacing.lg }}>
                {/* Current & Next Prayer */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                  <View>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Aktuelles Gebet</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                      <Text style={{ fontSize: 24 }}>{curMeta.emoji}</Text>
                      <View>
                        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.text }}>{currentPrayer.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{curMeta.description}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Nächstes Gebet</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: nextMeta.color }}>{nextPrayer.name}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>{nextMeta.description}</Text>
                      </View>
                      <Text style={{ fontSize: 24 }}>{nextMeta.emoji}</Text>
                    </View>
                  </View>
                </View>

                {/* Progress bar between prayers */}
                <View style={[styles.prayerProgressBar, { backgroundColor: t.border }]}>
                  <View style={[styles.prayerProgressFill, { width: `${progress * 100}%`, backgroundColor: nextMeta.color }]} />
                </View>

                {/* Countdown */}
                <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
                  <Text style={{ fontSize: 36, fontWeight: '700', color: nextMeta.color, fontVariant: ['tabular-nums'] }}>{countdown}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>bis {nextPrayer.name}</Text>
                </View>

                {/* Prayer dots - colored per prayer */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, gap: Spacing.sm }}>
                  {TRACKABLE_KEYS.map((p) => (
                    <View key={p} style={[styles.miniDot, { backgroundColor: todayPrayers[p] ? PRAYER_META[p].color : t.border }]} />
                  ))}
                </View>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, textAlign: 'center', marginTop: Spacing.xs }}>{completedCount}/5 verrichtet</Text>
              </View>
            </View>
          );
        })()}

        {/* Streak & Daily Goals side by side */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Card centered>
              <Text style={{ fontSize: 24, opacity: currentStreak === 0 ? 0.3 : 1 }}>{getStreakEmoji(currentStreak)}</Text>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: currentStreak > 0 ? t.accent : t.textDim }}>{currentStreak}</Text>
              <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Tage Streak</Text>
              <Text style={{ fontSize: 10, color: t.accent, marginTop: 2 }}>{getStreakMessage(currentStreak)}</Text>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <DailyGoalsRing goals={dailyGoals} progress={dailyProgress} t={t} expanded={goalsExpanded} onToggle={() => setGoalsExpanded((v) => !v)} />
          </View>
        </View>

        {goalsExpanded && <DailyGoalsDetail goals={dailyGoals} progress={dailyProgress} t={t} />}

        {/* Ayah des Tages */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Ayah des Tages</Text>
            <ShareButton type="ayah" arabic={dailyAyah.arabic} translation={dailyAyah.translation} reference={dailyAyah.ref} t={t} />
          </View>
          <View style={{ padding: 20, borderRadius: 12, backgroundColor: t.accent + '08', marginBottom: 8 }}>
            <Text style={{ fontSize: 26, lineHeight: 50, textAlign: 'center', color: t.accentLight }}>{dailyAyah.arabic}</Text>
          </View>
          <Text style={{ fontSize: 14, color: t.text, marginTop: 8, lineHeight: 22 }}>{dailyAyah.translation}</Text>
          <Text style={{ fontSize: 11, color: t.textDim, marginTop: 8 }}>— {dailyAyah.ref}</Text>
        </Card>

        {/* Hadith des Tages */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Hadith des Tages</Text>
            <ShareButton type="hadith" arabic={dailyHadith.arabic} translation={dailyHadith.text} reference={dailyHadith.source} t={t} />
          </View>
          {dailyHadith.arabic ? (
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: t.accent + '08', marginBottom: 10 }}>
              <Text style={{ fontSize: 22, lineHeight: 40, textAlign: 'right', color: t.accentLight }}>{dailyHadith.arabic}</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 14, fontStyle: 'italic', color: t.text, lineHeight: 22 }}>"{dailyHadith.text}"</Text>
          <Text style={{ fontSize: 11, color: t.textDim, marginTop: 6 }}>— {dailyHadith.source}</Text>
        </Card>

        {/* Dua des Tages */}
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Dua des Tages</Text>
            <ShareButton type="dua" arabic={dailyDua.arabic} translation={dailyDua.translation} reference="Hisn al-Muslim" transliteration={dailyDua.transliteration} t={t} />
          </View>
          <View style={{ padding: 20, borderRadius: 12, backgroundColor: t.accent + '08', marginBottom: 8 }}>
            <Text style={{ fontSize: 26, lineHeight: 50, textAlign: 'center', color: t.accentLight }}>{dailyDua.arabic}</Text>
          </View>
          {dailyDua.transliteration ? (
            <Text style={{ fontSize: 13, color: t.accent, fontStyle: 'italic', marginTop: 8 }}>{dailyDua.transliteration}</Text>
          ) : null}
          <Text style={{ fontSize: 14, color: t.text, lineHeight: 22, marginTop: 6 }}>{dailyDua.translation}</Text>
        </Card>

        {/* Mini Dhikr Counter */}
        <Card style={{ padding: 24 }}>
          <Text style={{ fontSize: FontSize.xs, color: t.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>📿 Schnell-Dhikr</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, marginBottom: 16 }}>
            {DHIKR_MINI.map((d, i) => (
              <Pressable
                key={i}
                style={[styles.miniChip, { borderColor: t.border }, miniSel === i && { borderColor: t.accent, backgroundColor: t.accent + '15' }]}
                onPress={() => { setMiniSel(i); setMiniCount(0); }}
              >
                <Text style={{ fontSize: FontSize.xs, color: miniSel === i ? t.accent : t.textDim }}>{d.text}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 18, color: t.accentLight, textAlign: 'center', marginBottom: 16 }}>{DHIKR_MINI[miniSel].arabic}</Text>
          <View style={{ alignItems: 'center' }}>
            <Pressable onPress={() => { setMiniCount((c) => c + 1); incrementDhikr(); }} style={[styles.miniCounter, { borderColor: t.accent + '44' }]}>
              <Text style={{ fontSize: 36, fontWeight: '700', color: t.accent }}>{miniCount}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setMiniCount(0)}
            style={[styles.miniReset, { borderColor: t.border }]}
          >
            <Text style={{ fontSize: FontSize.xs, color: t.textDim }}>Zurücksetzen</Text>
          </Pressable>
        </Card>

        {/* Quran Fortschritt */}
        <Pressable onPress={() => router.push(`/quran/${lastReadSurah}`)}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: t.text }}>Quran weiterlesen</Text>
                <Text style={{ fontSize: FontSize.xs, color: t.textDim, marginTop: Spacing.xs }}>Sure {lastReadSurah}/114</Text>
              </View>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: t.accent }}>{Math.round((lastReadSurah / 114) * 100)}%</Text>
            </View>
            <View style={[styles.progressBar, { marginTop: Spacing.sm, backgroundColor: t.border }]}>
              <View style={[styles.progressFill, { width: `${(lastReadSurah / 114) * 100}%`, backgroundColor: t.accent }]} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 90 },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xl, marginTop: Spacing.sm },
  miniDot: { width: 10, height: 10, borderRadius: 5 },
  miniChip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  miniCounter: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  miniReset: { alignSelf: 'center', marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, borderRadius: BorderRadius.full, borderWidth: 1 },
  prayerCountdownCard: { borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, marginBottom: Spacing.md },
  prayerProgressBar: { width: '100%', height: Spacing.sm, borderRadius: Spacing.xs, overflow: 'hidden' },
  prayerProgressFill: { height: '100%', borderRadius: Spacing.xs },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
