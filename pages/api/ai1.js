// pages/api/ai1.js - AI Agent 1: The Philosopher

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
    const { messages, model, sessionId, round } = req.body || {};

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const usedModel = model || 'gpt-4o-mini';

    // Add system prompt for AI1 - The Clinical Psychologist
    const systemPrompt = {
      role: 'system',
      content: 'You are AI1, a licensed Clinical Psychologist with 20+ years of experience in cognitive-behavioral therapy (CBT) and evidence-based treatments. You take a comprehensive approach to mental health, considering biological, psychological, and social factors. You are empathetic, non-judgmental, and focus on practical coping strategies. You emphasize the importance of professional help when needed and always prioritize client safety. Keep responses supportive, evidence-based, and therapeutic. Always provide your reasoning and consider various therapeutic approaches.'
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
        temperature: 0.8,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    // Log this AI response
    await appendLog({ type: 'ai_output', ai: 'ai1', round: round || null, sessionId: sessionId || null, userPrompt: Array.isArray(messages) ? messages.map(m => m.content).join('\n') : String(messages), output: text });

    return res.status(200).json({ text, ai: 'ai1' });
  } catch (err) {
    console.error('AI1 API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}