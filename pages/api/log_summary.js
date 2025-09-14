// pages/api/log_summary.js - Append a one-line simple summary log
import { appendSimpleLog } from '@/lib/serverLogger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { line } = req.body || {};
    if (!line || typeof line !== 'string') {
      return res.status(400).json({ error: 'line (string) is required' });
    }

    await appendSimpleLog(line);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Log Summary API error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
}
