import { memo } from 'react';
import { Platform } from 'react-native';
import WebView from 'react-native-webview';

/**
 * Renders an Arabic surah name in beautiful Aref Ruqaa calligraphy font
 * using a WebView to load Google Fonts, bypassing native font limitations.
 */
function SurahCalligraphy({ name, width = 120, height = 50, color = '#E8E0D4', fontSize = 32 }) {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  display:flex;align-items:center;justify-content:center;
  height:100vh;width:100vw;background:transparent;overflow:hidden;
}
p{
  font-family:'Aref Ruqaa',serif;
  font-size:${fontSize}px;font-weight:700;
  color:${color};margin:0;
  text-align:center;direction:rtl;
  white-space:nowrap;
  line-height:1.4;
}
</style>
</head>
<body><p>${name}</p></body>
</html>`;

  return (
    <WebView
      source={{ html }}
      style={{ width, height, backgroundColor: 'transparent', opacity: 0.99 }}
      scrollEnabled={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      pointerEvents="none"
      javaScriptEnabled={false}
      originWhitelist={['*']}
      {...(Platform.OS === 'android' ? { androidLayerType: 'software' } : {})}
    />
  );
}

export default memo(SurahCalligraphy);
