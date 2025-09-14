import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, messages, feelingRating } = req.body;
    
    if (!sessionId || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create chat history file path
    const chatHistoryPath = path.join(logsDir, 'chat_history.json');
    
    // Read existing chat history or create new structure
    let chatHistory = [];
    if (fs.existsSync(chatHistoryPath)) {
      try {
        const existingData = fs.readFileSync(chatHistoryPath, 'utf8');
        chatHistory = JSON.parse(existingData);
      } catch (e) {
        console.warn('Could not parse existing chat history, starting fresh');
        chatHistory = [];
      }
    }

    // Create new chat session entry
    const chatSession = {
      sessionId,
      date: new Date().toISOString(),
      timestamp: new Date().toLocaleString(),
      feelingRating: feelingRating || null,
      messages: messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        speaker: msg.speaker || (msg.isUser ? 'user' : 'ai'),
        round: msg.round || null
      })),
      messageCount: messages.length
    };

    // Add new session to history
    chatHistory.push(chatSession);

    // Keep only the last 100 sessions to prevent file from growing too large
    if (chatHistory.length > 100) {
      chatHistory = chatHistory.slice(-100);
    }

    // Write updated history to file
    fs.writeFileSync(chatHistoryPath, JSON.stringify(chatHistory, null, 2));

    console.log(`Chat history stored: Session ${sessionId} with ${messages.length} messages`);

    res.status(200).json({ 
      success: true, 
      message: 'Chat history stored successfully',
      sessionId,
      messageCount: messages.length
    });

  } catch (error) {
    console.error('Error storing chat history:', error);
    res.status(500).json({ error: 'Failed to store chat history' });
  }
}
