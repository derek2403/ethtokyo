// Expression system for triggering motions and emotion states
import { animationState } from './animationState.js';

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

// Available motion groups from hiyori_pro_jp.model3.json
const AVAILABLE_MOTIONS = [
  'Idle', 'Flick', 'FlickDown', 'FlickUp', 'Tap', 'Tap@Body', 'Flick@Body'
];

/**
 * Trigger an expression/motion on the Live2D model
 * @param {string} expressionName - Expression name (smile, surprised, etc.)
 * @param {object} model - Live2D model instance
 * @param {boolean} force - Force trigger even during mouth-only mode
 */
export function triggerExpression(expressionName, model, force = false) {
  // During mouth-only mode, suppress all motions/expressions unless forced
  if (animationState?.mouthOnlyMode && !force) {
    console.log(`🚫 Motion ${expressionName} blocked by mouth-only mode`);
    return false;
  }
  
  // Try to get MotionPriority if not already available
  if (!MotionPriority && typeof window !== 'undefined') {
    try {
      MotionPriority = window.LIVE2DCUBISMFRAMEWORK?.MotionPriority || 
                       window.Live2DCubismFramework?.MotionPriority ||
                       window.MotionPriority;
    } catch (e) {
      console.log('MotionPriority still not available:', e.message);
    }
  }
  
  animationState.expressionTarget = expressionName;
  animationState.expressionTimer = 1000; // Hold expression for 1 second
  
  if (model?.motion) {
    try {
      // Map emotion names to actual motion group names (must match model3.json exactly)
      const motionMap = {
        'smile': 'Tap',
        'surprised': 'FlickUp', 
        'relaxed': 'Idle',
        'excited': 'Flick',
        'body_tap': 'Tap@Body',
        'flick_down': 'FlickDown',
        'flick_body': 'Flick@Body'
      };
      
      const motion = motionMap[expressionName] || expressionName;
      
      // Verify motion exists before triggering
      if (AVAILABLE_MOTIONS.includes(motion)) {
        // Use IDLE priority during mouth-only mode to prevent interference
        // Use NORMAL priority otherwise
        const priority = animationState.mouthOnlyMode ? 
          (MotionPriority?.IDLE || 0) : 
          (MotionPriority?.NORMAL || 1);
        
        if (MotionPriority && !animationState.mouthOnlyMode) {
          // Use priority system when available and not in mouth-only mode
          model.motion(motion, undefined, priority);
          console.log(`Triggered motion: ${motion} with priority: ${priority}`);
        } else {
          // Fallback to basic motion call
          model.motion(motion);
          console.log(`Triggered motion: ${motion} (basic)`);
        }
        return true;
      } else {
        console.warn(`Motion ${motion} not available. Available motions:`, AVAILABLE_MOTIONS);
        return false;
      }
    } catch (e) {
      console.warn(`Failed to trigger motion ${expressionName}:`, e);
      return false;
    }
  }
  
  console.warn('Model motion system not available');
  return false;
}

/**
 * Trigger expressions based on punctuation characters
 * @param {string} char - Character to analyze
 * @param {object} model - Live2D model instance
 */
export function triggerPunctuationExpression(char, model) {
  // During mouth-only mode, do not trigger punctuation expressions
  if (animationState?.mouthOnlyMode) {
    return false;
  }
  switch (char) {
    case '!':
      return triggerExpression('excited', model);
    case '?':
      return triggerExpression('surprised', model);
    case ',':
    case '.':
      return triggerExpression('relaxed', model);
    case '~':
      return triggerExpression('smile', model);
    default:
      return false;
  }
}

/**
 * Get list of available expressions
 * @returns {array} Array of expression names
 */
export function getAvailableExpressions() {
  return [
    'smile', 'surprised', 'relaxed', 'excited', 'body_tap', 
    'flick_down', 'flick_body', 'Idle', 'Flick', 'FlickUp', 'Tap'
  ];
}

/**
 * Get available Live2D motions for this model
 * @returns {array} Array of motion names
 */
export function getAvailableMotions() {
  return [...AVAILABLE_MOTIONS];
}
