// Placeholder Face Implementation for fallback when Live2D model fails
// Creates a simple animated face using PixiJS graphics

/**
 * Create a placeholder face using PixiJS Graphics (PixiJS v6/v7 compatible)
 * @param {object} app - PixiJS Application instance
 * @param {object} PIXI - PixiJS library reference
 * @returns {object} PixiJS Container with placeholder face
 */
export function createPlaceholderFace(app, PIXI) {
  console.log('Creating placeholder face fallback');
  
  const face = new PIXI.Container();
  
  // Head circle (PixiJS v6/v7 syntax)
  const head = new PIXI.Graphics();
  head.beginFill(0xffdbac); // Skin tone color
  head.lineStyle(2, 0x000000); // Black outline
  head.drawCircle(0, 0, 100);
  head.endFill();
  
  // Left eye
  const leftEye = new PIXI.Graphics();
  leftEye.beginFill(0x000000); // Black eye
  leftEye.drawCircle(-30, -20, 15);
  leftEye.endFill();
  
  // Right eye
  const rightEye = new PIXI.Graphics();
  rightEye.beginFill(0x000000); // Black eye
  rightEye.drawCircle(30, -20, 15);
  rightEye.endFill();
  
  // Mouth (rounded rectangle for more natural look)
  const mouth = new PIXI.Graphics();
  mouth.beginFill(0x000000); // Black mouth
  mouth.drawRoundedRect(-20, 20, 40, 10, 5);
  mouth.endFill();
  
  // Assemble face
  face.addChild(head, leftEye, rightEye, mouth);
  
  // Position at screen center
  face.position.set(app.screen.width / 2, app.screen.height / 2);
  
  // Add animation properties for compatibility with animation system
  face.eyeBlinkValue = 1;
  face.mouthOpenValue = 0;
  
  // Add helper properties for easier access to parts
  face.head = head;
  face.leftEye = leftEye;
  face.rightEye = rightEye;
  face.mouth = mouth;
  
  console.log('Placeholder face created successfully');
  return face;
}

/**
 * Animate placeholder face based on animation parameters
 * @param {object} placeholder - Placeholder face container
 * @param {object} params - Animation parameters
 * @param {number} params.eyeBlink - Eye blink value (0=closed, 1=open)
 * @param {number} params.mouthOpen - Mouth opening value (0=closed, 1=open)
 * @param {number} params.headAngle - Head rotation angle in degrees
 */
export function animatePlaceholder(placeholder, params) {
  if (!placeholder || !placeholder.children) {
    console.warn('Invalid placeholder face for animation');
    return;
  }
  
  try {
    // Eye blink animation (scale Y to simulate closing)
    if (placeholder.children[1]) { // Left eye
      placeholder.children[1].scale.y = Math.max(0.1, params.eyeBlink);
    }
    if (placeholder.children[2]) { // Right eye  
      placeholder.children[2].scale.y = Math.max(0.1, params.eyeBlink);
    }
    
    // Mouth opening animation
    if (placeholder.children[3]) { // Mouth
      const mouthScale = 0.5 + (params.mouthOpen * 0.5);
      placeholder.children[3].scale.y = Math.max(0.2, mouthScale);
    }
    
    // Head rotation (subtle)
    placeholder.rotation = (params.headAngle || 0) * 0.017453; // Convert degrees to radians
    
  } catch (error) {
    console.warn('Error animating placeholder face:', error);
  }
}

/**
 * Update placeholder face position (for resize handling)
 * @param {object} placeholder - Placeholder face container
 * @param {object} app - PixiJS Application instance
 */
export function updatePlaceholderPosition(placeholder, app) {
  if (placeholder && app) {
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    placeholder.position.set(centerX, centerY);
    console.log(`Placeholder repositioned to: ${centerX}, ${centerY}`);
  }
}
