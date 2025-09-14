// PixiJS Application Setup and Management
// Handles PixiJS initialization, configuration, and lifecycle

/**
 * Initialize PixiJS Application with proper configuration
 * @param {HTMLElement} container - DOM container for the canvas
 * @returns {Promise<object>} PixiJS Application instance
 */
export async function initializePixiApp(container) {
  console.log('Initializing PixiJS application');
  console.log('Container dimensions:', container.clientWidth, 'x', container.clientHeight);
  
  try {
    // Dynamic import PixiJS (client-only)
    const PIXI = await import('pixi.js');
    
    // Create PixiJS application
    const app = new PIXI.Application();
    
    // Handle both v6 and v7+ initialization patterns
    if (typeof app.init === 'function') {
      console.log('Using PixiJS v7+ async initialization');
      await app.init({
        width: container.clientWidth,
        height: container.clientHeight,
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crisp rendering
        autoDensity: true, // Automatically adjust for high-DPI displays
        powerPreference: 'high-performance' // Prefer discrete GPU for better quality
      });
    } else {
      console.log('Using legacy PixiJS initialization');
      // v6 style initialization (fallback)
      Object.assign(app, new PIXI.Application({
        width: container.clientWidth,
        height: container.clientHeight,
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
        resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crisp rendering
        autoDensity: true, // Automatically adjust for high-DPI displays
        powerPreference: 'high-performance' // Prefer discrete GPU for better quality
      }));
    }
    
    console.log('PixiJS Application created successfully');
    
    // Get canvas element (v6: app.view, v7: app.canvas)
    const canvas = app.canvas || app.view;
    
    if (!canvas || canvas.nodeType !== Node.ELEMENT_NODE) {
      throw new Error(`Invalid canvas element: ${canvas}`);
    }
    
    // Append canvas to container
    container.appendChild(canvas);
    console.log('Canvas successfully appended to container');
    
    // Improve canvas rendering quality
    if (canvas.style) {
      canvas.style.imageRendering = 'auto';
      canvas.style.imageRendering = 'crisp-edges'; // Fallback for older browsers
      canvas.style.imageRendering = 'pixelated'; // Fallback
      canvas.style.imageRendering = 'auto'; // Modern browsers - final setting
      console.log('Canvas quality settings applied');
    }
    
    // Configure performance and quality settings
    app.ticker.maxFPS = 60;
    
    // Optimize renderer settings for better quality
    if (app.renderer) {
      // Enable high-quality texture filtering
      if (app.renderer.textureGC) {
        app.renderer.textureGC.maxIdle = 60 * 60; // Keep textures longer for better performance
      }
      console.log('Renderer quality optimizations applied');
    }
    
    // Expose PIXI to window for Live2D compatibility (required)
    if (typeof window !== 'undefined') {
      window.PIXI = PIXI;
      console.log('PIXI exposed to window for Live2D compatibility');
    }
    
    return app;
    
  } catch (error) {
    console.error('Failed to initialize PixiJS:', error);
    throw error;
  }
}

/**
 * Load Live2D display library with Cubism 4 support
 * @returns {Promise<object>} Live2DModel class
 */
export async function loadLive2DLibrary() {
  console.log('Loading Live2D display library');
  
  try {
    // Use Cubism 4 specific bundle
    const { Live2DModel } = await import('pixi-live2d-display/cubism4');
    console.log('Live2D display library loaded successfully');
    return Live2DModel;
  } catch (error) {
    console.error('Failed to load Live2D library:', error);
    throw error;
  }
}

/**
 * Setup PixiJS application with Live2D integration
 * @param {HTMLElement} container - DOM container element
 * @returns {Promise<object>} Object containing app and Live2DModel
 */
export async function setupPixiWithLive2D(container) {
  console.log('Setting up PixiJS with Live2D integration');
  
  try {
    // Initialize PixiJS first
    const app = await initializePixiApp(container);
    
    // Load Live2D library
    const Live2DModel = await loadLive2DLibrary();
    
    console.log('PixiJS + Live2D setup completed successfully');
    
    return { app, Live2DModel };
    
  } catch (error) {
    console.error('Failed to setup PixiJS with Live2D:', error);
    throw error;
  }
}

/**
 * Cleanup PixiJS application and resources
 * @param {object} app - PixiJS Application instance
 */
export function cleanupPixiApp(app) {
  if (app) {
    console.log('Cleaning up PixiJS application');
    
    try {
      app.stop();
      app.destroy(true, { 
        children: true, 
        texture: true, 
        baseTexture: true 
      });
      console.log('PixiJS application destroyed successfully');
    } catch (error) {
      console.warn('Error during PixiJS cleanup:', error);
    }
  }
}

/**
 * Handle window resize for PixiJS application
 * @param {object} app - PixiJS Application instance
 * @param {HTMLElement} container - DOM container element
 */
export function handlePixiResize(app, container) {
  if (app && container) {
    try {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      app.renderer.resize(newWidth, newHeight);
      console.log(`PixiJS resized to: ${newWidth}x${newHeight}`);
    } catch (error) {
      console.warn('Error resizing PixiJS application:', error);
    }
  }
}

/**
 * Create throttled resize handler
 * @param {function} resizeHandler - Function to call on resize
 * @param {number} delay - Throttle delay in milliseconds
 * @returns {function} Throttled resize handler
 */
export function createThrottledResize(resizeHandler, delay = 100) {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      resizeHandler.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        resizeHandler.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}
