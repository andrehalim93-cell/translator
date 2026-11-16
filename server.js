const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy translate biar gak kena CORS & bisa auto-detect
app.post('/api/translate', async (req, res) => {
  const { text, dari, ke } = req.body;
  try {
    // Kalau dari = auto, MyMemory bisa auto-detect
    const langpair = `${dari}|${ke}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const r = await fetch(url);
    const data = await r.json();
    
    // Deteksi bahasa hasil (buat auto-detect)
    let detected = dari;
    if (data.responseData && data.responseData.detectedLanguage) {
      detected = data.responseData.detectedLanguage;
    }

    res.json({
      translated: data.responseData?.translatedText || '',
      detected: detected,
      matches: data.matches || []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Translator jalan di port ' + PORT));