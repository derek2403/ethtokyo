// Expression system for triggering motions and emotion states
import { animationState } from './animationState.js';

// Available motion groups from hiyori_pro_jp.model3.json
const AVAILABLE_MOTIONS = [
  'Idle', 'Flick', 'FlickDown', 'FlickUp', 'Tap', 'Tap@Body', 'Flick@Body'
];

/**
 * Trigger an expression/motion on the Live2D model
 * @param {string} expressionName - Expression name (smile, surprised, etc.)
 * @param {object} model - Live2D model instance
 */
export function triggerExpression(expressionName, model) {
  // During mouth-only mode, suppress all motions/expressions
  if (animationState?.mouthOnlyMode) {
    return false;
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
        model.motion(motion);
        console.log(`Triggered motion: ${motion}`);
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
