// pages/api/redpill-proxy.js

// RedPill Chat Completions API proxy (JavaScript)
// Expects: { messages: [{role, content}], model?: string }
// Env: REDPILL_API_KEY

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
  
      // Default to gpt-4o-mini as requested
      const usedModel = model || 'gpt-4o-mini';
  
      // Ensure we send an array of messages per RedPill's chat completions format
      const payloadMessages = Array.isArray(messages)
        ? messages
        : [{ role: 'user', content: String(messages) }];
  
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
      return res.status(200).json({ text });
    } catch (err) {
      console.error('RedPill API error:', err);
      return res.status(500).json({ error: err?.message || 'Unknown error' });
    }
  }
  