// Chat history panel with animation controls
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Chat history panel with control buttons
 * @param {object} props - Component properties
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {function} props.onToggle - Panel toggle handler
 * @param {array} props.messages - Array of chat messages
 */
const ChatHistory = ({ 
  isOpen, 
  onToggle, 
  messages = []
}) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);
  
  return (
    <div className="chat-history">
      <div className="chat-history-header">
        <h3 className="history-title">Chat History</h3>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            Your conversation history will appear here
          </div>
        ) : (
          <div className="message-list">
            {messages.map(msg => {
              const LinkRenderer = ({ href = '', children }) => {
                if (href && href.startsWith('copy:')) {
                  const toCopy = decodeURIComponent(href.slice(5));
                  return (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          navigator.clipboard?.writeText(toCopy);
                        } catch (_) {}
                      }}
                      className="underline hover:opacity-80"
                    >
                      {children}
                    </a>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                    {children}
                  </a>
                );
              };
              return (
                <div key={msg.id} className={`message ${msg.isUser ? 'user-message' : 'ai-message'}`}>
                  <div className="message-content">
                    <ReactMarkdown components={{ a: LinkRenderer }}>{msg.text}</ReactMarkdown>
                  </div>
                  <div className="message-timestamp">
                    {msg.timestamp}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-history {
          display: flex;
          flex-direction: column;
          height: 400px;
          color: white;
        }

        .chat-history-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .empty-state {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .message-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          max-width: 85%;
        }

        .user-message {
          align-self: flex-end;
          text-align: right;
        }

        .ai-message {
          align-self: flex-start;
        }

        .message-content {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
        }

        .user-message .message-content {
          background: rgba(255, 255, 255, 0.2);
        }

        .message-timestamp {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        /* Scrollbar styling */
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ChatHistory;
