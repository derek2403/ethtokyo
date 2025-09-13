"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Inline Card component (matches shadcn/ui patterns)
const Card = ({ className, children, ...props }) => (
  <div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm", className)} {...props}>
    {children}
  </div>
);

// Inline Textarea component
const Textarea = ({ className, ...props }) => (
  <textarea 
    className={cn("border-input bg-transparent px-3 py-2 text-sm border rounded-md focus-visible:ring-2 focus-visible:ring-ring", className)} 
    {...props} 
  />
);

export default function ChatPage() {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // References
  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add message function
  const addMessage = (text, isUser = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-open chat history when new message arrives
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure DOM is updated
    }
  }, [messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    addMessage(inputValue, true);
    setInputValue('');
    
    // Simple echo response for now
    setTimeout(() => {
      addMessage(`You said: "${inputValue}"`, false);
    }, 500);
  };

  // Demo stream function placeholder
  const startDemoStream = () => {
    addMessage("Demo stream starting...", false);
    // This will be implemented in Phase 5
  };

  return (
    <div className="h-screen w-screen relative bg-background text-foreground overflow-hidden">
      {/* Character Stage - Full screen minus chat input area */}
      <div className="absolute inset-0 bottom-20">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
      
      {/* Chat History Toggle Button */}
      <div className="absolute bottom-24 right-4 z-50">
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="rounded-full w-12 h-12 shadow-lg"
          size="icon"
          variant="outline"
        >
          {isChatOpen ? '⬇' : '⬆'}
        </Button>
      </div>
      
      {/* Chat History Panel - Slides up when opened */}
      <div className={`absolute bottom-20 left-0 right-0 z-40 transform transition-transform duration-300 ease-in-out ${
        isChatOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <Card className="h-64 mx-4 mb-2 flex flex-col shadow-2xl">
          {/* Chat Header */}
          <div className="px-4 py-2 border-b border-border">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Chat History</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startDemoStream}
                >
                  Demo Stream
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center">
                Your conversation history will appear here
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`text-sm ${msg.isUser ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-3 py-1 rounded-lg max-w-xs ${
                      msg.isUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {msg.text}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {msg.timestamp}
                    </div>
                  </div>
                ))}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </Card>
      </div>
      
      {/* Persistent Chat Input - Always visible at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Chat with your VTuber..."
              className="flex-1 min-h-[2.5rem] max-h-20 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
