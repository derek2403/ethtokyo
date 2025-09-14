// pages/api/log.js - Generic event logger
import { appendLog } from '@/lib/serverLogger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, event, data } = req.body || {};
    if (!sessionId || !event) {
      return res.status(400).json({ error: 'sessionId and event are required' });
    }

    await appendLog({ type: 'event', sessionId, event, data: data ?? null });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Log API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
