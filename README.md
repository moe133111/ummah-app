# 🕌 Ummah App — SDK 54

Dein täglicher islamischer Begleiter.

## Setup (Windows, Mac oder Linux)

### Voraussetzungen
- **Node.js 20+** → [nodejs.org](https://nodejs.org) (LTS Version)
- **Expo Go** App auf dem Handy (App Store / Play Store)

### Schritt für Schritt

```bash
# 1. In den Ordner navigieren
cd ummah-app

# 2. Dependencies installieren
npm install --legacy-peer-deps

# 3. Dev-Server starten
npx expo start
```

4. QR-Code mit **Expo Go** auf dem Handy scannen
5. Handy und PC müssen im **selben WLAN** sein

### Falls WLAN Probleme macht:
```bash
npx expo start --tunnel
```

## Projektstruktur

```
ummah-app/
├── app/                          # Screens (Expo Router)
│   ├── (tabs)/                   # 5 Tab-Screens
│   │   ├── index.jsx             # Home: Gebetszeiten + Tracker
│   │   ├── quran.jsx             # Quran: Suren-Liste
│   │   ├── duas.jsx              # Duas: Bittgebete
│   │   ├── discover.jsx          # Dhikr-Zähler, Kalender, Hadith
│   │   └── more.jsx              # Qibla, Einstellungen, Über
│   ├── quran/[surah].jsx         # Surah-Detail
│   └── _layout.jsx               # Root Layout + Providers
├── components/ui/Card.jsx        # Wiederverwendbare Card
├── features/
│   ├── prayer/prayerCalculation.js  # Gebetszeiten (offline)
│   ├── quran/surahData.js        # 114 Suren Metadaten
│   └── duas/duaData.js           # 11 Duas
├── hooks/
│   ├── useAppStore.js            # Zustand Store
│   └── useLocation.js            # GPS Hook
├── lib/supabase.js               # Supabase Client
└── constants/theme.js            # Farben, Fonts, Spacing
```

## Tech-Stack
- **Expo SDK 54** + React Native 0.81
- **Expo Router** (file-based Navigation)
- **Zustand** (App State) + **React Query** (API Calls)
- **Supabase** (Backend, später)
