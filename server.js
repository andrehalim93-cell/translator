const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tebak bahasa sendiri, karena MyMemory gak support "auto"
function detectLang(text) {
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN'; // Mandarin
  if (/[\u3040-\u30FF]/.test(text)) return 'ja'; // Jepang Hiragana/Katakana
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korea Hangul
  if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Rusia
  if (/[\u00E0-\u00FF\u00C0-\u00DF]/.test(text) && /\b(je|tu|vous|les|des|pour|avec)\b/i.test(text)) return 'fr';
  if (/\b(soy|estoy|quiero|gracias|hola|por favor)\b/i.test(text)) return 'es';

  // Indonesia - cek kata khas Indo
  if (/\b(saya|aku|kamu|dia|mereka|kita|mau|pergi|kerja|kantor|makan|tidur|rumah|tidak|nggak|udah|lagi|bisa|tolong|terima|kasih|selamat|apa|siapa|dimana|kapan|kenapa|bagaimana|dan|yang|itu|ini|dari|ke|di)\b/i.test(text)) return 'id';

  // Default Inggris
  return 'en';
}

const LANG_NAMES = {
  'id': 'Indonesia', 'en': 'Inggris', 'zh-CN': 'Mandarin',
  'ja': 'Jepang', 'ko': 'Korea', 'es': 'Spanyol', 'fr': 'Perancis', 'ru': 'Rusia'
};

app.post('/api/translate', async (req, res) => {
  let { text, dari, ke } = req.body;
  try {
    // Kalau auto, tebak dulu
    let detectedCode = dari;
    if (dari === 'auto') {
      detectedCode = detectLang(text);
    }

    const langpair = `${detectedCode}|${ke}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const r = await fetch(url);
    const data = await r.json();
    
    res.json({
      translated: data.responseData?.translatedText || '',
      detected: LANG_NAMES[detectedCode] || detectedCode,
      detectedCode: detectedCode
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Translator jalan di port ' + PORT));
