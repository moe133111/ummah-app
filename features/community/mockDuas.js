// TODO: Ersetze mockDuas mit Supabase Realtime Query
const H = 3600000; // 1 hour in ms
const D = 86400000; // 1 day in ms

export const MOCK_DUAS = [
  { id: 'm1', text: 'Ya Allah, gib allen Kranken Heilung und Genesung.', timestamp: Date.now() - 25 * 60000, ameenCount: 127, heartCount: 34 },
  { id: 'm2', text: 'اللهم اشف مرضانا ومرضى المسلمين', timestamp: Date.now() - 2 * H, ameenCount: 89, heartCount: 21 },
  { id: 'm3', text: 'Möge Allah uns alle rechtleiten und auf dem geraden Weg festigen.', timestamp: Date.now() - 3 * H, ameenCount: 203, heartCount: 56 },
  { id: 'm4', text: 'Ya Rabb, erleichtere allen Geschwistern ihre Prüfungen.', timestamp: Date.now() - 4 * H, ameenCount: 67, heartCount: 18 },
  { id: 'm5', text: 'اللهم اغفر لنا ذنوبنا وإسرافنا في أمرنا', timestamp: Date.now() - 5 * H, ameenCount: 145, heartCount: 42 },
  { id: 'm6', text: 'Allah, schenke der gesamten Ummah Einheit und Frieden.', timestamp: Date.now() - 7 * H, ameenCount: 312, heartCount: 87 },
  { id: 'm7', text: 'Ya Allah, segne unsere Eltern und vergib ihnen.', timestamp: Date.now() - 9 * H, ameenCount: 256, heartCount: 73 },
  { id: 'm8', text: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار', timestamp: Date.now() - 11 * H, ameenCount: 178, heartCount: 51 },
  { id: 'm9', text: 'Möge Allah unsere Gebete annehmen und uns ins Paradies eintreten lassen.', timestamp: Date.now() - 14 * H, ameenCount: 94, heartCount: 28 },
  { id: 'm10', text: 'Ya Allah, gib den Unterdrückten Gerechtigkeit.', timestamp: Date.now() - 18 * H, ameenCount: 189, heartCount: 62 },
  { id: 'm11', text: 'اللهم ارزقنا حسن الخاتمة', timestamp: Date.now() - D, ameenCount: 134, heartCount: 39 },
  { id: 'm12', text: 'Allah, stärke den Iman aller Muslime weltweit.', timestamp: Date.now() - 1.5 * D, ameenCount: 221, heartCount: 65 },
  { id: 'm13', text: 'Ya Rabb, segne alle, die in diesem Ramadan fasten.', timestamp: Date.now() - 2 * D, ameenCount: 345, heartCount: 98 },
  { id: 'm14', text: 'اللهم اجعل القرآن ربيع قلوبنا', timestamp: Date.now() - 2.5 * D, ameenCount: 112, heartCount: 33 },
  { id: 'm15', text: 'Möge Allah uns vor dem Feuer der Hölle bewahren.', timestamp: Date.now() - 3 * D, ameenCount: 167, heartCount: 47 },
  { id: 'm16', text: 'Ya Allah, schenke allen alleinstehenden Geschwistern einen guten Partner.', timestamp: Date.now() - 4 * D, ameenCount: 198, heartCount: 71 },
  { id: 'm17', text: 'اللهم يسر أمورنا واشرح صدورنا', timestamp: Date.now() - 5 * D, ameenCount: 88, heartCount: 24 },
  { id: 'm18', text: 'Allah, beschütze unsere Kinder und führe sie zum Guten.', timestamp: Date.now() - 8 * D, ameenCount: 276, heartCount: 82 },
  { id: 'm19', text: 'Ya Rabb, nimm unser Fasten, unser Gebet und unsere Duas an.', timestamp: Date.now() - 14 * D, ameenCount: 154, heartCount: 44 },
  { id: 'm20', text: 'اللهم إنك عفو تحب العفو فاعف عنا', timestamp: Date.now() - 21 * D, ameenCount: 231, heartCount: 69 },
];
