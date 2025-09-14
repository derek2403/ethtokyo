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
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="p-4">
        <div className="flex gap-2 items-end">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-h-[2.5rem] max-h-20 resize-none"
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Button 
            onClick={handleSend} 
            disabled={!value.trim() || disabled}
            className="min-w-[60px]"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
