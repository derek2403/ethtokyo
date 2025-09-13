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

// Live2D parameter control
function setModelParameter(paramName, value, model) {
  if (model?.internalModel?.coreModel) {
    try {
      model.internalModel.coreModel.setParameterValueById(paramName, value);
    } catch (e) {
      console.warn(`Parameter ${paramName} not found`);
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
          setDebugInfo('Live2D model loaded successfully!');

          // Scale and position model
          const scale = Math.min(
            pixiApp.screen.width / pixiModel.width,
            pixiApp.screen.height / pixiModel.height
          ) * 0.8;
          
          pixiModel.scale.set(scale);
          pixiModel.anchor.set(0.5, 0.5);
          
          // Center the model in the screen
          const centerX = pixiApp.screen.width / 2;
          const centerY = pixiApp.screen.height / 2;
          pixiModel.position.set(centerX, centerY);
          
          console.log(`Model positioned at: ${centerX}, ${centerY} (screen: ${pixiApp.screen.width}x${pixiApp.screen.height})`);
          
          pixiApp.stage.addChild(pixiModel);
          setModel(pixiModel);
          
          console.log('Live2D model added to stage successfully');
        } catch (error) {
          console.warn('Live2D model failed to load, using placeholder:', error);
          setDebugInfo('Live2D model failed, showing placeholder face');
          
          // Create placeholder face fallback
          pixiPlaceholder = createPlaceholderFace(pixiApp, PIXI);
          pixiApp.stage.addChild(pixiPlaceholder);
          setPlaceholderFace(pixiPlaceholder);
          console.log('Placeholder face created and added to stage');
        }

        // Start the application
        pixiApp.start();
        console.log('PixiJS application started');

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

  // Demo stream function placeholder
  const startDemoStream = () => {
    addMessage("Demo stream starting...", false);
    // This will be implemented in Phase 5
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startDemoStream}
                >
                  Demo Stream
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
