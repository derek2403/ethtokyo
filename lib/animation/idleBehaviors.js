// Idle behaviors - natural eye blinking and head sway
import { initializeAnimationState } from './animationState.js';

/**
 * Update idle behaviors like eye blinking and head sway
 * @param {number} deltaMS - Time elapsed since last frame in milliseconds
 * @param {object} state - Animation state object
 * @param {object} model - Live2D model instance (optional, for initialization)
 */
export function updateIdleBehaviors(deltaMS, state, model) {
  // Initialize state from current model parameters if not done
  initializeAnimationState(model);
  
  // Natural eye blink every 3-5 seconds
  state.eyeBlinkTimer += deltaMS;
  if (state.eyeBlinkTimer > (3000 + Math.random() * 2000)) {
    state.eyeBlinkTimer = 0;
    if (!state.isBlinking) {
      triggerEyeBlink(state);
    }
  }
  
  // Smooth head sway - very subtle for natural movement
  state.headSwayTime += deltaMS * 0.001;
  state.headAngleX = Math.sin(state.headSwayTime * 0.4) * 1.5; // ±1.5 degrees
  state.headAngleY = Math.cos(state.headSwayTime * 0.25) * 0.8; // ±0.8 degrees 
  state.headAngleZ = Math.sin(state.headSwayTime * 0.6) * 0.5; // ±0.5 degrees
}

/**
 * Trigger a natural eye blink animation
 * @param {object} state - Animation state object
 */
export function triggerEyeBlink(state) {
  state.isBlinking = true;
  state.eyeBlinkTarget = 0; // Close eyes
  
  // Quick blink - reopen eyes after 150ms
  setTimeout(() => {
    state.eyeBlinkTarget = 1; // Open eyes
    setTimeout(() => { 
      state.isBlinking = false; 
    }, 100);
  }, 150);
}

/**
 * Update animation parameter transitions with smooth interpolation
 * @param {number} deltaMS - Time elapsed since last frame
 * @param {object} state - Animation state object
 */
export function updateAnimationTransitions(deltaMS, state) {
  // Fast, natural eye blink transitions
  const eyeBlinkSpeed = state.isBlinking ? 0.15 : 0.08;
  state.eyeBlinkCurrent = lerp(
    state.eyeBlinkCurrent, 
    state.eyeBlinkTarget, 
    deltaMS * eyeBlinkSpeed
  );
  
  // Smooth mouth movement transitions (faster for streaming)
  const prevMouth = state.mouthCurrent;
  state.mouthCurrent = lerp(
    state.mouthCurrent,
    state.mouthTarget,
    deltaMS * 0.02 // slightly slower to avoid popping/cancelling by motions
  );
  
  // Debug mouth changes
  if (Math.abs(state.mouthCurrent - prevMouth) > 0.01) {
    console.log(`👄 Mouth transition: ${prevMouth.toFixed(3)} -> ${state.mouthCurrent.toFixed(3)} (target: ${state.mouthTarget.toFixed(3)})`);
  }
}

// Linear interpolation helper (duplicated here for module independence)
function lerp(a, b, t) {
  return a + (b - a) * t;
}
