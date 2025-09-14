// Chat input component with send functionality
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Chat input component for user messages
 * @param {object} props - Component properties
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Input change handler
 * @param {function} props.onSend - Send message handler
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.disabled - Whether input is disabled
 */
const ChatInput = ({ 
  value, 
  onChange, 
  onSend, 
  placeholder = "Chat with your VTuber...", 
  disabled = false 
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
  };
  
  return (
    <>
      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="input-container">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="text-input"
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
            <Button 
              onClick={handleSend} 
              disabled={!value.trim() || disabled}
              className="submit-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chat-input-container {
          position: absolute;
          bottom: 32px;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          justify-content: center;
          padding: 0 16px;
        }

        .input-wrapper {
          width: 100%;
          max-width: 500px;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50px;
          padding: 4px;
          transition: all 0.3s ease;
        }

        .input-container:focus-within {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
        }

        :global(.text-input) {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 16px 24px;
          font-size: 16px;
          color: white;
          min-height: 48px;
          max-height: 80px;
          resize: none;
        }

        :global(.text-input::placeholder) {
          color: rgba(255, 255, 255, 0.7);
        }

        :global(.submit-button) {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-right: 4px;
        }

        :global(.submit-button:hover) {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        :global(.submit-button:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
};

export default ChatInput;
