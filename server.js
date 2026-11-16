const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LANG_NAMES = {
  'id': 'Indonesia', 'en': 'Inggris', 'zh-CN': 'Mandarin',
  'ja': 'Jepang', 'ko': 'Korea', 'es': 'Spanyol', 'fr': 'Perancis', 'ru': 'Rusia', 'auto': 'Auto'
};

async function translateGoogle(text, dari, ke) {
  const sl = dari === 'auto' ? 'auto' : dari;
  const tl = ke;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await r.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google gagal');
  const translated = data[0].map(p => p && p[0] ? p[0] : '').join('');
  const detected = data[2] || dari;
  return { translated, detected };
}

async function translateMyMemory(text, dari, ke) {
  // MyMemory gak support auto, jadi kita tebak kasar aja
  let src = dari;
  if (src === 'auto') {
    if (/[\u4E00-\u9FFF]/.test(text)) src = 'zh-CN';
    else if (/[\u3040-\u30FF]/.test(text)) src = 'ja';
    else if (/[\uAC00-\uD7AF]/.test(text)) src = 'ko';
    else if (/\b(saya|aku|mau|pergi|kerja|kantor|makan|pasar)\b/i.test(text)) src = 'id';
    else src = 'en';
  }
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${ke}`;
  const r = await fetch(url);
  const data = await r.json();
  return { translated: data.responseData?.translatedText || '', detected: src };
}

app.post('/api/translate', async (req, res) => {
  const { text, dari, ke } = req.body;
  try {
    let result;
    try {
      result = await translateGoogle(text, dari, ke);
    } catch (e) {
      console.log('Google gagal, pindah ke MyMemory:', e.message);
      result = await translateMyMemory(text, dari, ke);
    }
    res.json({
      translated: result.translated || '',
      detected: LANG_NAMES[result.detected] || result.detected,
      detectedCode: result.detected
    });
  } catch (e) {
    res.status(500).json({ error: e.message, translated: '' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Translator jalan di port ' + PORT));
