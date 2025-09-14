import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const chatHistoryPath = path.join(logsDir, 'chat_history.json');
    if (!fs.existsSync(chatHistoryPath)) {
      return res.status(200).json({ sessions: [] });
    }
    const raw = fs.readFileSync(chatHistoryPath, 'utf8');
    const sessions = JSON.parse(raw);
    return res.status(200).json({ sessions });
  } catch (e) {
    console.error('Failed to read chat history:', e);
    return res.status(500).json({ error: 'Failed to read chat history' });
  }
}

