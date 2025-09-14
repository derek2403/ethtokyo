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
    const { JUDGE_SYSTEM_PROMPT_MINI, buildJudgePromptCompact } = await import('@/prompt_engineering/prompts');
    const systemPrompt = JUDGE_SYSTEM_PROMPT_MINI;
    const judgePrompt = buildJudgePromptCompact(userQuestion, round3Responses);

    // Debug: Log the prompts being sent
    console.log('🔍 Judge API - Received userQuestion:', userQuestion);
    console.log('🔍 Judge User Prompt:', judgePrompt);

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
        // Conservative cap to encourage brevity (~80–90 words ≈ 110–130 tokens)
        max_tokens: 140,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return res.status(rpResp.status).json({ error: `RedPill request failed: ${text}` });
    }

    const data = await rpResp.json();

    // Extract model text
    let text = data?.choices?.[0]?.message?.content ?? '';

    // Enforce a hard word-limit on server side to keep UI concise
    const HARD_WORD_LIMIT = 90; // target upper bound
    const sanitizeToSingleParagraph = (s) => s.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const truncateToWords = (s, limit) => {
      const words = s.split(/\s+/);
      if (words.length <= limit) return s;
      // Try to end at the last sentence boundary before the limit
      const clipped = words.slice(0, limit).join(' ');
      const lastPunct = clipped.lastIndexOf('.') > -1 ? clipped.lastIndexOf('.') :
                        (clipped.lastIndexOf('!') > -1 ? clipped.lastIndexOf('!') :
                        (clipped.lastIndexOf('?') > -1 ? clipped.lastIndexOf('?') : -1));
      if (lastPunct !== -1 && lastPunct > clipped.length * 0.6) {
        return clipped.slice(0, lastPunct + 1);
      }
      return clipped + '…';
    };

    text = sanitizeToSingleParagraph(text);
    text = truncateToWords(text, HARD_WORD_LIMIT);

    await appendLog({ type: 'judge_output', ai: 'judge', sessionId: sessionId || null, userQuestion, round3Responses, judgeText: text, ratings: { feelingToday: feelingToday ?? null, feelingBetter: feelingBetter ?? null } });

    return res.status(200).json({ text, ai: 'judge', color: 'bg-yellow-500' });
  } catch (err) {
    console.error('Judge API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
