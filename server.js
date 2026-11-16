const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== TAMBAHAN BARU: HEALTH CHECK =====
// Ini doang yang baru, sisanya sama kayak punya lu
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

const LANG_NAMES = {
  'id': 'Indonesia', 'en': 'Inggris', 'zh-CN': 'Mandarin',
  'ja': 'Jepang', 'ko': 'Korea', 'es': 'Spanyol', 'fr': 'Perancis', 'ru': 'Rusia', 'auto': 'Auto'
};

function isBad(text) {
  if (!text) return true;
  return text.toUpperCase().includes('MYMEMORY WARNING') || text.toUpperCase().includes('YOU USED ALL');
}

async function translateGoogle(text, dari, ke) {
  const sl = dari === 'auto' ? 'auto' : dari;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${ke}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await r.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('Google gagal');
  const translated = data[0].map(p => p && p[0] ? p[0] : '').join('');
  if (isBad(translated)) throw new Error('Google bad');
  return { translated, detected: data[2] || dari };
}

async function translateLibre(text, dari, ke) {
  const mapLang = (l) => {
    if (l === 'auto') return 'auto';
    if (l === 'zh-CN') return 'zh';
    return l;
  };
  const r = await fetch('https://translate.argosopentech.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: mapLang(dari), target: mapLang(ke), format: 'text' })
  });
  const data = await r.json();
  if (!data.translatedText || isBad(data.translatedText)) throw new Error('Libre gagal');
  return { translated: data.translatedText, detected: dari };
}

async function translateMyMemory(text, dari, ke) {
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
  const translated = data.responseData?.translatedText || '';
  if (isBad(translated)) throw new Error('MyMemory limit habis');
  return { translated, detected: src };
}

app.post('/api/translate', async (req, res) => {
  const { text, dari, ke } = req.body;
  const methods = [translateGoogle, translateLibre, translateMyMemory];
  let lastError = 'Semua API gagal';
  for (const fn of methods) {
    try {
      const result = await fn(text, dari, ke);
      if (result.translated) {
        return res.json({
          translated: result.translated,
          detected: LANG_NAMES[result.detected] || result.detected,
          detectedCode: result.detected
        });
      }
    } catch (e) {
      console.log(fn.name, 'gagal:', e.message);
      lastError = e.message;
    }
  }
  res.status(500).json({ error: lastError, translated: '' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Translator jalan di port ' + PORT));
