// pages/api/doctor.js - Doctor AI (same config as AI1)

import { appendLog } from '@/lib/serverLogger';

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
    const { messages, model, sessionId } = req.body || {};

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const usedModel = model || 'gpt-4o-mini';

    // Centralized system prompt (use AI1's configuration)
    const { SYSTEM_PROMPTS } = await import('@/prompt_engineering/prompts');
    const systemPrompt = SYSTEM_PROMPTS.ai1;

    // Reinforcement context from previous simple logs (if available)
    const { buildReinforcementSystemMessage } = await import('@/lib/reinforcementContext');
    const reinforcementMsg = await buildReinforcementSystemMessage();

    const payloadMessages = Array.isArray(messages)
      ? [systemPrompt, ...(reinforcementMsg ? [reinforcementMsg] : []), ...messages]
      : [systemPrompt, ...(reinforcementMsg ? [reinforcementMsg] : []), { role: 'user', content: String(messages) }];

    const rpResp = await fetch('https://api.red-pill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: usedModel,
        messages: payloadMessages,
        temperature: 0.8,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    await appendLog({
      type: 'ai_output',
      ai: 'doctor',
      round: null,
      sessionId: sessionId || null,
      userPrompt: Array.isArray(messages) ? messages.map(m => m.content).join('\n') : String(messages),
      output: text,
    });

    return res.status(200).json({ text, ai: 'doctor' });
  } catch (err) {
    console.error('Doctor API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
