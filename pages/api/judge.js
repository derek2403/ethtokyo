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

    console.log('Judge API received:', { round3Responses, userQuestion });

    if (!round3Responses || !userQuestion) {
      console.log('Missing required fields:', { 
        hasRound3Responses: !!round3Responses, 
        hasUserQuestion: !!userQuestion,
        round3ResponsesKeys: round3Responses ? Object.keys(round3Responses) : 'none',
        userQuestionLength: userQuestion ? userQuestion.length : 'none'
      });
      return res.status(400).json({ error: 'round3Responses and userQuestion are required' });
    }

    // Check if round3Responses has the expected structure
    if (!round3Responses.ai1 || !round3Responses.ai2 || !round3Responses.ai3) {
      console.log('Invalid round3Responses structure:', round3Responses);
      return res.status(400).json({ error: 'round3Responses must contain ai1, ai2, and ai3 fields' });
    }

    const usedModel = 'gpt-4o-mini';

    // Judge AI system prompt
    const systemPrompt = {
      role: 'system',
      content: 'You are an AI Judge specializing in mental health consultation synthesis. Your role is to review the final recommendations from three mental health specialists and provide a clear, actionable, and comprehensive summary for the user. You should:\n\n1. Synthesize the key insights from all three specialists\n2. Identify common themes and areas of agreement\n3. Highlight important differences in approaches\n4. Provide a clear, actionable recommendation\n5. Include specific next steps and resources\n6. Maintain a supportive, empathetic tone\n7. Prioritize the user\'s safety and well-being\n\nBe concise but comprehensive, focusing on practical guidance that the user can implement.'
    };

    const judgePrompt = `Please review the following mental health consultation and provide a final summary recommendation:\n\n**User's Original Concern:**\n${userQuestion}\n\n**Final Recommendations from Specialists:**\n\nAI1 (Clinical Psychologist): ${round3Responses.ai1}\n\nAI2 (Psychiatrist): ${round3Responses.ai2}\n\nAI3 (Holistic Counselor): ${round3Responses.ai3}\n\nPlease provide a comprehensive final recommendation that synthesizes these perspectives and gives the user clear, actionable guidance.`;

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
