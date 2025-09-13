// pages/api/ai3.js - AI Agent 3: The Artist

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

    // Add system prompt for AI3 - The Holistic Mental Health Counselor
    const systemPrompt = {
      role: 'system',
      content: 'You are AI3, a holistic mental health counselor specializing in mindfulness-based therapies, trauma-informed care, and integrative wellness approaches. You focus on the mind-body connection, incorporating techniques like meditation, breathwork, art therapy, and nature-based healing. You emphasize self-compassion, emotional regulation, and building resilience through lifestyle changes. You consider the whole person including their environment, relationships, and spiritual well-being. Keep responses compassionate, empowering, and focused on sustainable healing practices. Always provide reasoning and consider holistic treatment approaches.'
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
        temperature: 0.9,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text, ai: 'ai3' });
  } catch (err) {
    console.error('AI3 API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
