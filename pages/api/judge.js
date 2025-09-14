// pages/api/judge.js - AI Judge for Final Mental Health Recommendation

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
    const { round3Responses, userQuestion, sessionId, feelingToday, feelingBetter } = req.body || {};

    if (!round3Responses || !userQuestion) {
      return res.status(400).json({ error: 'round3Responses and userQuestion are required' });
    }
    if (!round3Responses.ai1 || !round3Responses.ai2 || !round3Responses.ai3) {
      return res.status(400).json({ error: 'round3Responses must contain ai1, ai2, and ai3 fields' });
    }

    const usedModel = 'gpt-4o-mini';

    // Centralized judge prompts
    const { JUDGE_SYSTEM_PROMPT, buildJudgePrompt } = await import('@/prompt_enginnering/prompts');
    const systemPrompt = JUDGE_SYSTEM_PROMPT;
    const judgePrompt = buildJudgePrompt(userQuestion, round3Responses);

    const payloadMessages = [systemPrompt, { role: 'user', content: judgePrompt }];

    const rpResp = await fetch('https://api.red-pill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: usedModel,
        messages: payloadMessages,
        temperature: 0.7,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    await appendLog({ type: 'judge_output', ai: 'judge', sessionId: sessionId || null, userQuestion, round3Responses, judgeText: text, ratings: { feelingToday: feelingToday ?? null, feelingBetter: feelingBetter ?? null } });

    return res.status(200).json({ text, ai: 'judge', color: 'bg-yellow-500' });
  } catch (err) {
    console.error('Judge API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
