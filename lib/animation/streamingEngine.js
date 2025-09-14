// Phase 5: Streaming Text Engine
// Real-time mouth sync system for streaming text input
import { animationState } from './animationState.js';
import { triggerPunctuationExpression } from './expressionSystem.js';

// Import MotionPriority from pixi-live2d-display if available
let MotionPriority = null;
if (typeof window !== 'undefined') {
  // Try to get MotionPriority from global scope when available
  try {
    MotionPriority = window.LIVE2DCUBISMFRAMEWORK?.MotionPriority;
  } catch (e) {
    console.log('MotionPriority not available yet, will retry when needed');
  }
}

// Streaming state management
let streamBuffer = '';
let currentWord = '';
let streamingActive = false;
let streamIntervalRef = null;
let currentModel = null; // Reference to Live2D model for expressions

/**
 * Initialize the streaming engine with a model reference
 * @param {object} model - Live2D model instance
 */
export function initializeStreamingEngine(model) {
  currentModel = model;
  console.log('Streaming engine initialized with model:', !!model);
  
  // Immediately expose global functions for testing
  if (typeof window !== 'undefined') {
    window.pushStreamChunk = pushStreamChunk;
    window.stopStreaming = stopStreaming;
    window.isStreamingActive = isStreaming;
    console.log('✅ Global streaming functions exposed: pushStreamChunk, stopStreaming, isStreamingActive');
    
    // Test function availability
    setTimeout(() => {
      const available = typeof window.pushStreamChunk === 'function';
      console.log('🎤 pushStreamChunk function test:', available ? '✅ Available' : '❌ Missing');
    }, 100);
  }
}

/**
 * Global function for external streaming - exposed to window
 * @param {string} chunk - Text chunk to process
 */
function pushStreamChunk(chunk) {
  if (!streamingActive) {
    console.warn('Streaming not active, chunk ignored:', chunk);
    return;
  }
  
  streamBuffer += chunk;
  processStreamBuffer();
}

/**
 * Start streaming mode
 */
export function startStreaming() {
  streamingActive = true;
  streamBuffer = '';
  currentWord = '';
  
  // Enable mouth-only mode to prevent other motions from interfering
  animationState.mouthOnlyMode = true;
  
  // Try to get MotionPriority if not already available
  if (!MotionPriority && typeof window !== 'undefined') {
    try {
      // Try different possible locations for MotionPriority
      MotionPriority = window.LIVE2DCUBISMFRAMEWORK?.MotionPriority || 
                       window.Live2DCubismFramework?.MotionPriority ||
                       window.MotionPriority;
      
      if (MotionPriority) {
        console.log('✅ MotionPriority found and loaded');
      }
    } catch (e) {
      console.log('MotionPriority still not available:', e.message);
    }
  }
  
  // Ensure global function is available
  if (typeof window !== 'undefined') {
    window.pushStreamChunk = pushStreamChunk;
    console.log('🎤 Streaming activated, global function ready');
  }
  
  console.log('🚀 Streaming engine started, active:', streamingActive, 'mouth-only mode:', animationState.mouthOnlyMode);
}

/**
 * Stop streaming mode and cleanup
 */
export function stopStreaming() {
  streamingActive = false;
  
  // Smooth mouth close
  animationState.mouthTarget = 0;
  
  // Disable mouth-only mode after streaming ends
  animationState.mouthOnlyMode = false;
  
  // Clear any pending intervals
  if (streamIntervalRef) {
    clearInterval(streamIntervalRef);
    streamIntervalRef = null;
  }
  
  // Remove global function
  if (typeof window !== 'undefined' && window.pushStreamChunk) {
    delete window.pushStreamChunk;
    console.log('Global pushStreamChunk function removed');
  }
}

/**
 * Process accumulated stream buffer with character-based mouth animation
 */
function processStreamBuffer() {
  if (!streamingActive || !streamBuffer) return;
  
  for (let char of streamBuffer) {
    processStreamCharacter(char);
  }
  
  streamBuffer = ''; // Clear processed buffer
}

/**
 * Process individual characters for mouth animation and expressions
 * @param {string} char - Single character to process
 */
function processStreamCharacter(char) {
  // Character-based mouth animation mapping (from vtuber_plan.md)
  if (/[aeiouAEIOU]/.test(char)) {
    // Vowel - wider mouth opening (increased for visibility)
    animationState.mouthTarget = 0.8;
    console.log(`🎤 Vowel '${char}' -> mouth: 0.8`);
    
  } else if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/.test(char)) {
    // Consonant - smaller mouth opening (increased for visibility)
    animationState.mouthTarget = 0.5;
    console.log(`🎤 Consonant '${char}' -> mouth: 0.5`);
    
  } else if (/[.,!?;:]/.test(char)) {
    // Punctuation - pause (mouth closed) + expression
    animationState.mouthTarget = 0;
    console.log(`🎤 Punctuation '${char}' -> mouth: 0 + expression`);
    
    // Quick expression triggers for punctuation
    if (currentModel) {
      triggerPunctuationExpression(char, currentModel);
    }
    
  } else if (/\s/.test(char)) {
    // Space - neutral position with slight opening for natural flow
    animationState.mouthTarget = 0.2;
    console.log(`🎤 Space -> mouth: 0.2`);
    
  } else {
    // Other characters (numbers, symbols) - neutral
    animationState.mouthTarget = 0;
    console.log(`🎤 Other '${char}' -> mouth: 0`);
  }
}

/**
 * Demo streaming function for testing
 * @param {string} text - Text to stream (optional, uses default if not provided)
 * @param {number} speed - Characters per second (default: 20)
 * @param {function} onComplete - Callback when streaming completes
 */
export function startDemoStream(text, speed = 20, onComplete = null) {
  // Stop any existing stream first to prevent multiple streams running
  if (streamingActive || streamIntervalRef) {
    console.log('Stopping existing stream before starting new demo');
    stopStreaming();
  }
  
  const demoText = text || "Hello! I'm your virtual assistant. How can I help you today? I can express emotions and respond naturally!";
  let index = 0;
  
  console.log('Starting demo stream:', { text: demoText, speed, length: demoText.length });
  
  // Enable mouth-only mode specifically for demo stream
  animationState.mouthOnlyMode = true;
  
  startStreaming();
  
  const charInterval = 1000 / speed; // Convert speed to milliseconds per character
  
  streamIntervalRef = setInterval(() => {
    // Double-check streaming is still active (in case it was stopped externally)
    if (!streamingActive) {
      console.log('Streaming was stopped externally, ending demo');
      clearInterval(streamIntervalRef);
      streamIntervalRef = null;
      if (onComplete) onComplete();
      return;
    }
    
    if (index >= demoText.length) {
      clearInterval(streamIntervalRef);
      streamIntervalRef = null;
      
      // Smooth close mouth after completion
      animationState.mouthTarget = 0;
      
      stopStreaming();
      console.log('Demo stream completed');
      
      if (onComplete) onComplete();
      return;
    }
    
    const char = demoText[index];
    pushStreamChunk(char);
    index++;
  }, charInterval);
}

/**
 * Stream text with custom timing patterns (more realistic speech)
 * @param {string} text - Text to stream
 * @param {object} options - Streaming options
 */
export function streamTextWithTiming(text, options = {}) {
  const {
    baseSpeed = 20, // Characters per second
    punctuationPause = 300, // Extra pause after punctuation (ms)
    wordPause = 50, // Pause between words (ms)
    onProgress = null, // Progress callback
    onComplete = null // Completion callback
  } = options;
  
  let index = 0;
  let nextDelay = 1000 / baseSpeed;
  
  console.log('Starting timed text stream:', { text, options });
  
  startStreaming();
  
  function processNextCharacter() {
    if (index >= text.length) {
      animationState.mouthTarget = 0;
      stopStreaming();
      console.log('Timed text stream completed');
      if (onComplete) onComplete();
      return;
    }
    
    const char = text[index];
    pushStreamChunk(char);
    
    // Calculate next delay based on character type
    if (/[.,!?;:]/.test(char)) {
      nextDelay = punctuationPause; // Longer pause after punctuation
    } else if (/\s/.test(char)) {
      nextDelay = wordPause; // Short pause between words
    } else {
      nextDelay = 1000 / baseSpeed; // Normal speed
    }
    
    if (onProgress) {
      onProgress(index + 1, text.length, char);
    }
    
    index++;
    setTimeout(processNextCharacter, nextDelay);
  }
  
  processNextCharacter();
}

/**
 * Check if streaming is currently active
 * @returns {boolean} True if streaming is active
 */
export function isStreaming() {
  return streamingActive;
}

/**
 * Get current stream buffer (for debugging)
 * @returns {string} Current buffer content
 */
export function getStreamBuffer() {
  return streamBuffer;
}

/**
 * Cleanup function for component unmount
 */
export function cleanup() {
  stopStreaming();
  currentModel = null;
  console.log('Streaming engine cleanup completed');
}
