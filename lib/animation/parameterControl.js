// Live2D parameter control functions
// Handle setting model parameters safely with error handling

/**
 * Set a Live2D model parameter value
 * @param {string} paramName - The parameter name (e.g., 'ParamMouthOpenY')
 * @param {number} value - The parameter value (usually 0-1 range)
 * @param {object} model - The Live2D model instance
 * @param {number} weight - Parameter weight for blending (default: 1)
 */
export function setModelParameter(paramName, value, model, weight = 1) {
  if (model?.internalModel?.coreModel) {
    try {
      const core = model.internalModel.coreModel;
      
      // Clamp values based on parameter type
      const name = String(paramName).toLowerCase();
      let clampedValue = value;
      if (name.includes('mouth') || name.includes('eye')) {
        // Typical 0..1 range for eyes/mouth
        clampedValue = Math.max(0, Math.min(1, value));
      } else if (name.includes('angle')) {
        // Angles are usually in degrees, roughly -45..45 is safe
        const min = -45;
        const max = 45;
        clampedValue = Math.max(min, Math.min(max, value));
      }

      // Try ID-based setters first (common in Cubism 4/5 bindings)
      // Note: addParameterValueById is additive; we prefer explicit set, but keep as fallback
      const idSetters = ['setParameterValueById', 'setParamValue', 'setParameterValue', 'addParameterValueById'];
      let success = false;
      for (const method of idSetters) {
        if (typeof core[method] === 'function') {
          try {
            if (method === 'setParameterValueById') {
              core[method](paramName, clampedValue, weight);
            } else if (method === 'addParameterValueById') {
              // Use delta towards target if only additive write is available
              const current = getModelParameter(paramName, model);
              const delta = (clampedValue - current);
              core[method](paramName, delta, weight);
            } else {
              core[method](paramName, clampedValue);
            }
            success = true;
            break;
          } catch (e) {
            // Try next method
          }
        }
      }

      // If ID-based setters failed, try index-based API (Cubism Core 5.1.0 variants)
      if (!success) {
        // Resolve parameter index by name using available methods
        let paramIndex = -1;
        const indexResolvers = ['getParameterIndex', 'getParameterIndexById', 'getParamIndex'];
        for (const resolver of indexResolvers) {
          if (typeof core[resolver] === 'function') {
            try {
              paramIndex = core[resolver](paramName);
              if (typeof paramIndex === 'number' && paramIndex >= 0) break;
            } catch (e) {
              // continue
            }
          }
        }

        // As a final fallback, iterate parameters to find matching ID
        if (paramIndex < 0) {
          try {
            const count = typeof core.getParameterCount === 'function' ? core.getParameterCount() : 0;
            const idReaders = ['getParameterId', 'getParamId', 'paramId', 'getParameterName'];
            let idReader = null;
            for (const reader of idReaders) {
              if (typeof core[reader] === 'function') { idReader = reader; break; }
            }
            if (count && idReader) {
              for (let i = 0; i < count; i++) {
                try {
                  const id = core[idReader](i);
                  if (id === paramName) { paramIndex = i; break; }
                } catch {}
              }
            }
          } catch {}
        }

        if (paramIndex >= 0) {
          const indexSetters = ['setParameterValueByIndex', 'setParamValueByIndex', 'setParameterValueAt', 'addParameterValueByIndex', 'multiplyParameterValueByIndex'];
          for (const method of indexSetters) {
            if (typeof core[method] === 'function') {
              try {
                if (method === 'addParameterValueByIndex' || method === 'multiplyParameterValueByIndex') {
                  // Compute delta or factor based on current
                  const indexGetters = ['getParameterValueByIndex', 'getParamValueByIndex', 'getParameterValueAt'];
                  let current = 0;
                  for (const g of indexGetters) {
                    if (typeof core[g] === 'function') {
                      try { current = core[g](paramIndex); break; } catch {}
                    }
                  }
                  if (method === 'addParameterValueByIndex') {
                    core[method](paramIndex, (clampedValue - current), weight);
                  } else {
                    const factor = current === 0 ? 0 : (clampedValue / current);
                    core[method](paramIndex, factor, weight);
                  }
                } else {
                  core[method](paramIndex, clampedValue, weight);
                }
                success = true;
                break;
              } catch (e) {
                // Try next method
              }
            }
          }
        }
      }
      
      // Debug logging for mouth parameter
      if (paramName.toLowerCase().includes('mouth') && clampedValue > 0) {
        console.log(`👄 Setting ${paramName} = ${clampedValue.toFixed(3)} (success: ${success})`);
      }
      
      if (!success) {
        console.warn(`Parameter ${paramName} not found or failed to set`);
      }
    } catch (e) {
      console.warn(`Parameter ${paramName} not found or failed to set:`, e);
    }
  }
}

/**
 * Get current value of a Live2D model parameter
 * @param {string} paramName - The parameter name
 * @param {object} model - The Live2D model instance
 * @returns {number} Current parameter value
 */
export function getModelParameter(paramName, model) {
  if (model?.internalModel?.coreModel) {
    try {
      const core = model.internalModel.coreModel;
      
      // Try ID-based getters first
      const idGetters = ['getParameterValueById', 'getParamValue', 'getParameterValue'];
      for (const method of idGetters) {
        if (typeof core[method] === 'function') {
          try {
            return core[method](paramName);
          } catch {}
        }
      }

      // Try index-based getters
      let paramIndex = -1;
      const indexResolvers = ['getParameterIndex', 'getParameterIndexById', 'getParamIndex'];
      for (const resolver of indexResolvers) {
        if (typeof core[resolver] === 'function') {
          try {
            paramIndex = core[resolver](paramName);
            if (typeof paramIndex === 'number' && paramIndex >= 0) break;
          } catch {}
        }
      }
      if (paramIndex >= 0) {
        const indexGetters = ['getParameterValueByIndex', 'getParamValueByIndex', 'getParameterValueAt'];
        for (const method of indexGetters) {
          if (typeof core[method] === 'function') {
            try {
              return core[method](paramIndex);
            } catch {}
          }
        }
      }
      
      console.warn(`Parameter ${paramName} not found`);
    } catch (e) {
      console.warn(`Parameter ${paramName} not found:`, e);
    }
  }
  return 0;
}

/**
 * Force mouth visibility with stable form parameter
 * @param {object} model - Live2D model instance
 * @param {number} formValue - Fixed mouth form value (0.6-0.7 for visibility)
 */
// Throttle debug logging to avoid console spam
let lastMouthFormLog = 0;
let lastMouthValueLog = 0;

function forceMouthVisibility(model, formValue = 0.65, shouldForce = false) {
  if (!model || !shouldForce) return;
  
  // Force ParamMouthForm to ensure mouth shape is visible
  // This must be set every frame to override Live2D internal resets
  setModelParameter('ParamMouthForm', formValue, model);
  
  // Debug log throttled to once per second
  const now = Date.now();
  if (now - lastMouthFormLog > 1000) {
    console.log(`💪 Forcing ParamMouthForm = ${formValue} for mouth visibility`);
    lastMouthFormLog = now;
  }
}

/**
 * Apply all current animation state parameters to the model
 * @param {object} animationState - Current animation state
 * @param {object} model - Live2D model instance
 */
export function applyAnimationParameters(animationState, model) {
  if (!model) return;
  
  // Check if mouth should be actively controlled (only when target > idle threshold)
  const mouthValue = Math.max(0, Math.min(1, (animationState.baseMouthOpen || 0) + animationState.mouthCurrent));
  const isActiveMouth = (animationState.mouthTarget || 0) > 0.2 || mouthValue > 0.2;
  
  // Only force mouth visibility when actively speaking/streaming
  if (isActiveMouth) {
    forceMouthVisibility(model, 0.65, true);
  }
  
  // Eye parameters (temporarily disabled while we diagnose face disappearance)
  // setModelParameter('ParamEyeLOpen', animationState.eyeBlinkCurrent, model);
  // setModelParameter('ParamEyeROpen', animationState.eyeBlinkCurrent, model);
  
  // Only apply mouth opening when there's actual movement
  if (isActiveMouth) {
    setModelParameter('ParamMouthOpenY', mouthValue, model);
    
    // Debug mouth parameter application (throttled)
    const now = Date.now();
    if (now - lastMouthValueLog > 1000) {
      console.log(`👄 Applied mouth opening: base=${(animationState.baseMouthOpen || 0).toFixed(3)} + current=${animationState.mouthCurrent.toFixed(3)} = ${mouthValue.toFixed(3)}`);
      lastMouthValueLog = now;
    }
  }
  
  // Head movement parameters
  const APPLY_HEAD_ANGLES = false; // Temporary: prevent head from disappearing on some models
  if (APPLY_HEAD_ANGLES) {
    setModelParameter('ParamAngleX', (animationState.baseHeadAngleX || 0) + animationState.headAngleX, model);
    setModelParameter('ParamAngleY', (animationState.baseHeadAngleY || 0) + animationState.headAngleY, model);
    setModelParameter('ParamAngleZ', (animationState.baseHeadAngleZ || 0) + animationState.headAngleZ, model);
  }
}

/**
 * Apply parameters using additive writing when available
 * @param {object} animationState - Current animation state
 * @param {object} model - Live2D model instance
 */
export function applyAnimationParametersAdditive(animationState, model) {
  if (!model?.internalModel?.coreModel) return;
  
  try {
    const core = model.internalModel.coreModel;
    
    // Check if mouth should be actively controlled (only when target > idle threshold)
    const targetMouth = Math.max(0, Math.min(1, (animationState.baseMouthOpen || 0) + animationState.mouthCurrent));
    const isActiveMouth = (animationState.mouthTarget || 0) > 0.2 || targetMouth > 0.2;
    
    // Only force mouth form when actively speaking/streaming
    if (isActiveMouth) {
      forceMouthVisibility(model, 0.65, true);
    }
    
    // Try additive mouth parameter setting to resist internal resets
    if (isActiveMouth) {
      const currentMouth = getModelParameter('ParamMouthOpenY', model);
      const mouthDelta = targetMouth - currentMouth;
      
      // Use additive write if available, otherwise fall back to regular write
      let success = false;
      if (Math.abs(mouthDelta) > 0.01 && typeof core.addParameterValueById === 'function') {
        try {
          core.addParameterValueById('ParamMouthOpenY', mouthDelta, 1.0);
          success = true;
          console.log(`🔧 Additive mouth: current=${currentMouth.toFixed(3)} + delta=${mouthDelta.toFixed(3)} -> target=${targetMouth.toFixed(3)}`);
        } catch (e) {
          console.warn('Additive mouth write failed, using regular write:', e);
        }
      }
      
      if (!success && Math.abs(mouthDelta) > 0.01) {
        setModelParameter('ParamMouthOpenY', targetMouth, model);
        console.log(`📝 Regular mouth write: ${targetMouth.toFixed(3)}`);
      }
    }
    
  } catch (error) {
    console.warn('Additive parameter application failed, falling back to regular:', error);
    applyAnimationParameters(animationState, model);
  }
}
