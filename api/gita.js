// Vercel Serverless Function — /api/gita
// Deploy on Vercel, set GEMINI_API_KEY in Environment Variables
// Google Sheets ID set in GSHEET_ID env variable

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q = '', lang = 'hi' } = req.query;
  if (!q) return res.status(400).json({ error: 'No query' });

  const GEMINI_KEY = 'AQ.Ab8RN6Ixi_DWfAyxHmbnxT3p0-Fn_9Vb0mNhYoPFQkC52nodGA';
  const SHEET_ID   = '10LezhJKrVdErVJEXy9r7RCePrhh20O5licGjTKBAbwo';

  // 1️⃣ Fetch data from Google Sheets (published CSV)
  let sheetData = '';
  if (SHEET_ID) {
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
      const sr = await fetch(sheetUrl);
      sheetData = await sr.text();
    } catch(e) { sheetData = ''; }
  }

  // 2️⃣ Ask Gemini to match the question to best shloka from sheet
  const prompt = `
You are a Bhagavad Gita expert assistant.
${sheetData ? `Here is a Google Sheet with shlokas, meanings and examples:\n${sheetData.substring(0,3000)}\n\n` : ''}
User's problem: "${q}"
Language preference: ${lang === 'hi' ? 'Hindi' : 'English'}
Pick the most relevant shloka topic key from this list ONLY: overthinking, stress
Return ONLY a JSON object like: {"topic": "stress"}
If no match, return: {"topic": null}
No explanation, no markdown, just JSON.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 60 }
        })
      }
    );
    const gData = await geminiRes.json();
    const raw = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(200).json({ topic: null });
  }
}
