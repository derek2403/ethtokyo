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
npm install pixi.js pixi-live2d-display
```

### 1.2 Live2D Model Setup
- Create `/public/model/` directory structure
- Place Live2D Cubism 4 model files:
  - `Hiyori.model3.json` (main model file)
  - `Hiyori.moc3` (model data)
  - `Hiyori.physics3.json` (physics settings)
  - Texture files (.png)
  - Motion files (.motion3.json)
- **Fallback**: If model unavailable, system creates placeholder graphics

### 1.3 File Structure Verification
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
- Use `"use client"` directive at top
- Import existing components: `Button` from `@/components/ui/button`
- Import utilities: `cn` from `@/lib/utils`
- Create responsive layout with CSS Grid or Flexbox

### 2.2 Layout Specifications
```jsx
// Layout Structure:
<div className="h-screen flex flex-col bg-background text-foreground">
  {/* Character Stage - Takes remaining space */}
  <div className="flex-1 relative">
    <canvas ref={canvasRef} className="w-full h-full" />
  </div>
  
  {/* Chat Panel - Fixed height bottom dock */}
  <div className="h-40 border-t border-border">
    {/* Chat UI components */}
  </div>
</div>
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

// In useEffect:
const app = new PIXI.Application();
await app.init({
  width: container.clientWidth,
  height: container.clientHeight,
  backgroundColor: 0x000000,
  backgroundAlpha: 0,
  antialias: true,
  autoStart: false
});

// Limit to 60 FPS
app.ticker.maxFPS = 60;
```

### 3.2 Live2D Model Loading
```jsx
let model = null;
let placeholderFace = null;

try {
  model = await Live2DModel.from('/model/Hiyori.model3.json');
  
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

### 3.3 Placeholder Face Implementation
```jsx
function createPlaceholderFace(app) {
  const face = new PIXI.Container();
  
  // Head circle
  const head = new PIXI.Graphics();
  head.circle(0, 0, 100);
  head.fill(0xffdbac);
  head.stroke({ color: 0x000000, width: 2 });
  
  // Eyes
  const leftEye = new PIXI.Graphics();
  leftEye.circle(-30, -20, 15);
  leftEye.fill(0x000000);
  
  const rightEye = new PIXI.Graphics();
  rightEye.circle(30, -20, 15);
  rightEye.fill(0x000000);
  
  // Mouth
  const mouth = new PIXI.Graphics();
  mouth.roundRect(-20, 20, 40, 10, 5);
  mouth.fill(0x000000);
  
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
  
  if (model?.expression) {
    try {
      model.expression(expressionName);
    } catch (e) {
      console.warn(`Expression ${expressionName} not available`);
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

### 7.2 Resize Handling
```jsx
useEffect(() => {
  const handleResize = throttle(() => {
    if (app && canvasRef.current) {
      const container = canvasRef.current.parentElement;
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
    if (app) {
      app.stop();
      app.destroy(true, { children: true });
    }
    
    // Clear global function
    if (window.pushStreamChunk) {
      delete window.pushStreamChunk;
    }
    
    // Clear any running timers
    streamingActive = false;
  };
}, []);
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
# 1. Install dependencies
npm install pixi.js pixi-live2d-display

# 2. Create model directory
mkdir -p public/model

# 3. Download Live2D sample model (Hiyori)
# Place files in public/model/ directory:
# - Hiyori.model3.json
# - Hiyori.moc3  
# - textures/*.png
# - motions/*.motion3.json

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
