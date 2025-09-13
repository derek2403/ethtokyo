// pages/api/ai2.js - AI Agent 2: The Scientist

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.REDPILL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing REDPILL_API_KEY in server environment' });
  }

  try {
    const { messages, model } = req.body || {};

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const usedModel = model || 'gpt-4o-mini';

    // Add system prompt for AI2 - The Psychiatrist
    const systemPrompt = {
      role: 'system',
      content: 'You are AI2, a board-certified Psychiatrist with expertise in neuropsychiatry, mood disorders, and psychopharmacology. You approach mental health with a medical perspective, considering neurobiological factors, medication management, and complex psychiatric conditions. You are thorough in considering differential diagnoses and treatment-resistant cases. You emphasize the importance of proper diagnosis, medication when appropriate, and comprehensive treatment planning. Keep responses professional, medically informed, and focused on evidence-based psychiatric care. Always provide detailed reasoning and consider biological interventions.'
    };

    const payloadMessages = Array.isArray(messages)
      ? [systemPrompt, ...messages]
      : [systemPrompt, { role: 'user', content: String(messages) }];

    const rpResp = await fetch('https://api.red-pill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: usedModel,
        messages: payloadMessages,
        temperature: 0.6,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text, ai: 'ai2' });
  } catch (err) {
    console.error('AI2 API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
