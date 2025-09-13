// Chat history panel with animation controls
import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

/**
 * Chat history panel with control buttons
 * @param {object} props - Component properties
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {function} props.onToggle - Panel toggle handler
 * @param {array} props.messages - Array of chat messages
 * @param {function} props.onDemoStream - Demo stream trigger
 * @param {function} props.onExpression - Expression test trigger
 * @param {boolean} props.animationsEnabled - Animation status
 * @param {function} props.onToggleAnimations - Animation toggle handler
 * @param {function} props.onMouthTest - Manual mouth test handler
 */
const ChatHistory = ({ 
  isOpen, 
  onToggle, 
  messages = [], 
  onDemoStream, 
  onExpression, 
  animationsEnabled = false, 
  onToggleAnimations,
  onMouthTest
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
  
  const handleExpressionTest = (expression) => {
    if (onExpression) {
      onExpression(expression);
    }
  };
  
  return (
    <>
      {/* Toggle Button */}
      <div className="absolute bottom-24 right-4 z-50">
        <Button
          onClick={onToggle}
          className="rounded-full w-12 h-12 shadow-lg"
          size="icon"
          variant="outline"
        >
          {isOpen ? '⬇' : '⬆'}
        </Button>
      </div>
      
      {/* History Panel - Slides up when opened */}
      <div className={`absolute bottom-20 left-0 right-0 z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <Card className="h-64 mx-4 mb-2 flex flex-col shadow-2xl">
          {/* Header with Controls */}
          <CardHeader className="py-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Chat History</h3>
              <div className="flex gap-2 flex-wrap">
                {/* Demo Stream Button */}
                {onDemoStream && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onDemoStream}
                    title="Test streaming text animation"
                  >
                    Demo Stream
                  </Button>
                )}
                
                {/* Expression Test Buttons */}
                {onExpression && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExpressionTest('smile')}
                      title="Test smile expression"
                    >
                      😊
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExpressionTest('surprised')}
                      title="Test surprised expression"
                    >
                      😲
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExpressionTest('relaxed')}
                      title="Test relaxed expression"
                    >
                      😌
                    </Button>
                  </>
                )}
                
                {/* Animation Toggle */}
                {onToggleAnimations && (
                  <Button 
                    variant={animationsEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleAnimations}
                    title={`${animationsEnabled ? 'Disable' : 'Enable'} animations`}
                  >
                    {animationsEnabled ? 'Stop' : 'Animate'}
                  </Button>
                )}
                
                {/* Mouth Test Button */}
                {onMouthTest && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={onMouthTest}
                    title="Test mouth movement manually"
                  >
                    👄 Test
                  </Button>
                )}
                
                {/* Stop Streaming Button (emergency stop) */}
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.stopStreaming) {
                      window.stopStreaming();
                      console.log('🛑 Emergency stop triggered');
                    }
                  }}
                  title="Stop all streaming/animation"
                >
                  🛑 Stop
                </Button>
                
                {/* Close Button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onToggle}
                  title="Close chat history"
                >
                  ✕
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center">
                Your conversation history will appear here
              </div>
            ) : (
              <div className="space-y-2">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ChatHistory;
