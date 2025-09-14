# VTuber Live2D Chat Page – Complete Implementation Plan

## Overview
Create a single-page Next.js application (`pages/chat.js`) that renders a Live2D avatar with text-driven animations and a chat interface. The page must be self-contained with no external dependencies beyond the specified libraries.

## Project Context
- **Framework**: Next.js (Pages Router) with JavaScript (no TypeScript)
- **Existing Setup**: shadcn/ui components, Tailwind CSS, Inter font family
- **Theme**: Uses CSS custom properties with light/dark mode support
- **Required Libraries**: pixi.js v8, pixi-live2d-display (Cubism 4)

---

## Phase 1: Project Setup & Dependencies

### 1.1 Install Required Dependencies
```bash
npm install pixi.js@6.5.10 pixi-live2d-display
```

### 1.2 Cubism Core Runtime Setup
**File**: Move `/public/live2dcubismcore.min.js` to `/public/libs/live2dcubismcore.min.js`

**Requirements**:
- Must be loaded before Live2D model creation
- Use Next.js Script component with `strategy="beforeInteractive"`
- Add to pages/_document.js or load directly in chat.js

### 1.3 Live2D Model Setup ✅ ALREADY COMPLETE
Your Hiyori model is already set up correctly at `/public/model/Hiyori/`:
- `hiyori_pro_jp.model3.json` (main model file)
- `hiyori_pro_jp.moc3` (model data)  
- `hiyori_pro_jp.physics3.json` (physics settings)
- `hiyori_pro_jp.2048/texture_00.png`, `texture_01.png` (textures)
- `motion/` directory with 10 motion files
- **Available motions**: "Idle" (3 variants), "Flick", "FlickDown", "FlickUp", "Tap" (2 variants), "Tap@Body", "Flick@Body"
- **Available parameters**: ParamMouthOpenY, ParamEyeLOpen, ParamEyeROpen, ParamAngleX/Y/Z, etc.
- **Fallback**: If model loading fails, system creates placeholder graphics

### 1.4 File Structure Verification
```
pages/
  chat.js           # New file to create
components/ui/
  button.jsx        # Existing component to reuse
styles/
  globals.css       # Existing theme tokens
```

---

## Phase 2: Page Foundation & Layout

### 2.1 Create Base Page Structure
**File**: `pages/chat.js`

**Requirements**:
- **NO** `"use client"` directive (this is Pages Router, not App Router)
- Make page client-only with dynamic import to prevent SSR issues
- Import existing components: `Button` from `@/components/ui/button`
- Import utilities: `cn` from `@/lib/utils`
- Load Cubism Core runtime with Next.js Script component
- Create responsive layout with CSS Grid or Flexbox

**Client-Only Pattern**:
```jsx
import dynamic from 'next/dynamic'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display'

// Main component implementation here...
function ChatPage() {
  // Component logic
}

// Export as client-only to prevent SSR crashes
export default dynamic(() => Promise.resolve(ChatPage), { ssr: false })
```

### 2.2 Layout Specifications
```jsx
import Script from 'next/script'

// Layout Structure:
<>
  {/* Load Cubism Core before anything else */}
  <Script 
    src="/libs/live2dcubismcore.min.js" 
    strategy="beforeInteractive"
    onLoad={() => console.log('Cubism Core loaded')}
  />
  
  <div className="h-screen flex flex-col bg-background text-foreground">
    {/* Character Stage - Takes remaining space */}
    <div className="flex-1 relative">
      <div ref={canvasContainerRef} className="w-full h-full" />
      {/* No <canvas> element - Pixi will create and append one */}
    </div>
    
    {/* Chat Panel - Fixed height bottom dock */}
    <div className="h-40 border-t border-border">
      {/* Chat UI components */}
    </div>
  </div>
</>
```

### 2.3 Inline UI Components
Since only Button exists, inline minimal Card and Textarea:

```jsx
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
```

---

## Phase 3: PixiJS & Live2D Integration

### 3.1 Graphics Engine Setup
```jsx
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

// In useEffect (PixiJS v6.5.10 syntax):
const app = new PIXI.Application({
  width: container.clientWidth,
  height: container.clientHeight,
  backgroundColor: 0x000000,
  backgroundAlpha: 0,
  antialias: true,
  autoStart: false
});

// Append Pixi-created canvas to container
container.appendChild(app.view);

// Limit to 60 FPS
app.ticker.maxFPS = 60;
```

### 3.2 Live2D Model Loading
```jsx
let model = null;
let placeholderFace = null;

try {
  model = await Live2DModel.from('/model/Hiyori/hiyori_pro_jp.model3.json');
  
  // Scale and position model
  const scale = Math.min(
    app.screen.width / model.width,
    app.screen.height / model.height
  ) * 0.8;
  
  model.scale.set(scale);
  model.anchor.set(0.5, 0.5);
  model.position.set(app.screen.width / 2, app.screen.height / 2);
  
  app.stage.addChild(model);
} catch (error) {
  console.warn('Live2D model failed to load, using placeholder:', error);
  placeholderFace = createPlaceholderFace(app);
  app.stage.addChild(placeholderFace);
}
```

### 3.3 Placeholder Face Implementation (PixiJS v6 API)
```jsx
function createPlaceholderFace(app) {
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
```

---

## Phase 4: Animation System

### 4.1 Parameter Control Interface
```jsx
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
```

### 4.2 Animation State Management
```jsx
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
  
  // Expression states
  expressionTarget: 'neutral',
  expressionTimer: 0
};
```

### 4.3 Idle Behaviors
```jsx
function updateIdleBehaviors(deltaMS, state) {
  // Random eye blink every 2-4 seconds
  state.eyeBlinkTimer += deltaMS;
  if (state.eyeBlinkTimer > (2000 + Math.random() * 2000)) {
    state.eyeBlinkTimer = 0;
    // Trigger blink animation
    state.eyeBlinkTarget = 0;
    setTimeout(() => { state.eyeBlinkTarget = 1; }, 120);
  }
  
  // Head sway
  state.headSwayTime += deltaMS * 0.001;
  state.headAngleX = Math.sin(state.headSwayTime * 0.5) * 5;
  state.headAngleY = Math.cos(state.headSwayTime * 0.3) * 3;
}
```

---

## Phase 5: Streaming Text Engine

### 5.1 Stream Processing
```jsx
let streamBuffer = '';
let currentWord = '';
let streamingActive = false;

// Global function for external streaming
window.pushStreamChunk = function(chunk) {
  streamBuffer += chunk;
  processStreamBuffer();
};

function processStreamBuffer() {
  if (!streamingActive) return;
  
  for (let char of streamBuffer) {
    if (/[aeiouAEIOU]/.test(char)) {
      // Vowel - wider mouth
      animationState.mouthTarget = 0.8;
    } else if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/.test(char)) {
      // Consonant - smaller mouth
      animationState.mouthTarget = 0.4;
    } else if (/[.,!?;:]/.test(char)) {
      // Punctuation - pause
      animationState.mouthTarget = 0;
      
      // Quick emotes
      if (char === '!') triggerExpression('smile');
      else if (char === '?') triggerExpression('surprised');
      else if (char === ',') triggerExpression('relaxed');
    } else {
      // Space or other - neutral
      animationState.mouthTarget = 0;
    }
  }
  
  streamBuffer = '';
}
```

### 5.2 Expression System
```jsx
function triggerExpression(expressionName) {
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
    } catch (e) {
      console.warn(`Motion ${expressionName} not available`);
    }
  }
}
```

### 5.3 Demo Streaming Function
```jsx
function startDemoStream() {
  const demoText = "Hello! I'm your virtual assistant. How can I help you today? I can express emotions and respond naturally!";
  let index = 0;
  streamingActive = true;
  
  const streamInterval = setInterval(() => {
    if (index >= demoText.length) {
      clearInterval(streamInterval);
      streamingActive = false;
      return;
    }
    
    window.pushStreamChunk(demoText[index]);
    index++;
  }, 50); // 50ms per character
}
```

---

## Phase 6: Chat Interface

### 6.1 Chat State Management
```jsx
const [messages, setMessages] = useState([]);
const [inputValue, setInputValue] = useState('');

const addMessage = (text, isUser = false) => {
  const newMessage = {
    id: Date.now(),
    text,
    isUser,
    timestamp: new Date().toLocaleTimeString()
  };
  setMessages(prev => [...prev, newMessage]);
};
```

### 6.2 Chat UI Implementation
```jsx
<Card className="h-40 flex flex-col">
  {/* Chat Header */}
  <div className="px-4 py-2 border-b border-border">
    <div className="flex justify-between items-center">
      <h3 className="font-semibold">Chat with VTuber</h3>
      <Button 
        variant="outline" 
        size="sm"
        onClick={startDemoStream}
      >
        Demo Stream
      </Button>
    </div>
  </div>
  
  {/* Messages */}
  <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
  </div>
  
  {/* Input */}
  <div className="border-t border-border p-4">
    <div className="flex gap-2">
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type a message..."
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
</Card>
```

---

## Phase 7: Animation Loop & Cleanup

### 7.1 Main Animation Loop
```jsx
useEffect(() => {
  if (!app) return;
  
  app.ticker.add((ticker) => {
    const deltaMS = ticker.deltaMS;
    
    // Update idle behaviors
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
    
    // Apply to model or placeholder
    if (model) {
      setModelParameter('ParamEyeLOpen', animationState.eyeBlinkCurrent, model);
      setModelParameter('ParamEyeROpen', animationState.eyeBlinkCurrent, model);
      setModelParameter('ParamMouthOpenY', animationState.mouthCurrent, model);
      setModelParameter('ParamAngleX', animationState.headAngleX, model);
      setModelParameter('ParamAngleY', animationState.headAngleY, model);
    } else if (placeholderFace) {
      animatePlaceholder(placeholderFace, {
        eyeBlink: animationState.eyeBlinkCurrent,
        mouthOpen: animationState.mouthCurrent,
        headAngle: animationState.headAngleX
      });
    }
  });
  
  app.start();
}, [app, model, placeholderFace]);
```

### 7.2 Resize Handling (with simple throttle)
```jsx
// Simple throttle helper
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

useEffect(() => {
  const handleResize = throttle(() => {
    if (app && canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      app.renderer.resize(container.clientWidth, container.clientHeight);
      
      // Reposition model/placeholder
      if (model) {
        model.position.set(app.screen.width / 2, app.screen.height / 2);
      } else if (placeholderFace) {
        placeholderFace.position.set(app.screen.width / 2, app.screen.height / 2);
      }
    }
  }, 100);
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [app, model, placeholderFace]);
```

### 7.3 Cleanup on Unmount
```jsx
useEffect(() => {
  return () => {
    // Stop all streaming
    streamingActive = false;
    
    // Clear any running intervals/timeouts
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    
    // Destroy Pixi app
    if (app) {
      app.stop();
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
    
    // Clear global function
    if (typeof window !== 'undefined' && window.pushStreamChunk) {
      delete window.pushStreamChunk;
    }
  };
}, [app]);
```

---

## Phase 8: Testing & Validation

### 8.1 Required Tests
1. **Model Loading**: Verify both successful load and fallback scenarios
2. **Animation**: Check mouth movements with streaming text
3. **Performance**: Maintain >45 FPS during animations
4. **Responsive**: Canvas resizes properly on window changes
5. **Theme**: Matches existing dark/light mode styling
6. **Cleanup**: No memory leaks or console errors on page unmount

### 8.2 Demo Script (60 seconds)
```
1. [0-10s] Load page, show model/placeholder loading
2. [10-20s] Click "Demo Stream" - watch mouth sync to text
3. [20-30s] Type message, send - see it appear in chat
4. [30-40s] Resize window - canvas adapts responsively
5. [40-50s] Test expressions by typing "!", "?", ","
6. [50-60s] Show idle behaviors - blinking, head sway
```

### 8.3 Setup Instructions
```bash
# 1. Install dependencies (specific versions)
npm install pixi.js@6.5.10 pixi-live2d-display

# 2. Move Cubism Core to proper location
mv public/live2dcubismcore.min.js public/libs/live2dcubismcore.min.js

# 3. Live2D model already available at:
# /public/model/Hiyori/hiyori_pro_jp.model3.json
# Motion groups: "Idle", "Flick", "FlickDown", "FlickUp", "Tap", "Tap@Body", "Flick@Body"
# Parameters: ParamMouthOpenY, ParamEyeLOpen, ParamEyeROpen

# 4. Start development server
npm run dev

# 5. Navigate to /chat
```

---

## Implementation Notes

- **No TypeScript**: Use `.js` extension and JavaScript syntax only
- **No External Fonts**: Use existing Inter font family from globals.css
- **Theme Integration**: All colors must use CSS custom properties from existing theme
- **Self-Contained**: All UI components inlined within the single file
- **Error Handling**: Graceful fallbacks for missing models or failed loads
- **Performance**: Target 60 FPS with 45+ FPS minimum during animations
- **SSR Prevention**: Use dynamic import with `{ ssr: false }` to prevent server-side crashes
- **PixiJS v6.5.10**: Use v6 API syntax (beginFill/drawCircle/endFill, not chained methods)
- **Canvas Handling**: Let Pixi create the canvas, append to container div
- **Cubism Core**: Must load before Live2D model creation via Script component
