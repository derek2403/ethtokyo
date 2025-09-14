// Model debugging utilities
// Discover available parameters and test individual parameter control

/**
 * List all available parameters in a Live2D model
 * @param {object} model - Live2D model instance
 * @returns {array} Array of parameter info objects
 */
export function listModelParameters(model) {
  const parameters = [];
  
  if (model?.internalModel?.coreModel) {
    try {
      const core = model.internalModel.coreModel;
      
      // First, let's discover what methods are available on the core
      console.log('🔍 Available core methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(core)).filter(name => typeof core[name] === 'function'));
      
      // Try different possible method names for parameter count
      let paramCount = 0;
      const possibleCountMethods = ['getParameterCount', 'parameterCount', 'getParamCount', 'paramCount'];
      
      for (const method of possibleCountMethods) {
        if (typeof core[method] === 'function') {
          try {
            paramCount = core[method]();
            console.log(`✅ Found parameter count method: ${method}() = ${paramCount}`);
            break;
          } catch (e) {
            console.log(`❌ ${method}() failed:`, e.message);
          }
        }
      }
      
      if (paramCount === 0) {
        console.warn('Could not determine parameter count');
        return [];
      }
      
      console.log(`🔍 Model has ${paramCount} parameters:`);
      
      // Try different possible method names for getting parameter IDs
      const possibleIdMethods = ['getParameterId', 'getParamId', 'paramId', 'getParameterName'];
      const possibleValueMethods = ['getParameterValueById', 'getParamValue', 'getParameterValue'];
      const possibleIndexValueMethods = ['getParameterValueByIndex', 'getParamValueByIndex', 'getParameterValueAt'];
      
      let getParamIdMethod = null;
      let getParamValueMethod = null;
      
      // Find working methods
      for (const method of possibleIdMethods) {
        if (typeof core[method] === 'function') {
          try {
            const testId = core[method](0);
            if (testId) {
              getParamIdMethod = method;
              console.log(`✅ Found parameter ID method: ${method}`);
              break;
            }
          } catch (e) {
            console.log(`❌ ${method} failed:`, e.message);
          }
        }
      }
      
      for (const method of possibleValueMethods) {
        if (typeof core[method] === 'function') {
          getParamValueMethod = method;
          console.log(`✅ Found parameter value method: ${method}`);
          break;
        }
      }
      
      // Fallback paths when we cannot get IDs via Core API
      let parameterIds = null;
      if (!getParamIdMethod) {
        // 1) Check internalModel cached ids (pixi-live2d-display often exposes this)
        const idCandidates = [
          model.internalModel?._params?.ids,
          model.internalModel?.params?.ids,
          model.internalModel?._parameters?.ids,
          model.internalModel?.parameters?.ids,
          model.internalModel?.parameterIds,
          model.internalModel?._parameterIds
        ].find(arr => Array.isArray(arr) && arr.every(x => typeof x === 'string'));
        if (idCandidates) {
          parameterIds = idCandidates;
          console.log('✅ Found parameter IDs via internalModel cache');
        }
        
        // 2) As a minimal fallback, pull known IDs from settings.groups (LipSync, EyeBlink)
        if (!parameterIds && model.internalModel?.settings?.groups) {
          const groups = model.internalModel.settings.groups;
          const lip = groups.find(g => (g.Name || g.name) === 'LipSync');
          const eye = groups.find(g => (g.Name || g.name) === 'EyeBlink');
          const collected = [];
          if (lip?.Ids) collected.push(...lip.Ids);
          if (eye?.Ids) collected.push(...eye.Ids);
          if (collected.length > 0) {
            parameterIds = collected;
            console.log('✅ Found parameter IDs via settings.groups');
          }
        }
        
        // Without any way to resolve IDs, we can still return value-by-index info
        if (!parameterIds) {
          console.error('❌ Could not find method to get parameter IDs');
        }
      }
      
      // List all parameters
      for (let i = 0; i < paramCount; i++) {
        try {
          // Resolve ID
          const paramId = getParamIdMethod
            ? core[getParamIdMethod](i)
            : (parameterIds && parameterIds[i] ? parameterIds[i] : `index:${i}`);
          
          // Resolve value (prefer ID-based; fallback to index-based)
          let currentValue = 0;
          if (getParamValueMethod && typeof paramId === 'string' && !paramId.startsWith('index:')) {
            try {
              currentValue = core[getParamValueMethod](paramId);
            } catch (e) {
              // Try with index instead of ID
              const indexGetter = possibleIndexValueMethods.find(m => typeof core[m] === 'function');
              if (indexGetter) {
                try { currentValue = core[indexGetter](i); } catch { currentValue = 'N/A'; }
              } else {
                currentValue = 'N/A';
              }
            }
          } else {
            const indexGetter = possibleIndexValueMethods.find(m => typeof core[m] === 'function');
            if (indexGetter) {
              try { currentValue = core[indexGetter](i); } catch { currentValue = 'N/A'; }
            } else {
              currentValue = 'N/A';
            }
          }
          
          const paramInfo = { id: paramId, index: i, current: currentValue };
          parameters.push(paramInfo);
          
          // Log mouth-related parameters
          const idStr = String(paramId).toLowerCase();
          if (idStr.includes('mouth') || idStr.includes('open')) {
            console.log(`👄 MOUTH PARAMETER: ${paramId}`, paramInfo);
          } else {
            console.log(`📋 ${paramId}: ${currentValue}`);
          }
        } catch (error) {
          console.warn(`Failed to get parameter ${i}:`, error.message);
        }
      }
      
      return parameters;
    } catch (error) {
      console.error('Failed to list model parameters:', error);
    }
  }
  
  return [];
}

/**
 * Test a specific parameter with a value
 * @param {object} model - Live2D model instance
 * @param {string} paramName - Parameter name to test
 * @param {number} value - Value to set
 * @returns {boolean} Success status
 */
export function testParameter(model, paramName, value) {
  if (model?.internalModel?.coreModel) {
    try {
      const core = model.internalModel.coreModel;
      
      // Try ID-based methods first, then index-based variants
      const possibleGetMethods = ['getParameterValueById', 'getParamValue', 'getParameterValue'];
      const possibleSetMethods = ['setParameterValueById', 'setParamValue', 'setParameterValue'];
      const possibleIndexGetMethods = ['getParameterValueByIndex', 'getParamValueByIndex', 'getParameterValueAt'];
      const possibleIndexSetMethods = ['setParameterValueByIndex', 'setParamValueByIndex', 'setParameterValueAt'];
      
      let getMethod = null;
      let setMethod = null;
      let indexGetMethod = null;
      let indexSetMethod = null;
      let paramIndex = -1;
      
      // Find working get method
      for (const method of possibleGetMethods) {
        if (typeof core[method] === 'function') {
          try {
            core[method](paramName);
            getMethod = method;
            break;
          } catch (e) {
            // Method exists but might not work with this parameter
          }
        }
      }
      
      // Find working set method
      for (const method of possibleSetMethods) {
        if (typeof core[method] === 'function') {
          setMethod = method;
          break;
        }
      }
      
      // Resolve index and index methods if ID methods are unavailable
      if (!getMethod) {
        const indexResolvers = ['getParameterIndex', 'getParameterIndexById', 'getParamIndex'];
        for (const resolver of indexResolvers) {
          if (typeof core[resolver] === 'function') {
            try {
              paramIndex = core[resolver](paramName);
              if (typeof paramIndex === 'number' && paramIndex >= 0) break;
            } catch {}
          }
        }
        if (paramIndex < 0 && typeof core.getParameterCount === 'function') {
          try {
            const count = core.getParameterCount();
            const idReaders = ['getParameterId', 'getParamId', 'paramId', 'getParameterName'];
            let idReader = null;
            for (const r of idReaders) { if (typeof core[r] === 'function') { idReader = r; break; } }
            if (idReader) {
              for (let i = 0; i < count; i++) {
                try { const id = core[idReader](i); if (id === paramName) { paramIndex = i; break; } } catch {}
              }
            }
          } catch {}
        }
        for (const method of possibleIndexGetMethods) {
          if (typeof core[method] === 'function') { indexGetMethod = method; break; }
        }
        for (const method of possibleIndexSetMethods) {
          if (typeof core[method] === 'function') { indexSetMethod = method; break; }
        }
      }
      
      if ((!getMethod || !setMethod) && !(indexGetMethod && indexSetMethod && paramIndex >= 0)) {
        console.warn(`❌ Could not find compatible get/set methods for ${paramName}`);
        return false;
      }
      
      const oldValue = getMethod ? core[getMethod](paramName) : core[indexGetMethod](paramIndex);
      if (setMethod) {
        // Include weight for Cubism 4+ semantics when available
        if (setMethod === 'setParameterValueById') core[setMethod](paramName, value, 1);
        else core[setMethod](paramName, value);
      } else {
        core[indexSetMethod](paramIndex, value, 1);
      }
      const newValue = getMethod ? core[getMethod](paramName) : core[indexGetMethod](paramIndex);
      
      console.log(`🧪 Parameter Test: ${paramName}`);
      console.log(`   Method: ${setMethod ? `${setMethod}(${paramName}, ${value})` : `${indexSetMethod}(${paramIndex}, ${value})`}`);
      console.log(`   Old: ${oldValue} → New: ${newValue} (Target: ${value})`);
      console.log(`   Success: ${Math.abs(newValue - value) < 0.01 ? '✅' : '❌'}`);
      
      return Math.abs(newValue - value) < 0.01;
    } catch (error) {
      console.error(`Failed to test parameter ${paramName}:`, error);
      return false;
    }
  }
  
  return false;
}

/**
 * Find mouth-related parameters automatically
 * @param {object} model - Live2D model instance
 * @returns {array} Array of potential mouth parameter names
 */
export function findMouthParameters(model) {
  const parameters = listModelParameters(model);
  
  const mouthParams = parameters.filter(param => {
    const id = param.id.toLowerCase();
    return id.includes('mouth') || 
           id.includes('open') || 
           id.includes('lip') ||
           id.includes('jaw') ||
           id.includes('smile');
  });
  
  console.log('🔍 Potential mouth parameters:', mouthParams.map(p => p.id));
  return mouthParams;
}

/**
 * Test all potential mouth parameters
 * @param {object} model - Live2D model instance
 */
export function testAllMouthParameters(model) {
  const mouthParams = findMouthParameters(model);
  
  console.log('🧪 Testing all mouth parameters...');
  
  mouthParams.forEach(param => {
    console.log(`\n--- Testing ${param.id} ---`);
    
    // Test with different values
    testParameter(model, param.id, 0);
    setTimeout(() => testParameter(model, param.id, 0.5), 500);
    setTimeout(() => testParameter(model, param.id, 1), 1000);
    setTimeout(() => testParameter(model, param.id, param.default), 1500);
  });
}

/**
 * Create debug controls for the model
 * @param {object} model - Live2D model instance
 * @returns {object} Debug control functions
 */
export function createDebugControls(model) {
  const parameters = listModelParameters(model);
  
  return {
    listParameters: () => listModelParameters(model),
    testParameter: (name, value) => testParameter(model, name, value),
    findMouthParams: () => findMouthParameters(model),
    testMouthParams: () => testAllMouthParameters(model),
    
    // Quick parameter tests
    testMouthOpen: () => {
      const candidates = ['ParamMouthOpenY', 'PARAM_MOUTH_OPEN_Y', 'MouthOpen', 'mouth_open'];
      candidates.forEach(name => testParameter(model, name, 0.8));
    },
    
    testEyeBlink: () => {
      const candidates = ['ParamEyeLOpen', 'ParamEyeROpen', 'PARAM_EYE_L_OPEN', 'PARAM_EYE_R_OPEN'];
      candidates.forEach(name => testParameter(model, name, 0));
    },
    
    resetAll: () => {
      parameters.forEach(param => {
        testParameter(model, param.id, param.default);
      });
    }
  };
}
