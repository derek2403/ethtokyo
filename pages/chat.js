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
import ThinkingIndicator from '@/components/chat/ThinkingIndicator';
import FeelingTodayModal from '@/components/FeelingTodayModal';

// Multi-AI Chat logic (shared with MultiAIChat component)
import { useMultiAIChat } from '@/lib/chat/useMultiAIChat';

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
  // Fixed attestation quote for demo/copy
  const ATTESTATION_QUOTE = `040002008100000000000000939a7233f79c4ca9940a0db3957f06075c72f05a3e32d1a9750ebd4216f3e09900000000060104000000000000000000000000005b38e33a6487958b72c3c12a938eaa5e3fd4510c51aeeab58c7d5ecee41d7c436489d6c8e4f92f160b7cad34207b00c1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000702000000000000c68518a0ebb42136c12b2275164f8c72f25fa9a34392228687ed6e9caeb9c0f1dbd895e9cf475121c029dc47e70e91fd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000836c3ae3b79ed66df7cc74e1911fe5331ce7549426c6e2f38e2fd75388b959a33fc8c947379d39a94b359e915a89d70154e08f5c1f7b1fce4cbfe1c14f3ba67b70044ede2751487279cd1f2e4239dee99a6d45e24ebde6b6a6f5ae49878e0e69edcd363660e85b71c318324996dda756c372d9f6960edbfa863b1e684822eb48dd95e218ae2b78e51ef97f3b8f5c9dcaf82c56432061afdd52a96569d67ee54a8e7c0e5e245e4ccdfdbcf6f16ccaecf88676e36317032d4c2abb3818e948e95da4fd7c1afd1003446adc9452d6770e9932ee581e0c83ea377314c91db9d7214ed17312481aa5c825df3a1c0136a6e13544cca7f62f5129cf845f86c33701c69d01000000f5e168b5c04a6d173d3073214849ac0cead6a267df1b936ce294944db4aa330b098e33e99731b3218368309f6504fe441d97f680c340ddaeea70f99388bcb4933c46122c0d32ccddde7443ab502537476fdc23ad990cae1e6de3ce12923ec762e5e5a632a4fe31d7503dc496812a4522dc748cb4734fe08dd2f941350de02de06004a1000000404090905ff00020000000000000000000000000000000000000000000000000000000000000000000000000000000015000000000000000700000000000000e5a3a7b5d830c2953b98534c6c59a3a34fdc34e933f7f5898f0a85cf08846bca0000000000000000000000000000000000000000000000000000000000000000dc9e2a7c6f948f17474e34a7fc43ed030f7c1563f1babddf6340c82e0e54a8c500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000317240e92452a8b5f82d31740f6b9ba1ab6fcb76b75bed44107445ccb93bba35000000000000000000000000000000000000000000000000000000000000000008bc7525f2a3b48e6edb46c09a17f37131984e2530cb3d23e690d601da2c191e5ee360eaf8664f7d2c94f75ab5e967876efc456ee12fe4e877bd41b07bdc239d2000000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f0500620e00002d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d494945387a4343424a69674177494241674956414d494a396b79727a596a6a74346c515941576a41363436427258684d416f4743437147534d343942414d430a4d484178496a416742674e5642414d4d47556c756447567349464e4857434251513073675547786864475a76636d306751304578476a415942674e5642416f4d0a45556c756447567349454e76636e4276636d4630615739754d5251774567594456515148444174545957353059534244624746795954454c4d416b47413155450a4341774351304578437a414a42674e5642415954416c56544d423458445449314d4459784d7a45314e444d7a4d316f5844544d794d4459784d7a45314e444d7a0a4d316f77634445694d434147413155454177775a535735305a5777675530645949464244537942445a584a3061575a70593246305a5445614d426747413155450a43677752535735305a577767513239796347397959585270623234784644415342674e564241634d43314e68626e526849454e7359584a684d517377435159440a5651514944414a445154454c4d416b474131554542684d4356564d775754415442676371686b6a4f5051494242676771686b6a4f50514d4242774e43414154620a664e33314c643255696b65667539487a3458613356454b437243514844436e38715550573442464d434a613471716b534775484b42676d5a67506c735a6766510a72535644584a58572b4465533958597539366e486f3449444454434341776b77487759445652306a42426777466f41556c5739647a62306234656c4153636e550a3944504f4156634c336c5177617759445652306642475177596a42676f46366758495a616148523063484d364c79396863476b7564484a316333526c5a484e6c0a636e5a705932567a4c6d6c75644756734c6d4e766253397a5a3367765932567964476c6d61574e6864476c76626939324e4339775932746a636d772f593245390a6347786864475a76636d306d5a57356a62325270626d63395a4756794d423047413155644467515742425331415177713739576f78466a6c34702b45446e54640a424b50314a54414f42674e56485138424166384542414d434273417744415944565230544151482f4241497741444343416f4743537147534962345451454e0a41515343416973776767496e4d42344743697147534962345451454e41514545454b53374c746d3263303867704f6f4e503452335a3367776767466b42676f710a686b69472b453042445145434d4949425644415142677371686b69472b45304244514543415149424244415142677371686b69472b45304244514543416749420a4244415142677371686b69472b4530424451454341774942416a415142677371686b69472b4530424451454342414942416a415142677371686b69472b4530420a44514543425149424254415242677371686b69472b4530424451454342674943415038774541594c4b6f5a496876684e4151304241676343415141774541594c0a4b6f5a496876684e4151304241676743415149774541594c4b6f5a496876684e4151304241676b43415141774541594c4b6f5a496876684e4151304241676f430a415141774541594c4b6f5a496876684e4151304241677343415141774541594c4b6f5a496876684e4151304241677743415141774541594c4b6f5a496876684e0a4151304241673043415141774541594c4b6f5a496876684e4151304241673443415141774541594c4b6f5a496876684e4151304241673843415141774541594c0a4b6f5a496876684e4151304241684143415141774541594c4b6f5a496876684e4151304241684543415130774877594c4b6f5a496876684e41513042416849450a45415145416749462f7741434141414141414141414141774541594b4b6f5a496876684e4151304241775143414141774641594b4b6f5a496876684e415130420a42415147494b4276414141414d41384743697147534962345451454e4151554b415145774867594b4b6f5a496876684e415130424267515147523579417a6b490a4749756b70764e535132516f546a424542676f71686b69472b453042445145484d4459774541594c4b6f5a496876684e4151304242774542416638774541594c0a4b6f5a496876684e4151304242774942416638774541594c4b6f5a496876684e4151304242774d4241663877436759494b6f5a497a6a304541774944535141770a526749684149564d434856714e4d4b765958412f335439612f4c6f316e376a72497976763849456757526f64557177734169454177586b69547535613646306d0a61786c45493776557461727868745865464d462f53383674777a37436f6b6f3d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a2d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d4949436c6a4343416a32674177494241674956414a567658633239472b487051456e4a3150517a7a674658433935554d416f4743437147534d343942414d430a4d476778476a415942674e5642414d4d45556c756447567349464e48574342536232393049454e424d526f77474159445651514b4442464a626e526c624342440a62334a7762334a6864476c76626a45554d424947413155454277774c553246756447456751327868636d4578437a414a42674e564241674d416b4e424d5173770a435159445651514745774a56557a4165467730784f4441314d6a45784d4455774d5442614677307a4d7a41314d6a45784d4455774d5442614d484178496a41670a42674e5642414d4d47556c756447567349464e4857434251513073675547786864475a76636d306751304578476a415942674e5642416f4d45556c75644756730a49454e76636e4276636d4630615739754d5251774567594456515148444174545957353059534244624746795954454c4d416b474131554543417743513045780a437a414a42674e5642415954416c56544d466b77457759484b6f5a497a6a3043415159494b6f5a497a6a304441516344516741454e53422f377432316c58534f0a3243757a7078773734654a423732457944476757357258437478327456544c7136684b6b367a2b5569525a436e71523770734f766771466553786c6d546c4a6c0a65546d693257597a33714f42757a43427544416642674e5648534d4547444157674251695a517a575770303069664f44744a5653763141624f536347724442530a42674e5648523845537a424a4d45656752614244686b466f64485277637a6f764c324e6c636e52705a6d6c6a5958526c63793530636e567a6447566b633256790a646d6c6a5a584d75615735305a577775593239744c306c756447567355306459556d397664454e424c6d526c636a416442674e564851344546675155496d554d316c71644e496e7a673753560a55723951477a6b6e4271777744675944565230504151482f42415144416745474d42494741315564457745422f7751494d4159424166384341514577436759490a4b6f5a497a6a3045417749445351417752674968414f572f35516b522b533943695344634e6f6f774c7550524c735747662f59693747535839344267775477670a41694541344a306c72486f4d732b586f356f2f7358364f39515778485241765a55474f6452513763767152586171493d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a2d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d4949436a7a4343416a53674177494241674955496d554d316c71644e496e7a6737535655723951477a6b6e42717777436759494b6f5a497a6a3045417749770a614445614d4267474131554541777752535735305a5777675530645949464a766233516751304578476a415942674e5642416f4d45556c756447567349454e760a636e4276636d4630615739754d5251774567594456515148444174545957353059534244624746795954454c4d416b47413155454341774351304578437a414a0a42674e5642415954416c56544d423458445445344d4455794d5445774e4455784d466f58445451354d54497a4d54497a4e546b314f566f77614445614d4267470a4131554541777752535735305a5777675530645949464a766233516751304578476a415942674e5642416f4d45556c756447567349454e76636e4276636d46300a615739754d5251774567594456515148444174545957353059534244624746795954454c4d416b47413155454341774351304578437a414a42674e56424159540a416c56544d466b77457759484b6f5a497a6a3043415159494b6f5a497a6a3044415163445167414543366e45774d4449595a4f6a2f69505773437a61454b69370a314f694f534c52466857476a626e42564a66566e6b59347533496a6b4459594c304d784f346d717379596a6c42616c54565978465032734a424b357a6c4b4f420a757a43427544416642674e5648534d4547444157674251695a517a575770303069664f44744a5653763141624f5363477244425342674e5648523845537a424a0a4d45656752614244686b466f64485277637a6f764c324e6c636e52705a6d6c6a5958526c63793530636e567a6447566b63325679646d6c6a5a584d75615735300a5a577775593239744c306c756447567355306459556d397664454e424c6d526c636a416442674e564851344546675155496d554d316c71644e496e7a673753560a55723951477a6b6e4271777744675944565230504151482f42415144416745474d42494741315564457745422f7751494d4159424166384341514577436759490a4b6f5a497a6a3045417749445351417752674968414f572f35516b522b533943695344634e6f6f774c7550524c735747662f59693747535839344267775477670a41694541344a306c72486f4d732b586f356f2f7358364f39515778485241765a55474f6452513763767152586171493d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;
  const trimQuote = (q) => (q && q.length > 6 ? `${q.slice(0,3)}...${q.slice(-3)}` : q);
  // State management
  const [uiMessages, setUiMessages] = useState([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // AI Chat state (hooked from MultiAIChat logic)
  const {
    userQuestion,
    setUserQuestion,
    round,
    messages,
    isLoading,
    finalRecommendation,
    feelingTodayRating,
    setFeelingTodayRating,
    feelingBetterRating,
    setFeelingBetterRating,
    aiConfig,
    sendMessage,
    startConsultation,
    startCriticismRound,
    startVotingRound,
    generateFinalRecommendation,
    clearChat,
  } = useMultiAIChat({ showOnlyJudge: true });

  // Transform hook messages to ChatHistory format, include both user and judge
  const chatMessagesLiveBase = messages
    .filter(m => m.speaker === 'user' || m.speaker === 'judge')
    .map(m => ({
      id: m.id,
      text: m.content,
      isUser: m.speaker === 'user',
      timestamp: m.timestamp,
      speaker: m.speaker,
      round: m.round,
    }));

  // Append attestation helper message after the latest AI response
  const lastJudgeMsg = messages.filter(m => m.speaker === 'judge').slice(-1)[0];
  const attestationMsg = lastJudgeMsg
    ? [{
        id: `attestation_${lastJudgeMsg.id}`,
        text: `Attestation ready: [View](https://cloud.phala.network/dashboard/cvms/366d05f24e5e4ca1894a91690ac8603a/certificates) • Quote: \`${trimQuote(ATTESTATION_QUOTE)}\` — [Copy](copy:${encodeURIComponent(ATTESTATION_QUOTE)})`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        speaker: 'system',
        round: 'info'
      }]
    : [];
  const chatMessagesLive = [...chatMessagesLiveBase, ...attestationMsg];

  // Persisted chat history (loaded from file)
  const [historyMessages, setHistoryMessages] = useState([]);
  const [historyLoadedAt, setHistoryLoadedAt] = useState(0);

  const [showFeelingTodayModal, setShowFeelingTodayModal] = useState(false);
  const [sessionId] = useState(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [storedThisSession, setStoredThisSession] = useState(false);
  // Reset store flag when a new session starts (detect a fresh user question message)
  useEffect(() => {
    const hasFreshQuestion = messages.some(m => m.speaker === 'user' && m.round === 'question');
    if (hasFreshQuestion && storedThisSession) {
      setStoredThisSession(false);
    }
  }, [messages, storedThisSession]);

  // Load history from file on mount and whenever a new session is stored
  useEffect(() => {
    async function loadHistory() {
      try {
        const resp = await fetch('/api/chat_history');
        if (!resp.ok) return;
        const data = await resp.json();
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const last = sessions[sessions.length - 1];
        if (last?.messages) {
          setHistoryMessages(
            last.messages.map(m => ({
              id: m.id,
              text: m.text,
              isUser: Boolean(m.isUser),
              timestamp: m.timestamp,
              speaker: m.speaker,
              round: m.round,
            }))
          );
        } else {
          setHistoryMessages([]);
        }
      } catch (e) {
        // ignore
      }
    }
    loadHistory();
  }, [historyLoadedAt]);

  // Store the current conversation once we have both a user question and a judge response
  useEffect(() => {
    const hasUser = chatMessagesLive.some(m => m.isUser);
    const hasJudge = chatMessagesLive.some(m => !m.isUser && m.speaker === 'judge');
    if (!hasUser || !hasJudge || storedThisSession) return;

    const messagesToStore = chatMessagesLive.map(m => ({
      id: m.id,
      text: m.text,
      isUser: m.isUser,
      timestamp: m.timestamp,
      speaker: m.speaker,
      round: m.round,
    }));

    (async () => {
      try {
        const resp = await fetch('/api/store_chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, messages: messagesToStore }),
        });
        if (resp.ok) {
          setStoredThisSession(true);
          setHistoryLoadedAt(Date.now());
        }
      } catch (_) {}
    })();
  }, [chatMessagesLive, sessionId, storedThisSession]);
  
  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  // UI busy state: loading across multi-round flow until output visible
  const isBusy = isLoading || round !== 0;
  
  // System state
  const [app, setApp] = useState(null);
  const [model, setModel] = useState(null);
  const [placeholderFace, setPlaceholderFace] = useState(null);
  const [cubismLoaded, setCubismLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const animationsEnabledRef = useRef(false);

  // Watch for new judge messages and trigger streaming
  useEffect(() => {
    const judgeMessages = messages.filter(m => m.speaker === 'judge');
    const latestJudgeMessage = judgeMessages[judgeMessages.length - 1];
    
    if (latestJudgeMessage && latestJudgeMessage.content) {
      // Set streaming text
      setStreamingText(latestJudgeMessage.content);
      setIsStreamingActive(true);
      
      // Use streamTextWithTiming for text animation
      streamTextWithTiming(latestJudgeMessage.content, {
        baseSpeed: 15,
        onComplete: () => {
          setIsStreamingActive(false);
          // Do not auto-clear the displayed text; keep it visible
        }
      });
    }
  }, [messages]); // Watch for changes in messages

  // References
  const canvasContainerRef = useRef(null);

  // Add UI-only message (for demo/debug overlay)
  const addMessage = (text, isUser = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    };
    setUiMessages(prev => [...prev, newMessage]);
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

  // Event handlers
    const handleSendMessage = async (value) => {
      const input = (value ?? userQuestion ?? '').trim();
      if (!input || isLoading) return;
      // Use MultiAIChat orchestration logic
      await startConsultation(input);
      setUserQuestion('');
      return;
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
          // Do not auto-clear the demo text
          
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
        {/* Clickable hotspot over the book area on the table */}
        <a
          href="/book"
          aria-label="Open book memories"
          className="book-hotspot"
        />
        {/* Character Stage - positioned to stand on floor */}
        <div className="absolute inset-0 bottom-20">
          <div 
            ref={canvasContainerRef} 
            className="w-full h-full"
            style={{
              transform: 'translateX(-20%) translateY(8%)', 
              transformOrigin: 'center bottom'
            }}
          />
          
          {/* AI Response Streaming Display */}
          <div className="streaming-container">
            {streamingText ? (
              <StreamingText
                text={streamingText}
                speed={18}
                isStreaming={isStreamingActive}
                className="streaming-text"
              />
            ) : (
              isBusy && (
                <div className="streaming-text">
                  <ThinkingIndicator text="Chotto matte! Toku is thinking" />
                </div>
              )
            )}
          </div>
        </div>
      
        {/* Chat History Button & Panel */}
        <div className="chat-history-container">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)} 
            className="history-button"
          >
            {isChatOpen ? '✕' : '💬'}
          </button>
          {/* Memories button */}
          <a
            href="/book"
            className="history-button memories-button"
            title="Open Memories"
            aria-label="Open Memories"
          >
            📚
          </a>
          
          {isChatOpen && (
            <div className="history-panel">
              <ChatHistory
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen(!isChatOpen)}
                messages={(historyMessages.length ? historyMessages : chatMessagesLive)}
              />
            </div>
          )}
        </div>

        {/* Thinking indicator now shown in streaming container for consistent style */}

        {/* Chat Input */}
        <ChatInput
          value={userQuestion}
          onChange={setUserQuestion}
          onSend={handleSendMessage}
          placeholder="Share your mental health concern..."
          disabled={isBusy}
        />

        {/* Feeling Today Modal */}
        <FeelingTodayModal
          isOpen={showFeelingTodayModal}
          onClose={() => setShowFeelingTodayModal(false)}
          onRatingSubmit={handleFeelingTodayRating}
        />

        <style jsx global>{`
          .streaming-container {
            position: fixed;
            bottom: 160px;
            left: 0;
            right: 0;
            z-index: 30;
            display: flex;
            justify-content: center;
            padding: 0 16px;
            pointer-events: none;
          }

          .streaming-text {
            width: 100%;
            max-width: 50vw;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 50px;
            padding: 20px 32px;
            color: white;
            font-size: 18px;
            line-height: 1.6;
            animation: fadeIn 0.3s ease;
            transition: all 0.3s ease;
          }

          .streaming-text:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
            box-shadow: 0 0 24px rgba(255, 255, 255, 0.18);
          }

          .cursor {
            display: inline-block;
            margin-left: 2px;
            animation: blink 1s infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          .chat-history-container {
            position: fixed;
            top: 20px;
            left: 20px; /* moved to top-left */
            z-index: 50;
          }

          .history-button {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 22px;
            line-height: 1;
            text-align: center;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .history-button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
          }

          .history-panel {
            position: absolute;
            top: 60px;
            left: 0; /* open under the button on the left */
            width: 360px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            animation: slideIn 0.3s ease forwards;
          }

          /* Book hotspot over background image */
          .book-hotspot {
            position: absolute;
            bottom: 12%;
            left: 60%;
            transform: translateX(-50%);
            width: min(20vw, 300px);
            height: min(13vw, 200px);
            border-radius: 12px;
            z-index: 40; /* above streaming text (30) and below chat button (50) */
            cursor: pointer;
            /* invisible but still clickable */
            background: transparent;
          }

          .book-hotspot:hover {
            outline: 2px solid rgba(255, 255, 255, 0.2);
            outline-offset: 2px;
          }

          .memories-button {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
          }

          /* Removed separate thinking indicator styles; using .streaming-text style */

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideIn    
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
        
        {/* Chat Input */}
        <ChatInput
          value={userQuestion}
          onChange={setUserQuestion}
          onSend={handleSendMessage}
          placeholder="Share your mental health concern..."
          disabled={isBusy}
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
