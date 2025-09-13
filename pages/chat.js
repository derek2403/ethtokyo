import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Inline Card component (matches shadcn/ui patterns)
const Card = ({ className, children, ...props }) => (
  <div className={cn("bg-card text-card-foreground rounded-xl border shadow-sm", className)} {...props}>
    {children}
  </div>
);

// Inline Textarea component
const Textarea = ({ className, ...props }) => (
  <textarea 
    className={cn("border-input bg-transparent px-3 py-2 text-sm border rounded-md focus-visible:ring-2 focus-visible:ring-ring", className)} 
    {...props} 
  />
);

// Placeholder Face Implementation (PixiJS v6 API)
function createPlaceholderFace(app, PIXI) {
  const face = new PIXI.Container();
  
  // Head circle (PixiJS v6 syntax)
  const head = new PIXI.Graphics();
  head.beginFill(0xffdbac);
  head.lineStyle(2, 0x000000);
  head.drawCircle(0, 0, 100);
  head.endFill();
  
  // Eyes
  const leftEye = new PIXI.Graphics();
  leftEye.beginFill(0x000000);
  leftEye.drawCircle(-30, -20, 15);
  leftEye.endFill();
  
  const rightEye = new PIXI.Graphics();
  rightEye.beginFill(0x000000);
  rightEye.drawCircle(30, -20, 15);
  rightEye.endFill();
  
  // Mouth
  const mouth = new PIXI.Graphics();
  mouth.beginFill(0x000000);
  mouth.drawRoundedRect(-20, 20, 40, 10, 5);
  mouth.endFill();
  
  face.addChild(head, leftEye, rightEye, mouth);
  face.position.set(app.screen.width / 2, app.screen.height / 2);
  
  // Add animation properties for compatibility
  face.eyeBlinkValue = 1;
  face.mouthOpenValue = 0;
  
  return face;
}

// Live2D parameter control with weight (updated API)
function setModelParameter(paramName, value, model, weight = 1) {
  if (model?.internalModel?.coreModel) {
    try {
      model.internalModel.coreModel.setParameterValueById(paramName, value, weight);
    } catch (e) {
      console.warn(`Parameter ${paramName} not found`);
    }
  }
}

// Animation state management
const animationState = {
  // Eye blink
  eyeBlinkTimer: 0,
  eyeBlinkTarget: 1,
  eyeBlinkCurrent: 1,
  
  // Mouth animation
  mouthTarget: 0,
  mouthCurrent: 0,
  mouthEnvelope: { attack: 70, hold: 50, release: 100 },
  
  // Head sway
  headSwayTime: 0,
  headAngleX: 0,
  headAngleY: 0,
  headAngleZ: 0,
  
  // Expression states
  expressionTarget: 'neutral',
  expressionTimer: 0
};

// Linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Simple throttle helper for resize events
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

// Idle behaviors - eye blinking and head sway
function updateIdleBehaviors(deltaMS, state) {
  // Random eye blink every 2-4 seconds
  state.eyeBlinkTimer += deltaMS;
  if (state.eyeBlinkTimer > (2000 + Math.random() * 2000)) {
    state.eyeBlinkTimer = 0;
    // Trigger blink animation
    state.eyeBlinkTarget = 0;
    setTimeout(() => { state.eyeBlinkTarget = 1; }, 120);
  }
  
  // Head sway - very gentle movement to prevent disappearing
  state.headSwayTime += deltaMS * 0.001;
  state.headAngleX = Math.sin(state.headSwayTime * 0.5) * 2; // ±2 degrees (reduced)
  state.headAngleY = Math.cos(state.headSwayTime * 0.3) * 1; // ±1 degree (reduced) 
  state.headAngleZ = Math.sin(state.headSwayTime * 0.7) * 1; // ±1 degree (reduced)
}

// Expression system
function triggerExpression(expressionName, model) {
  animationState.expressionTarget = expressionName;
  animationState.expressionTimer = 1000; // Hold for 1 second
  
  // Available motions from hiyori_pro_jp.model3.json: "Idle", "Flick", "FlickDown", "FlickUp", "Tap", "Tap@Body", "Flick@Body"
  if (model?.motion) {
    try {
      // Map emotes to actual motion group names (must match model3.json exactly)
      const motionMap = {
        'smile': 'Tap',
        'surprised': 'FlickUp', 
        'relaxed': 'Idle',
        'excited': 'Flick',
        'body_tap': 'Tap@Body'
      };
      const motion = motionMap[expressionName] || expressionName;
      model.motion(motion);
      console.log(`Triggered motion: ${motion}`);
    } catch (e) {
      console.warn(`Motion ${expressionName} not available`);
    }
  }
}

// Placeholder animation
function animatePlaceholder(placeholder, params) {
  if (!placeholder) return;
  
  // Eye blink
  placeholder.children[1].scale.y = params.eyeBlink;
  placeholder.children[2].scale.y = params.eyeBlink;
  
  // Mouth open
  placeholder.children[3].scale.y = 0.5 + params.mouthOpen * 0.5;
  
  // Head rotation
  placeholder.rotation = params.headAngle * 0.1;
}

function ChatPage() {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // References
  const canvasContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // PixiJS & Live2D state
  const [app, setApp] = useState(null);
  const [model, setModel] = useState(null);
  const [placeholderFace, setPlaceholderFace] = useState(null);
  const [cubismLoaded, setCubismLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [animationsEnabled, setAnimationsEnabled] = useState(false);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add message function
  const addMessage = (text, isUser = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-open chat history when new message arrives
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100); // Small delay to ensure DOM is updated
    }
  }, [messages]);


  // PixiJS initialization (client-only)
  useEffect(() => {
    const live2DCubismCoreAvailable = typeof window !== 'undefined' && window.Live2DCubismCore;
    
    console.log('PixiJS Effect triggered:', { 
      containerExists: !!canvasContainerRef.current, 
      cubismLoaded, 
      windowExists: typeof window !== 'undefined',
      live2DCubismCoreAvailable
    });

    if (!canvasContainerRef.current || !cubismLoaded || typeof window === 'undefined' || !live2DCubismCoreAvailable) {
      if (cubismLoaded && !live2DCubismCoreAvailable) {
        setDebugInfo('Waiting for Live2DCubismCore global...');
      }
      return;
    }

    let pixiApp = null;
    let pixiModel = null;
    let pixiPlaceholder = null;

    const initializePixi = async () => {
      try {
        console.log('Starting PixiJS initialization...');
        setDebugInfo('Loading PixiJS and Live2D libraries...');

        // Dynamic import of client-only libraries - use Cubism 4 specific bundle
        const [PIXI, { Live2DModel }] = await Promise.all([
          import('pixi.js'),
          import('pixi-live2d-display/cubism4')  // Use Cubism 4 specific bundle
        ]);

        console.log('Libraries loaded successfully');
        
        // Expose PIXI to window for Live2D plugin (required by documentation)
        if (typeof window !== 'undefined') {
          window.PIXI = PIXI;
          console.log('PIXI exposed to window for Live2D auto-update');
        }

        // Don't register auto-ticker initially to prevent conflicts
        // Live2DModel.registerTicker(PIXI.Ticker);
        console.log('Live2D auto-ticker disabled to prevent conflicts');
        
        setDebugInfo('Libraries loaded, creating PixiJS application...');

        const container = canvasContainerRef.current;
        console.log('Container dimensions:', container.clientWidth, 'x', container.clientHeight);
        
        // PixiJS v7 Application setup - try both sync and async patterns
        pixiApp = new PIXI.Application();
        
        // Check if v7 requires async initialization
        if (typeof pixiApp.init === 'function') {
          console.log('Using PixiJS v7+ async initialization');
          await pixiApp.init({
            width: container.clientWidth,
            height: container.clientHeight,
            background: 0x000000,
            backgroundAlpha: 0,
            antialias: true,
            autoStart: false
          });
        } else {
          console.log('Using legacy PixiJS initialization');
          // Fallback for older versions
          pixiApp = new PIXI.Application({
            width: container.clientWidth,
            height: container.clientHeight,
            background: 0x000000,
            backgroundAlpha: 0,
            antialias: true,
            autoStart: false
          });
        }

        console.log('PixiJS Application created');

        // Append Pixi-created canvas to container (check both v6 and v7 properties)
        const canvas = pixiApp.canvas || pixiApp.view;
        console.log('Canvas element:', canvas, 'Type:', typeof canvas);
        
        if (canvas && canvas.nodeType === Node.ELEMENT_NODE) {
          container.appendChild(canvas);
          console.log('Canvas successfully appended to container');
        } else {
          throw new Error(`Invalid canvas element: ${canvas}`);
        }

        // Limit to 60 FPS
        pixiApp.ticker.maxFPS = 60;

        setApp(pixiApp);
        setDebugInfo('PixiJS ready, loading Live2D model...');

        // Live2D Model Loading
        try {
          console.log('Attempting to load Live2D model...');
          pixiModel = await Live2DModel.from('/model/Hiyori/hiyori_pro_jp.model3.json');
          
          console.log('Live2D model loaded, setting up display...');
          console.log('Model details:', {
            width: pixiModel.width,
            height: pixiModel.height,
            textures: pixiModel.textures?.length || 'unknown',
            anchor: { x: pixiModel.anchor.x, y: pixiModel.anchor.y },
            position: { x: pixiModel.x, y: pixiModel.y }
          });
          setDebugInfo('Live2D model loaded successfully!');

          // Get model bounds for proper positioning
          const modelBounds = pixiModel.getBounds();
          console.log('Model bounds:', modelBounds);
          console.log('Model original size:', pixiModel.width, 'x', pixiModel.height);
          
          // Scale model to fit screen with padding
          const scaleX = (pixiApp.screen.width * 0.7) / modelBounds.width;
          const scaleY = (pixiApp.screen.height * 0.9) / modelBounds.height;
          const scale = Math.min(scaleX, scaleY);
          
          console.log('Calculated scale:', scale);
          pixiModel.scale.set(scale);
          
          // Center the model properly
          const centerX = pixiApp.screen.width / 2;
          const centerY = pixiApp.screen.height / 2;
          
          // Keep anchor at center and position at true center first
          pixiModel.anchor.set(0.5, 0.5);
          pixiModel.position.set(centerX, centerY);
          
          // Log positioning for debugging
          console.log(`Screen size: ${pixiApp.screen.width}x${pixiApp.screen.height}`);
          console.log(`Model positioned at center: ${centerX}, ${centerY}`);
          
          console.log(`Model positioned at: ${centerX}, ${centerY} (screen: ${pixiApp.screen.width}x${pixiApp.screen.height})`);
          
          // Ensure all textures are loaded before adding to stage
          await new Promise(resolve => {
            if (pixiModel.textures && pixiModel.textures.length > 0) {
              Promise.all(pixiModel.textures.map(tex => tex.baseTexture.resource.load()))
                .then(() => resolve())
                .catch(() => resolve()); // Continue even if some textures fail
            } else {
              resolve();
            }
          });
          
          pixiApp.stage.addChild(pixiModel);
          setModel(pixiModel);
          
          console.log('Live2D model added to stage successfully');
          console.log('Final model state:', {
            position: { x: pixiModel.x, y: pixiModel.y },
            scale: { x: pixiModel.scale.x, y: pixiModel.scale.y },
            bounds: pixiModel.getBounds(),
            visible: pixiModel.visible,
            alpha: pixiModel.alpha
          });
          
          // Force a render update to ensure model displays properly
          pixiApp.render();
          
          // Don't trigger motions initially - let model display naturally
          console.log('Model loaded and displayed - animations will start after 2s delay');
        } catch (error) {
          console.warn('Live2D model failed to load, using placeholder:', error);
          setDebugInfo('Live2D model failed, showing placeholder face');
          
          // Create placeholder face fallback
          pixiPlaceholder = createPlaceholderFace(pixiApp, PIXI);
          pixiApp.stage.addChild(pixiPlaceholder);
          setPlaceholderFace(pixiPlaceholder);
          console.log('Placeholder face created and added to stage');
        }

        // Set up animation loop with delay to let model stabilize
        let animationStarted = false;
        let startDelay = 0;
        
        pixiApp.ticker.add((ticker) => {
          const deltaMS = ticker.deltaMS;
          
          // Only run animations if manually enabled
          if (!animationsEnabled) {
            return; // Don't run animations until manually enabled
          }
          
          // Initialize animation start after enabling
          if (!animationStarted) {
            animationStarted = true;
            console.log('Starting Live2D parameter animations');
          }
          
          // Update idle behaviors with more conservative values
          updateIdleBehaviors(deltaMS, animationState);
          
          // Smooth parameter transitions
          animationState.eyeBlinkCurrent = lerp(
            animationState.eyeBlinkCurrent, 
            animationState.eyeBlinkTarget, 
            deltaMS * 0.01
          );
          
          animationState.mouthCurrent = lerp(
            animationState.mouthCurrent,
            animationState.mouthTarget,
            deltaMS * 0.008
          );
          
          // Apply to model or placeholder - be gentle with head parameters
          if (pixiModel) {
            setModelParameter('ParamEyeLOpen', animationState.eyeBlinkCurrent, pixiModel);
            setModelParameter('ParamEyeROpen', animationState.eyeBlinkCurrent, pixiModel);
            setModelParameter('ParamMouthOpenY', animationState.mouthCurrent, pixiModel);
            
            // Use much smaller head movements to prevent disappearing
            setModelParameter('ParamAngleX', animationState.headAngleX * 0.3, pixiModel);
            setModelParameter('ParamAngleY', animationState.headAngleY * 0.3, pixiModel);
            setModelParameter('ParamAngleZ', animationState.headAngleZ * 0.2, pixiModel);
          } else if (pixiPlaceholder) {
            animatePlaceholder(pixiPlaceholder, {
              eyeBlink: animationState.eyeBlinkCurrent,
              mouthOpen: animationState.mouthCurrent,
              headAngle: animationState.headAngleX
            });
          }
        });

        // Start the application
        pixiApp.start();
        console.log('PixiJS application started with animation loop');

      } catch (error) {
        console.error('PixiJS initialization failed:', error);
        setDebugInfo(`PixiJS initialization failed: ${error.message}`);
      }
    };

    initializePixi();

    // Cleanup function
    return () => {
      if (pixiApp) {
        pixiApp.stop();
        pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
      }
    };
  }, [cubismLoaded]);

  // Resize handling for responsive canvas
  useEffect(() => {
    if (!app) return;
    
    const handleResize = throttle(() => {
      if (app && canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        app.renderer.resize(container.clientWidth, container.clientHeight);
        
        // Reposition and rescale model/placeholder
        if (model) {
          // Recalculate scale for new screen size
          const modelBounds = model.getBounds();
          const scaleX = (app.screen.width * 0.7) / (modelBounds.width / model.scale.x);
          const scaleY = (app.screen.height * 0.9) / (modelBounds.height / model.scale.y);
          const newScale = Math.min(scaleX, scaleY);
          
          model.scale.set(newScale);
          
          const centerX = app.screen.width / 2;
          const centerY = app.screen.height / 2;
          model.position.set(centerX, centerY);
          console.log(`Model repositioned to: ${centerX}, ${centerY + 100} with scale: ${newScale}`);
        } else if (placeholderFace) {
          const centerX = app.screen.width / 2;
          const centerY = app.screen.height / 2;
          placeholderFace.position.set(centerX, centerY);
        }
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [app, model, placeholderFace]);

  // Handle send message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    addMessage(inputValue, true);
    setInputValue('');
    
    // Simple echo response for now
    setTimeout(() => {
      addMessage(`You said: "${inputValue}"`, false);
    }, 500);
  };

  // Demo stream function - test animations
  const startDemoStream = () => {
    addMessage("Demo stream starting...", false);
    
    // Test mouth movement
    const testPhrase = "Hello! This is a test of mouth sync animation.";
    let index = 0;
    
    const animateText = setInterval(() => {
      if (index >= testPhrase.length) {
        clearInterval(animateText);
        animationState.mouthTarget = 0; // Close mouth at end
        addMessage("Demo animation complete!", false);
        return;
      }
      
      const char = testPhrase[index];
      
      // Animate mouth based on character type
      if (/[aeiouAEIOU]/.test(char)) {
        // Vowel - wider mouth
        animationState.mouthTarget = 0.8;
      } else if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/.test(char)) {
        // Consonant - smaller mouth
        animationState.mouthTarget = 0.4;
      } else if (/[.,!?;:]/.test(char)) {
        // Punctuation - pause
        animationState.mouthTarget = 0;
        
        // Quick expressions
        if (char === '!' && model) {
          triggerExpression('excited', model);
        } else if (char === '?' && model) {
          triggerExpression('surprised', model);
        }
      } else {
        // Space or other - neutral
        animationState.mouthTarget = 0;
      }
      
      index++;
    }, 100); // 100ms per character
  };
  
  // Test expression functions
  const testExpression = (expression) => {
    if (model) {
      triggerExpression(expression, model);
      addMessage(`Testing ${expression} expression!`, false);
    } else {
      addMessage(`Model not loaded - expression test skipped`, false);
    }
  };

  return (
    <>
      {/* Load Cubism Core with afterInteractive for proper timing */}
      <Script 
        src="/libs/live2dcubismcore.min.js" 
        strategy="afterInteractive"
        onReady={() => {
          console.log('Cubism Core loaded and ready');
          console.log('Live2DCubismCore available:', !!window.Live2DCubismCore);
          setDebugInfo('Cubism Core ready, initializing PixiJS...');
          setCubismLoaded(true);
        }}
        onError={(e) => {
          console.error('Failed to load Cubism Core:', e);
          setDebugInfo('Cubism Core failed to load');
        }}
      />
      
      <div className="h-screen w-screen relative bg-background text-foreground overflow-hidden">
        {/* Character Stage - Full screen minus chat input area */}
        <div className="absolute inset-0 bottom-20">
          <div ref={canvasContainerRef} className="w-full h-full" />
          {/* No <canvas> element - Pixi will create and append one */}
          
          {/* Debug Info Overlay */}
          <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-sm max-w-xs">
            <div>Debug: {debugInfo}</div>
            <div>Cubism Loaded: {cubismLoaded ? '✅' : '❌'}</div>
            <div>Core Global: {(typeof window !== 'undefined' && window.Live2DCubismCore) ? '✅' : '❌'}</div>
            <div>App: {app ? '✅' : '❌'}</div>
            <div>Model: {model ? '✅' : '❌'}</div>
            <div>Placeholder: {placeholderFace ? '✅' : '❌'}</div>
            <div>Animations: {animationsEnabled ? '✅' : '❌'}</div>
          </div>
        </div>
      
      {/* Chat History Toggle Button */}
      <div className="absolute bottom-24 right-4 z-50">
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="rounded-full w-12 h-12 shadow-lg"
          size="icon"
          variant="outline"
        >
          {isChatOpen ? '⬇' : '⬆'}
        </Button>
      </div>
      
      {/* Chat History Panel - Slides up when opened */}
      <div className={`absolute bottom-20 left-0 right-0 z-40 transform transition-transform duration-300 ease-in-out ${
        isChatOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <Card className="h-64 mx-4 mb-2 flex flex-col shadow-2xl">
          {/* Chat Header */}
          <div className="px-4 py-2 border-b border-border">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Chat History</h3>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startDemoStream}
                >
                  Demo Stream
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testExpression('smile')}
                >
                  😊
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testExpression('surprised')}
                >
                  😲
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => testExpression('relaxed')}
                >
                  😌
                </Button>
                <Button 
                  variant={animationsEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setAnimationsEnabled(!animationsEnabled);
                    addMessage(`Animations ${!animationsEnabled ? 'enabled' : 'disabled'}`, false);
                  }}
                >
                  {animationsEnabled ? 'Stop' : 'Animate'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center">
                Your conversation history will appear here
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`text-sm ${msg.isUser ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-3 py-1 rounded-lg max-w-xs ${
                      msg.isUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {msg.text}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {msg.timestamp}
                    </div>
                  </div>
                ))}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </Card>
      </div>
      
      {/* Persistent Chat Input - Always visible at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Chat with your VTuber..."
              className="flex-1 min-h-[2.5rem] max-h-20 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

// Export as client-only to prevent SSR crashes
export default dynamic(() => Promise.resolve(ChatPage), { ssr: false });
