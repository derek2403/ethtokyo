// Debug information overlay for development and troubleshooting
import React from 'react';

/**
 * Debug overlay showing system status and information
 * @param {object} props - Component properties
 * @param {string} props.debugInfo - Current debug message
 * @param {boolean} props.cubismLoaded - Cubism Core loading status
 * @param {object} props.app - PixiJS application instance
 * @param {object} props.model - Live2D model instance
 * @param {object} props.placeholderFace - Placeholder face instance
 * @param {boolean} props.animationsEnabled - Animation status
 * @param {boolean} props.visible - Whether overlay is visible
 */
const DebugOverlay = ({ 
  debugInfo = 'Initializing...', 
  cubismLoaded = false, 
  app = null, 
  model = null, 
  placeholderFace = null, 
  animationsEnabled = false,
  visible = true 
}) => {
  const [mouthParams, setMouthParams] = React.useState({});
  
  if (!visible) return null;
  
  // Check for window globals
  const hasWindowPIXI = typeof window !== 'undefined' && window.PIXI;
  const hasCubismCore = typeof window !== 'undefined' && window.Live2DCubismCore;
  const hasStreamFunction = typeof window !== 'undefined' && typeof window.pushStreamChunk === 'function';
  const hasDebugModel = typeof window !== 'undefined' && window.debugModel;
  
  // Monitor mouth parameters when animations are enabled
  React.useEffect(() => {
    if (!animationsEnabled || !model?.internalModel?.coreModel) {
      setMouthParams({});
      return;
    }
    
    const interval = setInterval(() => {
      try {
        const core = model.internalModel.coreModel;
        const getMouthParam = (paramName) => {
          const getters = ['getParameterValueById', 'getParamValue', 'getParameterValue'];
          for (const method of getters) {
            if (typeof core[method] === 'function') {
              try {
                return core[method](paramName);
              } catch {}
            }
          }
          return null;
        };
        
        const newParams = {
          mouthOpenY: getMouthParam('ParamMouthOpenY'),
          mouthForm: getMouthParam('ParamMouthForm'),
          eyeLOpen: getMouthParam('ParamEyeLOpen'),
          eyeROpen: getMouthParam('ParamEyeROpen')
        };
        
        setMouthParams(newParams);
      } catch (e) {
        console.warn('Failed to read mouth parameters for debug:', e);
      }
    }, 500); // Update every 500ms
    
    return () => clearInterval(interval);
  }, [animationsEnabled, model]);
  
  return (
    <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-sm max-w-xs z-50">
      <div className="font-semibold mb-2">🔧 Debug Info</div>
      
      {/* Current Status */}
      <div className="mb-2">
        <div className="text-yellow-300">Status: {debugInfo}</div>
      </div>
      
      {/* Core Dependencies */}
      <div className="space-y-1 text-xs">
        <div>Cubism Loaded: {cubismLoaded ? '✅' : '❌'}</div>
        <div>Core Global: {hasCubismCore ? '✅' : '❌'}</div>
        <div>Window PIXI: {hasWindowPIXI ? '✅' : '❌'}</div>
      </div>
      
      {/* System Components */}
      <div className="space-y-1 text-xs mt-2 border-t border-gray-600 pt-2">
        <div>PixiJS App: {app ? '✅' : '❌'}</div>
        <div>Live2D Model: {model ? '✅' : '❌'}</div>
        <div>Placeholder: {placeholderFace ? '✅' : '❌'}</div>
      </div>
      
      {/* Animation System */}
      <div className="space-y-1 text-xs mt-2 border-t border-gray-600 pt-2">
        <div>Animations: {animationsEnabled ? '✅' : '❌'}</div>
        <div>Stream Fn: {hasStreamFunction ? '✅' : '❌'}</div>
        <div>Debug Model: {hasDebugModel ? '✅' : '❌'}</div>
      </div>
      
      {/* Model Information */}
      {model && (
        <div className="space-y-1 text-xs mt-2 border-t border-gray-600 pt-2">
          <div className="text-green-300">Model Details:</div>
          <div>Position: {Math.round(model.x)}, {Math.round(model.y)}</div>
          <div>Scale: {model.scale?.x?.toFixed(2) || 'N/A'}</div>
          <div>Visible: {model.visible ? '✅' : '❌'}</div>
          <div>Alpha: {model.alpha?.toFixed(2) || 'N/A'}</div>
        </div>
      )}
      
      {/* Mouth Parameters (when animations enabled) */}
      {animationsEnabled && model && Object.keys(mouthParams).length > 0 && (
        <div className="space-y-1 text-xs mt-2 border-t border-yellow-600 pt-2">
          <div className="text-yellow-300">👄 Mouth Params:</div>
          {mouthParams.mouthOpenY !== null && (
            <div>MouthOpenY: {mouthParams.mouthOpenY?.toFixed(3) || 'N/A'}</div>
          )}
          {mouthParams.mouthForm !== null && (
            <div>MouthForm: {mouthParams.mouthForm?.toFixed(3) || 'N/A'}</div>
          )}
          {mouthParams.eyeLOpen !== null && (
            <div>EyeL: {mouthParams.eyeLOpen?.toFixed(3) || 'N/A'}</div>
          )}
          {mouthParams.eyeROpen !== null && (
            <div>EyeR: {mouthParams.eyeROpen?.toFixed(3) || 'N/A'}</div>
          )}
        </div>
      )}

      {/* App Information */}
      {app && (
        <div className="space-y-1 text-xs mt-2 border-t border-gray-600 pt-2">
          <div className="text-blue-300">App Info:</div>
          <div>Size: {app.screen?.width}x{app.screen?.height}</div>
          <div>FPS: {app.ticker?.maxFPS || 'N/A'}</div>
          <div>Running: {app.ticker?.started ? '✅' : '❌'}</div>
        </div>
      )}
    </div>
  );
};

export default DebugOverlay;
