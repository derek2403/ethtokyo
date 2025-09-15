import React, { useEffect, useState } from 'react';

export default function ThinkingIndicator({ text = 'Chotto matte! Kaigan is thinking' }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setShow(s => !s), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="thinking-indicator">
      <span className="thinking-text" style={{ opacity: show ? 1 : 0.9 }}>{text}</span>
      <span className="dots" aria-hidden>
        <span className="dot dot1" />
        <span className="dot dot2" />
        <span className="dot dot3" />
      </span>
      <style jsx>{`
        .thinking-indicator { display: inline-flex; align-items: center; }
        .thinking-text { transition: opacity 0.4s ease; }
        .dots { display: inline-flex; gap: 4px; margin-left: 8px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.3; animation: dotPulse 1.2s ease-in-out infinite; }
        .dot2 { animation-delay: 0.2s; }
        .dot3 { animation-delay: 0.4s; }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

