import { useState } from 'react';

export default function DoctorChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const payload = { messages: [{ role: 'user', content: text }] };
      const resp = await fetch('/api/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Doctor API failed');
      const aiText = data?.text || '';
      setMessages((m) => [...m, { role: 'assistant', content: aiText }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold mb-3">Doctor Chat</h3>
      <div className="border rounded-md p-3 min-h-[120px] bg-white text-black dark:bg-neutral-900 dark:text-white">
        {messages.length === 0 ? (
          <div className="text-sm text-neutral-500">Ask a question to the doctor...</div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span className="text-xs text-neutral-500 mr-2">{m.role === 'user' ? 'You' : 'Doctor'}</span>
                <span>{m.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <textarea
          className="flex-1 border rounded p-2 min-h-[48px]"
          placeholder="Type your message and press Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={send}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
