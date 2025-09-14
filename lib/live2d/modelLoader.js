// Live2D Model Loading and Management
// Handles loading, positioning, and setup of Live2D models

/**
 * Load Live2D model with proper error handling and fallback
 * @param {string} modelPath - Path to model3.json file
 * @param {object} app - PixiJS Application instance  
 * @param {object} Live2DModel - Live2D model class
 * @returns {Promise<object>} Loaded model instance or null
 */
export async function loadLive2DModel(modelPath, app, Live2DModel) {
  console.log('Attempting to load Live2D model from:', modelPath);
  
  try {
    // Load the model
    const model = await Live2DModel.from(modelPath);
    
    console.log('Live2D model loaded successfully:', {
      width: model.width,
      height: model.height,
      textures: model.textures?.length || 'unknown',
      anchor: { x: model.anchor?.x, y: model.anchor?.y },
      position: { x: model.x, y: model.y }
    });
    
    // Setup model display properties
    setupModelDisplay(model, app);

    // Disable built-in lip sync so we can control mouth manually via ParamMouthOpenY
    try {
      if (model?.internalModel?.motionManager && 'lipSync' in model.internalModel.motionManager) {
        model.internalModel.motionManager.lipSync = false;
        console.log('Disabled internal lipSync to allow manual mouth control');
      }
    } catch (e) {
      console.warn('Could not disable internal lipSync:', e);
    }

    // Ensure model is visible, but do NOT touch Live2D drawable culling (breaks masking/eyes)
    try {
      model.visible = true;
      model.alpha = 1;
    } catch (e) {
      console.warn('Could not enforce basic visibility settings:', e);
    }
    
    // Ensure textures are loaded before adding to stage
    await ensureTexturesLoaded(model);
    
    // Optimize texture quality settings for crisp rendering
    if (model.textures) {
      model.textures.forEach((texture, index) => {
        if (texture.baseTexture) {
          texture.baseTexture.scaleMode = 1; // LINEAR filtering for better quality when scaled
          texture.baseTexture.mipmap = 1; // Enable mipmapping for smoother scaling
          console.log(`Texture ${index} quality settings applied: scaleMode=LINEAR, mipmap=enabled`);
        }
      });
      console.log(`Applied quality settings to ${model.textures.length} textures`);
    }
    
    // Add to stage
    app.stage.addChild(model);
    console.log('Model added to stage successfully');
    
    // Force initial render
    app.render();
    
    return model;
    
  } catch (error) {
    console.warn('Failed to load Live2D model:', error);
    return null;
  }
}

/**
 * Setup model display properties (scaling, positioning, anchoring)
 * @param {object} model - Live2D model instance
 * @param {object} app - PixiJS Application instance
 */
function setupModelDisplay(model, app) {
  // Get model bounds for proper sizing
  const modelBounds = model.getBounds();
  console.log('Model bounds:', modelBounds);
  
  // Calculate scale to fit screen with padding (reduced size for better proportions)
  const scaleX = (app.screen.width * 0.65) / modelBounds.width;  // Reduced from 0.7 to 0.5
  const scaleY = (app.screen.height * 0.8) / modelBounds.height; // Reduced from 0.9 to 0.65
  const scale = Math.min(scaleX, scaleY);
  
  console.log('Calculated scale:', scale, { scaleX, scaleY });
  model.scale.set(scale);
  
  // Set anchor to center for proper positioning
  model.anchor.set(0.5, 0.5);
  
  // Position at screen center, moved down by 5%
  const centerX = app.screen.width / 2;
  const centerY = app.screen.height / 2 + (app.screen.height * 0.05); // Move down by 5%
  model.position.set(centerX, centerY);
  
  console.log(`Model positioned at center: ${centerX}, ${centerY}`);
  console.log(`Screen size: ${app.screen.width}x${app.screen.height}`);
}

/**
 * Ensure all model textures are loaded before display
 * @param {object} model - Live2D model instance
 */
async function ensureTexturesLoaded(model) {
  if (model.textures && model.textures.length > 0) {
    try {
      await Promise.all(
        model.textures.map(tex => {
          if (tex.baseTexture?.resource?.load) {
            return tex.baseTexture.resource.load();
          }
          return Promise.resolve();
        })
      );
      console.log('All model textures loaded successfully');
    } catch (error) {
      console.warn('Some textures failed to load, continuing anyway:', error);
    }
  }
}

/**
 * Update model position and scale for window resize
 * @param {object} model - Live2D model instance
 * @param {object} app - PixiJS Application instance
 */
export function updateModelDisplay(model, app) {
  if (!model || !app) return;
  
  try {
    // Recalculate scale for new screen size
    const modelBounds = model.getBounds();
    const currentScale = model.scale.x;
    
    // Calculate what the original bounds would be
    const originalWidth = modelBounds.width / currentScale;
    const originalHeight = modelBounds.height / currentScale;
    
    const scaleX = (app.screen.width * 0.65) / originalWidth;  // Reduced from 0.7 to 0.5
    const scaleY = (app.screen.height * 0.8) / originalHeight; // Reduced from 0.9 to 0.65
    const newScale = Math.min(scaleX, scaleY);
    
    model.scale.set(newScale);
    
    // Reposition to center, moved down by 5%
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2 + (app.screen.height * 0.05); // Move down by 5%
    model.position.set(centerX, centerY);
    
    console.log(`Model repositioned: ${centerX}, ${centerY} with scale: ${newScale}`);
  } catch (error) {
    console.warn('Error updating model display:', error);
  }
}

/**
 * Get available motions from the model
 * @param {object} model - Live2D model instance
 * @returns {array} Array of available motion group names
 */
export function getModelMotions(model) {
  try {
    if (model?.internalModel?.settings?.motions) {
      const motions = Object.keys(model.internalModel.settings.motions);
      console.log('Available model motions:', motions);
      return motions;
    }
  } catch (error) {
    console.warn('Could not get model motions:', error);
  }
  
  // Return default motions for Hiyori model
  return ['Idle', 'Flick', 'FlickDown', 'FlickUp', 'Tap', 'Tap@Body', 'Flick@Body'];
}

/**
 * Get available parameters from the model
 * @param {object} model - Live2D model instance
 * @returns {array} Array of available parameter names
 */
export function getModelParameters(model) {
  try {
    if (model?.internalModel?.coreModel) {
      const paramCount = model.internalModel.coreModel.getParameterCount();
      const parameters = [];
      
      for (let i = 0; i < paramCount; i++) {
        const paramId = model.internalModel.coreModel.getParameterId(i);
        parameters.push(paramId);
      }
      
      console.log('Available model parameters:', parameters);
      return parameters;
    }
  } catch (error) {
    console.warn('Could not get model parameters:', error);
  }
  
  // Return default parameters for Live2D models
  return ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamEyeLOpen', 'ParamEyeROpen', 'ParamMouthOpenY'];
}
