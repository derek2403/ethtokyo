// pages/api/book_summary.js - Generate AI daily summary for Book page
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REDPILL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing REDPILL_API_KEY in server environment' });
  }

  try {
    // Load chat history from logs
    const logsDir = path.join(process.cwd(), 'logs');
    const chatHistoryPath = path.join(logsDir, 'chat_history.json');
    let sessions = [];
    if (fs.existsSync(chatHistoryPath)) {
      const raw = fs.readFileSync(chatHistoryPath, 'utf8');
      sessions = JSON.parse(raw);
    }

    // Gather today's sessions or fallback to the most recent one
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const todays = sessions.filter(s => {
      const d = new Date(s.date || s.timestamp || 0);
      return d >= start && d < end;
    });
    const selected = todays.length ? todays : (sessions.length ? [sessions[sessions.length - 1]] : []);

    // Build a concise transcript
    const transcript = selected
      .flatMap(s => (s.messages || []))
      .slice(-12) // last few messages for context
      .map(m => `${m.isUser ? 'User' : 'Companion'}: ${m.text}`)
      .join('\n');

    const systemPrompt = {
      role: 'system',
      content:
        'You are a warm, supportive diary ghostwriter. Summarize the day based on a short transcript into a single friendly paragraph (70–110 words). Be specific, gentle, and optimistic without clichés. Include 1 concrete positive step taken or planned. No emojis. Output plain text only.'
    };

    const userPrompt = {
      role: 'user',
      content:
        `Create a concise daily memory summary for a keepsake book.\n\nTranscript:\n${transcript || '(no messages recorded today)'}\n\nWrite the summary now:`
    };

    const rpResp = await fetch('https://api.red-pill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemPrompt, userPrompt],
        temperature: 0.6,
        max_tokens: 220,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    let summary = data?.choices?.[0]?.message?.content ?? '';
    // Normalize and softly cap to ~110 words
    summary = summary.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const words = summary.split(/\s+/);
    if (words.length > 110) summary = words.slice(0, 110).join(' ') + '…';

    return res.status(200).json({ summary });
  } catch (err) {
    console.error('Book summary API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}

