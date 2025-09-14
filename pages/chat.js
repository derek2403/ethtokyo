// VTuber Live2D Chat Page - Modular Implementation
// Phase 5 Complete: Streaming Text Engine with Real-time Mouth Sync
import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Modular UI Components
import ChatHistory from '@/components/chat/ChatHistory';
import ChatInput from '@/components/chat/ChatInput';
import DebugOverlay from '@/components/chat/DebugOverlay';
import StreamingText from '@/components/chat/StreamingText';
import FeelingTodayModal from '@/components/FeelingTodayModal';

// Animation System
import { animationState, resetAnimationState } from '@/lib/animation/animationState';
import { updateIdleBehaviors, updateAnimationTransitions } from '@/lib/animation/idleBehaviors';
import { applyAnimationParameters, applyAnimationParametersAdditive } from '@/lib/animation/parameterControl';
import { triggerExpression } from '@/lib/animation/expressionSystem';

// Streaming Engine (Phase 5)
import { 
  initializeStreamingEngine, 
  startDemoStream, 
  streamTextWithTiming,
  isStreaming,
  cleanup as cleanupStreaming 
} from '@/lib/animation/streamingEngine';

// Live2D System
import { setupPixiWithLive2D, cleanupPixiApp, createThrottledResize, handlePixiResize } from '@/lib/live2d/pixiSetup';
import { loadLive2DModel, updateModelDisplay } from '@/lib/live2d/modelLoader';
import { createPlaceholderFace, animatePlaceholder, updatePlaceholderPosition } from '@/lib/live2d/placeholderFace';

// Debug utilities
import { listModelParameters, testParameter, findMouthParameters, createDebugControls } from '@/lib/debug/modelDebugger';

function ChatPage() {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // AI Chat state (from MultiAIChat)
  const [isLoading, setIsLoading] = useState(false);
  const [showFeelingTodayModal, setShowFeelingTodayModal] = useState(false);
  const [feelingTodayRating, setFeelingTodayRating] = useState(null);
  const [sessionId, setSessionId] = useState(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  
  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  
  // System state
  const [app, setApp] = useState(null);
  const [model, setModel] = useState(null);
  const [placeholderFace, setPlaceholderFace] = useState(null);
  const [cubismLoaded, setCubismLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const animationsEnabledRef = useRef(false);

  // References
  const canvasContainerRef = useRef(null);

  // Add message function
  const addMessage = (text, isUser = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-open chat on new messages
    if (!isChatOpen) setIsChatOpen(true);
  };

  // PixiJS and Live2D initialization
  useEffect(() => {
    const live2DCubismCoreAvailable = typeof window !== 'undefined' && window.Live2DCubismCore;
    
    if (!canvasContainerRef.current || !cubismLoaded || !live2DCubismCoreAvailable) {
      if (cubismLoaded && !live2DCubismCoreAvailable) {
        setDebugInfo('Waiting for Live2DCubismCore global...');
      }
      return;
    }

    let pixiApp = null;
    let pixiModel = null;
    let pixiPlaceholder = null;

    const initializeSystem = async () => {
      try {
        setDebugInfo('Setting up PixiJS and Live2D...');
        
        // Setup PixiJS with Live2D
        const { app: newApp, Live2DModel } = await setupPixiWithLive2D(canvasContainerRef.current);
        pixiApp = newApp;
        setApp(pixiApp);
        setDebugInfo('PixiJS ready, loading Live2D model...');

        // Load Live2D model
        pixiModel = await loadLive2DModel('/model/Hiyori/hiyori_pro_jp.model3.json', pixiApp, Live2DModel);
        
        if (pixiModel) {
          setModel(pixiModel);
          setDebugInfo('Live2D model loaded successfully!');
          
          // Debug: List all model parameters
          console.log('🔍 Analyzing loaded model parameters...');
          const parameters = listModelParameters(pixiModel);
          const mouthParams = findMouthParameters(pixiModel);
          
          // Create global debug controls
          if (typeof window !== 'undefined') {
            window.debugModel = createDebugControls(pixiModel);
            console.log('🛠️ Debug controls available: window.debugModel');
          }
          
          // Initialize streaming engine with model
          initializeStreamingEngine(pixiModel);
          
          // Try to make MotionPriority available globally for streaming system
          setTimeout(() => {
            try {
              // Import MotionPriority from pixi-live2d-display
              import('pixi-live2d-display').then((Live2DModule) => {
                if (Live2DModule.MotionPriority) {
                  window.MotionPriority = Live2DModule.MotionPriority;
                  console.log('✅ MotionPriority made available globally');
                } else {
                  console.log('MotionPriority not found in pixi-live2d-display module');
                }
              }).catch((e) => {
                console.log('Could not import pixi-live2d-display module:', e.message);
              });
            } catch (e) {
              console.log('Dynamic import not supported, using fallback');
            }
          }, 500);
          
          // Verify streaming function is available
          setTimeout(() => {
            const hasStreamFn = typeof window !== 'undefined' && typeof window.pushStreamChunk === 'function';
            console.log('🎤 Streaming function available:', hasStreamFn);
            if (!hasStreamFn) {
              console.error('❌ window.pushStreamChunk not available!');
            }
          }, 1000);
            } else {
          // Create placeholder fallback
          setDebugInfo('Live2D failed, creating placeholder...');
          const PIXI = await import('pixi.js');
          pixiPlaceholder = createPlaceholderFace(pixiApp, PIXI);
          pixiApp.stage.addChild(pixiPlaceholder);
          setPlaceholderFace(pixiPlaceholder);
        }

        // Setup animation loop with multiple timing strategies for mouth visibility fix
        const PIXI = await import('pixi.js');
        
        // Strategy 1: Regular ticker with different priority levels
        const updateFn = (ticker) => {
          const deltaMS = ticker.deltaMS;
          
          // Only animate when enabled
          if (!animationsEnabledRef.current) return;
          
          // Update behaviors and transitions
          // Update only eye/mouth transitions to avoid head popping
          updateIdleBehaviors(deltaMS, animationState, pixiModel);
          const prevAngles = { x: animationState.headAngleX, y: animationState.headAngleY, z: animationState.headAngleZ };
          updateAnimationTransitions(deltaMS, animationState);
          // Freeze head deltas to zero (temporarily) until we confirm safe ranges
          animationState.headAngleX = 0;
          animationState.headAngleY = 0;
          animationState.headAngleZ = 0;

          // Only maintain mouth baseline when actively streaming/speaking
          // During idle, let mouth rest naturally at 0
          const isCurrentlyStreaming = isStreaming();
          
          if (isCurrentlyStreaming && animationState.mouthTarget < 0.15) {
            animationState.mouthTarget = 0.15;
          }
          
          // Apply to model or placeholder
          if (pixiModel) {
            // Try additive parameter writing first for better resistance to internal resets
            applyAnimationParametersAdditive(animationState, pixiModel);
          } else if (pixiPlaceholder) {
            animatePlaceholder(pixiPlaceholder, {
              eyeBlink: animationState.eyeBlinkCurrent,
              mouthOpen: animationState.mouthCurrent,
              headAngle: animationState.headAngleX
            });
          }
        };
        
        // Strategy 2: Post-update parameter forcing function (only when actively speaking)
        const forceParametersAfterUpdate = (ticker) => {
          // Only run when animations are enabled and model exists
          if (!animationsEnabledRef.current || !pixiModel?.internalModel?.coreModel) return;
          
          // Only force parameters when actively speaking/streaming
          const currentTarget = animationState.mouthTarget || 0;
          const isActiveMouth = currentTarget > 0.2;
          
          if (!isActiveMouth) return; // Don't interfere during idle
          
          // Force mouth visibility parameters AFTER Live2D internal processing
          try {
            const core = pixiModel.internalModel.coreModel;
            
            // Force ParamMouthForm to ensure mouth shape is visible during active speech
            const forceMouthForm = 0.65;
            if (typeof core.setParameterValueById === 'function') {
              core.setParameterValueById('ParamMouthForm', forceMouthForm, 1.0);
            }
            
            // Also force a minimum mouth opening if we're supposed to be talking
            if (currentTarget > 0.2) {
              const forceMinMouth = Math.max(0.3, currentTarget);
              if (typeof core.setParameterValueById === 'function') {
                core.setParameterValueById('ParamMouthOpenY', forceMinMouth, 1.0);
                console.log(`🚨 Emergency mouth force: ${forceMinMouth.toFixed(3)} (target was ${currentTarget.toFixed(3)})`);
              }
            }
          } catch (e) {
            console.warn('Emergency mouth force failed:', e);
          }
        };
        
        // Add primary animation loop at NORMAL priority (after Live2D internal HIGH priority updates)
        pixiApp.ticker.add(updateFn, undefined, PIXI.UPDATE_PRIORITY.NORMAL);
        
        // Add emergency parameter forcing at LOW priority (after everything else)
        pixiApp.ticker.add(forceParametersAfterUpdate, undefined, PIXI.UPDATE_PRIORITY.LOW);
        
        // Strategy 3: Try to hook into model's frame event if available (only when active)
        if (pixiModel?.on) {
          try {
            pixiModel.on('frame', () => {
              if (animationsEnabledRef.current) {
                const isActiveMouth = (animationState.mouthTarget || 0) > 0.2;
                if (isActiveMouth) {
                  console.log('🎯 Model frame event - applying parameters post-update');
                  applyAnimationParametersAdditive(animationState, pixiModel);
                }
              }
            });
            console.log('✅ Successfully hooked into model frame events');
          } catch (e) {
            console.warn('Could not hook into model frame events:', e);
          }
        }

        pixiApp.start();
        console.log('VTuber system initialized successfully');

      } catch (error) {
        console.error('System initialization failed:', error);
        setDebugInfo(`Initialization failed: ${error.message}`);
      }
    };

    initializeSystem();

    // Cleanup
    return () => {
      cleanupStreaming();
      cleanupPixiApp(pixiApp);
    };
  }, [cubismLoaded]);

  // Resize handling
  useEffect(() => {
    if (!app) return;
    
    const handleResize = createThrottledResize(() => {
      handlePixiResize(app, canvasContainerRef.current);
      
        if (model) {
        updateModelDisplay(model, app);
        } else if (placeholderFace) {
        updatePlaceholderPosition(placeholderFace, app);
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [app, model, placeholderFace]);

  // AI Chat configuration
  const aiConfig = {
    ai1: { name: 'AI1 - Clinical Psychologist', color: 'bg-purple-500', endpoint: '/api/ai1' },
    ai2: { name: 'AI2 - Psychiatrist', color: 'bg-blue-500', endpoint: '/api/ai2' },
    ai3: { name: 'AI3 - Holistic Counselor', color: 'bg-green-500', endpoint: '/api/ai3' },
    judge: { name: 'AI Judge - Final Synthesis', color: 'bg-yellow-500', endpoint: '/api/judge' }
  };

  // AI Chat functions
  const sendMessage = async (speaker, message, roundType = 'answer') => {
    setIsLoading(true);
    
    try {
      const response = await fetch(aiConfig[speaker].endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          model: 'gpt-4o-mini',
          sessionId,
          round: roundType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newMessage = {
        id: Date.now(),
        speaker: speaker,
        content: data.text,
        timestamp: new Date().toLocaleTimeString(),
        round: roundType
      };
      
      setMessages(prev => [...prev, newMessage]);
      return data.text;
    } catch (error) {
      console.error(`Error sending message to ${speaker}:`, error);
      const errorMessage = {
        id: Date.now(),
        speaker: speaker,
        content: `Sorry, there was an error processing the message.`,
        timestamp: new Date().toLocaleTimeString(),
        round: roundType
      };
      setMessages(prev => [...prev, errorMessage]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Get AI response from the first AI (Clinical Psychologist)
    const { buildRound1Prompt } = await import('@/prompt_engineering/prompts');
    const question = buildRound1Prompt(inputValue);
    
    const aiResponse = await sendMessage('ai1', question, 'round1');
    
    if (aiResponse) {
      // Add AI response to chat history
      addMessage(aiResponse, false);
      
      // Display and stream the response through StreamingText component
      setStreamingText(aiResponse);
      setIsStreamingActive(true);
      
      if (animationsEnabled) {
        // Stop any current idle motions before starting stream
        if (model?.internalModel?.motionManager) {
          try {
            const motionManager = model.internalModel.motionManager;
            if (motionManager.stopAllMotions) {
              motionManager.stopAllMotions();
              console.log('🛑 Stopped all motions before AI response stream');
            }
          } catch (e) {
            console.warn('Could not stop motions before streaming:', e);
          }
        }
        
        // Use streamTextWithTiming for mouth sync animation
        streamTextWithTiming(aiResponse, {
          baseSpeed: 15,
          onComplete: () => {
            console.log('AI response streaming completed');
            setIsStreamingActive(false);
            
            // Clear streaming text after a delay
            setTimeout(() => setStreamingText(''), 3000);
            
            // Re-enable idle motions after streaming is complete
            setTimeout(() => {
              if (model?.motion) {
                try {
                  model.motion('Idle');
                  console.log('♻️ Restarted idle motion after AI response stream');
                } catch (e) {
                  console.warn('Could not restart idle motion:', e);
                }
              }
            }, 500);
          }
        });
      } else {
        // If animations disabled, just show the text without mouth sync
        setTimeout(() => {
          setIsStreamingActive(false);
          setTimeout(() => setStreamingText(''), 3000);
        }, aiResponse.length * 50); // Simulate streaming time
      }
    }
    
    setInputValue('');
  };

  const handleFeelingTodayRating = (rating) => {
    setFeelingTodayRating(rating);
    console.log('Feeling today rating:', rating);
  };

  // Show feeling modal on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFeelingTodayModal(true);
    }, 2000); // Show after 2 seconds
    
    return () => clearTimeout(timer);
  }, []);

  const handleDemoStream = () => {
    addMessage("Demo stream starting...", false);
    
    if (animationsEnabled) {
      const demoText = "Hello! I'm your virtual assistant. How can I help you today? I can express emotions and respond naturally!";
      
      setStreamingText(demoText);
      setIsStreamingActive(true);
      
      // Stop any current idle motions before starting stream
      if (model?.internalModel?.motionManager) {
        try {
          // Stop all current motions to prevent interference
          const motionManager = model.internalModel.motionManager;
          if (motionManager.stopAllMotions) {
            motionManager.stopAllMotions();
            console.log('🛑 Stopped all motions before demo stream');
          }
        } catch (e) {
          console.warn('Could not stop motions before streaming:', e);
        }
      }
      
      startDemoStream(
        demoText,
        18, // Characters per second
        () => {
          addMessage("Demo animation complete!", false);
          setIsStreamingActive(false);
          setTimeout(() => setStreamingText(''), 2000); // Clear after 2s
          
          // Re-enable idle motions after streaming is complete
          setTimeout(() => {
            if (model?.motion) {
              try {
                // Restart idle motion with low priority
                model.motion('Idle');
                console.log('♻️ Restarted idle motion after demo stream');
              } catch (e) {
                console.warn('Could not restart idle motion:', e);
              }
            }
          }, 1000);
        }
      );
    } else {
      addMessage("Please enable animations first!", false);
    }
  };

  const handleExpressionTest = (expression) => {
    const success = triggerExpression(expression, model);
    addMessage(`Testing ${expression} expression! ${success ? '✅' : '❌'}`, false);
  };

  const handleToggleAnimations = () => {
    const newState = !animationsEnabled;
    setAnimationsEnabled(newState);
    animationsEnabledRef.current = newState;
    
    // Reset animation state when enabling
    if (newState && model) {
      resetAnimationState(model);
    }
    
    addMessage(`Animations ${newState ? 'enabled' : 'disabled'}`, false);
  };

  // Manual mouth test for debugging
  const handleMouthTest = () => {
    if (!animationsEnabled) {
      addMessage("Please enable animations first!", false);
      return;
    }
    
    addMessage("Testing mouth movement...", false);
    console.log('🧪 Starting mouth test...');
    
    if (model && typeof window !== 'undefined' && window.debugModel) {
      // Test all potential mouth parameters
      console.log('🔍 Testing all mouth parameters...');
      window.debugModel.testMouthParams();
      
      // Also test animation state
      console.log('🎯 Testing animation state...');
      animationState.mouthTarget = 0.8;
      console.log('Set mouthTarget to 0.8, current:', animationState.mouthCurrent);
      
      setTimeout(() => { 
        animationState.mouthTarget = 0; 
        console.log('Set mouthTarget to 0, current:', animationState.mouthCurrent);
      }, 500);
      setTimeout(() => { 
        animationState.mouthTarget = 0.5; 
        console.log('Set mouthTarget to 0.5, current:', animationState.mouthCurrent);
      }, 1000);
      setTimeout(() => { 
        animationState.mouthTarget = 0; 
        console.log('Set mouthTarget to 0, current:', animationState.mouthCurrent);
        addMessage("Mouth test complete! Check console for details.", false); 
      }, 1500);
    } else {
      addMessage("Model not available for testing!", false);
    }
  };

  return (
    <>
      {/* Load Cubism Core */}
      <Script 
        src="/libs/live2dcubismcore.min.js" 
        strategy="afterInteractive"
        onReady={() => {
          console.log('Cubism Core loaded and ready');
          setDebugInfo('Cubism Core ready, initializing system...');
          setCubismLoaded(true);
        }}
        onError={(e) => {
          console.error('Failed to load Cubism Core:', e);
          setDebugInfo('Cubism Core failed to load');
        }}
      />
      
      <div 
        className="h-screen w-screen relative text-foreground overflow-hidden"
        style={{
          backgroundImage: 'url(/background/room.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Character Stage - positioned to stand on floor */}
        <div className="absolute inset-0 bottom-20">
          <div 
            ref={canvasContainerRef} 
            className="w-full h-full"
            style={{
              transform: 'translateX(-17%)', 
              transformOrigin: 'center bottom'
            }}
          />
          
          {/* Debug Overlay */}
          <DebugOverlay
            debugInfo={debugInfo}
            cubismLoaded={cubismLoaded}
            app={app}
            model={model}
            placeholderFace={placeholderFace}
            animationsEnabled={animationsEnabled}
            visible={true}
          />
          
          {/* Streaming Text Display */}
          {streamingText && (
            <div className="absolute bottom-4 left-4 right-4 z-30">
              <StreamingText
                text={streamingText}
                speed={18}
                isStreaming={isStreamingActive}
                className="max-w-md mx-auto"
              />
            </div>
          )}
        </div>
      
        {/* Chat History Panel */}
        <ChatHistory
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          messages={messages}
          onDemoStream={handleDemoStream}
          onExpression={handleExpressionTest}
          animationsEnabled={animationsEnabled}
          onToggleAnimations={handleToggleAnimations}
          onMouthTest={handleMouthTest}
        />
        
        {/* Chat Input */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          placeholder="Share your mental health concern..."
          disabled={isLoading}
        />
        
        {/* Feeling Today Modal */}
        <FeelingTodayModal
          isOpen={showFeelingTodayModal}
          onClose={() => setShowFeelingTodayModal(false)}
          onRatingSubmit={handleFeelingTodayRating}
        />
      </div>
    </>
  );
}

// Export as client-only to prevent SSR crashes
export default dynamic(() => Promise.resolve(ChatPage), { ssr: false });