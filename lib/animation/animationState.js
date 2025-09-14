// Animation state management
// Global animation state that persists across re-renders
export const animationState = {
  // Eye blink
  eyeBlinkTimer: 0,
  eyeBlinkTarget: 1,
  eyeBlinkCurrent: 1,
  isBlinking: false,
  
  // Mouth animation - starts completely closed during idle
  mouthTarget: 0,
  mouthCurrent: 0,
  baseMouthOpen: 0,
  baseMouthForm: 0,
  
  // Head sway
  headSwayTime: 0,
  headAngleX: 0,
  headAngleY: 0,
  headAngleZ: 0,
  baseHeadAngleX: 0,
  baseHeadAngleY: 0,
  baseHeadAngleZ: 0,
  
  // Expression states
  expressionTarget: 'neutral',
  expressionTimer: 0,

  // Mouth-only mode (demo speech override)
  // When true: only mouth moves, all other animations are paused
  mouthOnlyMode: false,
  
  // Initialize flag
  initialized: false
};

// Initialize state from current model parameters to prevent fade-in issues
export function initializeAnimationState(model) {
  if (!animationState.initialized && model?.internalModel?.coreModel) {
    try {
      const core = model.internalModel.coreModel;
      const getters = ['getParameterValueById', 'getParamValue', 'getParameterValue'];
      const get = (id, fallback) => {
        for (const m of getters) {
          if (typeof core[m] === 'function') {
            try { return core[m](id); } catch {}
          }
        }
        return fallback;
      };
      animationState.eyeBlinkCurrent = get('ParamEyeLOpen', 1) ?? 1;
      animationState.baseMouthOpen = 0; // Always start with closed mouth during idle
      animationState.baseMouthForm = 0; // No mouth form during idle
      animationState.mouthCurrent = 0; // Ensure mouth starts closed
      animationState.baseHeadAngleX = get('ParamAngleX', 0) ?? 0;
      animationState.baseHeadAngleY = get('ParamAngleY', 0) ?? 0;
      animationState.baseHeadAngleZ = get('ParamAngleZ', 0) ?? 0;
      // Start deltas at 0 so we add on top of model's current pose
      animationState.headAngleX = 0;
      animationState.headAngleY = 0;
      animationState.headAngleZ = 0;
      animationState.initialized = true;
      console.log('Animation state initialized from model');
    } catch (e) {
      // Use defaults if parameter reading fails
      animationState.initialized = true;
      console.warn('Could not read model parameters for initialization:', e);
    }
  }
}

// Reset animation state (useful when enabling animations)
export function resetAnimationState(model) {
  animationState.initialized = false;
  initializeAnimationState(model);
}

// Linear interpolation helper
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
