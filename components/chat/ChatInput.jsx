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
  const fileInputRef = React.useRef(null);
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

  const handleAttachClick = () => {
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    // Front-end only: no upload — for now we just clear the selection
    // and could optionally surface a UI hook later.
    // Reset the input so selecting the same file again still triggers change.
    e.target.value = '';
  };
  
  return (
    <>
      <div className="chat-input-container">
        <div className="input-wrapper">
          <div className="input-container">
            {/* Left circle: plus/attach button (front-end only) */}
            <Button 
              type="button"
              onClick={handleAttachClick}
              disabled={disabled}
              className="attach-button"
              aria-label={disabled ? 'Uploader disabled' : 'Attach document'}
              title={disabled ? 'Waiting for reply' : 'Attach'}
            >
              {/* Plus icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </Button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.csv,.json"
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />
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
              aria-label={disabled ? 'Waiting for reply' : 'Send message'}
              title={disabled ? 'Waiting for reply' : 'Send'}
            >
              {disabled ? (
                // Loading spinner while waiting for reply
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                // Send arrow icon
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
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

        :global(.attach-button) {
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
          margin-left: 4px;
          margin-right: 8px;
        }

        :global(.submit-button:hover),
        :global(.attach-button:hover) {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        :global(.submit-button:disabled),
        :global(.attach-button:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading spinner animation */
        .spinner {
          display: inline-block;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default ChatInput;
