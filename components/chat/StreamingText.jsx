// Streaming text display component - shows text being typed in real-time
import React, { useState, useEffect } from 'react';

/**
 * Streaming text display that shows characters appearing one by one
 * @param {object} props - Component properties
 * @param {string} props.text - Text to display
 * @param {number} props.speed - Characters per second (default: 20)
 * @param {boolean} props.isStreaming - Whether currently streaming
 * @param {function} props.onComplete - Callback when streaming completes
 * @param {string} props.className - Additional CSS classes
 */
const StreamingText = ({ 
  text = '', 
  speed = 20, 
  isStreaming = false, 
  onComplete = null,
  className = '' 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset when new text starts streaming
  useEffect(() => {
    if (isStreaming && text) {
      setDisplayedText('');
      setCurrentIndex(0);
    }
  }, [text, isStreaming]);

  // Handle character-by-character display
  useEffect(() => {
    if (!isStreaming || !text || currentIndex >= text.length) {
      if (currentIndex >= text.length && onComplete) {
        onComplete();
      }
      return;
    }

    const charInterval = 1000 / speed;
    
    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + text[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, charInterval);

    return () => clearTimeout(timer);
  }, [currentIndex, isStreaming, text, speed, onComplete]);

  if (!text && !displayedText) return null;

  return (
    <div className={`font-mono text-sm p-2 bg-black/20 rounded ${className}`}>
      <div className="text-xs text-muted-foreground mb-1">🎤 Streaming:</div>
      <div className="text-foreground">
        {displayedText}
        {isStreaming && currentIndex < text.length && (
          <span className="animate-pulse">|</span>
        )}
      </div>
      {!isStreaming && displayedText && (
        <div className="text-xs text-green-400 mt-1">✅ Complete</div>
      )}
    </div>
  );
};

export default StreamingText;
