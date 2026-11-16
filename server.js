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

app.post('/api/translate', async (req, res) => {
  let { text, dari, ke } = req.body;
  try {
    // Google Translate gratis, support auto beneran
    // dari = auto juga boleh
    const sl = dari === 'auto' ? 'auto' : dari;
    // Google maunya zh-CN jadi zh-CN, tapi di endpoint ini pake zh-CN tetep jalan, kita map ke zh
    const tl = ke === 'zh-CN' ? 'zh-CN' : ke;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await r.json();

    // data[0] isinya potongan translate, kita gabungin
    let translated = '';
    if (Array.isArray(data[0])) {
      translated = data[0].map(part => part[0]).join('');
    }

    // data[2] itu bahasa yang kedetect sama Google
    let detectedCode = dari;
    if (data[2]) detectedCode = data[2];

    res.json({
      translated: translated,
      detected: LANG_NAMES[detectedCode] || detectedCode,
      detectedCode: detectedCode
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Translator jalan di port ' + PORT));
