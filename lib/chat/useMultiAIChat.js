import { useState, useCallback, useEffect } from 'react';

// Simple session id generator for grouping logs
const genSessionId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function useMultiAIChat(options = {}) {
  const {
    showOnlyJudge = false,
  } = options;

  const [userQuestion, _setUserQuestion] = useState('');
  const [questionAtStart, setQuestionAtStart] = useState('');
  const [round, setRound] = useState(0); // 0: waiting, 1: initial answers, 2: criticism, 3: voting
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [finalRecommendation, setFinalRecommendation] = useState(null);
  const [sessionId, setSessionId] = useState(genSessionId());
  const [feelingTodayRating, setFeelingTodayRating] = useState(null);
  const [feelingBetterRating, setFeelingBetterRating] = useState(null);

  const aiConfig = {
    ai1: { name: 'AI1 - Clinical Psychologist', color: 'bg-purple-500', endpoint: '/api/ai1' },
    ai2: { name: 'AI2 - Psychiatrist', color: 'bg-blue-500', endpoint: '/api/ai2' },
    ai3: { name: 'AI3 - Holistic Counselor', color: 'bg-green-500', endpoint: '/api/ai3' },
    judge: { name: 'AI Judge - Final Synthesis', color: 'bg-yellow-500', endpoint: '/api/judge' }
  };

  // Hydrate userQuestion and questionAtStart from localStorage on mount (best-effort)
  useEffect(() => {
    try {
      const savedUq = localStorage.getItem('multiAI_userQuestion');
      if (typeof savedUq === 'string') _setUserQuestion(savedUq);
      const savedStart = localStorage.getItem('multiAI_questionAtStart');
      if (typeof savedStart === 'string') setQuestionAtStart(savedStart);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Setter that also persists to localStorage
  const setUserQuestion = useCallback((val) => {
    _setUserQuestion(val);
    try { localStorage.setItem('multiAI_userQuestion', val ?? ''); } catch (e) { /* ignore */ }
  }, []);

  const logEvent = async (event, data = {}) => {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, event, data })
      });
    } catch (e) {
      // non-blocking
      console.warn('logEvent failed', e);
    }
  };

  const sendMessage = useCallback(async (speaker, message, roundType = 'answer') => {
    setIsLoading(true);
    try {
      const response = await fetch(aiConfig[speaker].endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          model: 'gpt-4o-mini',
          sessionId,
          round: roundType
        }),
      });
      if (!response.ok) {
        console.warn(`Non-OK response from ${speaker}:`, response.status);
        return null;
      }

      const data = await response.json();
      const newMessage = {
        id: Date.now(),
        speaker,
        content: data.text,
        timestamp: new Date().toLocaleTimeString(),
        round: roundType,
      };
      if (!showOnlyJudge) setMessages(prev => [...prev, newMessage]);
      return data.text;
    } catch (error) {
      console.error(`Error sending message to ${speaker}:`, error);
      const errorMessage = {
        id: Date.now(),
        speaker,
        content: `Sorry, there was an error processing the message.`,
        timestamp: new Date().toLocaleTimeString(),
        round: roundType
      };
      if (!showOnlyJudge || speaker === 'user' || speaker === 'judge') {
        setMessages(prev => [...prev, errorMessage]);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showOnlyJudge]);

  const startConsultation = useCallback(async (maybeQuestion) => {
    const q = (maybeQuestion ?? userQuestion ?? '').trim();
    if (!q) return;

    console.log('🔍 useMultiAIChat startConsultation - Input received:', {
      maybeQuestion,
      userQuestion,
      finalQuestion: q
    });

    setIsLoading(true);
    setMessages([]);
    setRound(1);
    setFinalRecommendation(null);

    const userMessage = {
      id: Date.now(),
      speaker: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString(),
      round: 'question'
    };
    setMessages([userMessage]);
    setQuestionAtStart(q);
    try { localStorage.setItem('multiAI_questionAtStart', q); } catch (e) { /* ignore */ }
    console.log('🔍 useMultiAIChat startConsultation - User message stored:', userMessage);
    logEvent('session_start', { feelingTodayRating, question: q });

    const { buildRound1Prompt } = await import('@/prompt_engineering/prompts');
    const question = buildRound1Prompt(q);

    const [ai1Response, ai2Response, ai3Response] = await Promise.all([
      sendMessage('ai1', question, 'round1'),
      sendMessage('ai2', question, 'round1'),
      sendMessage('ai3', question, 'round1')
    ]);

    // Proceed even if one or more AIs failed; fill placeholders so judge can still run
    const r1_ai1 = ai1Response || 'No response from AI1 in round 1.';
    const r1_ai2 = ai2Response || 'No response from AI2 in round 1.';
    const r1_ai3 = ai3Response || 'No response from AI3 in round 1.';

    setRound(2);
    await startCriticismRound(r1_ai1, r1_ai2, r1_ai3);
  }, [userQuestion, feelingTodayRating, sendMessage]);

  const startCriticismRound = useCallback(async (ai1AnswerFromR1, ai2AnswerFromR1, ai3AnswerFromR1) => {
    setIsLoading(true);

    const ai1Answer = (ai1AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai1')?.content) ?? '';
    const ai2Answer = (ai2AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai2')?.content) ?? '';
    const ai3Answer = (ai3AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai3')?.content) ?? '';

    const { buildRound2Critiques } = await import('@/prompt_engineering/prompts');
    const { ai1: ai1Critique, ai2: ai2Critique, ai3: ai3Critique } = buildRound2Critiques(ai1Answer, ai2Answer, ai3Answer);

    const [ai1CritiqueResponse, ai2CritiqueResponse, ai3CritiqueResponse] = await Promise.all([
      sendMessage('ai1', ai1Critique, 'round2'),
      sendMessage('ai2', ai2Critique, 'round2'),
      sendMessage('ai3', ai3Critique, 'round2')
    ]);

    const r2_ai1 = ai1CritiqueResponse || 'No critique from AI1 in round 2.';
    const r2_ai2 = ai2CritiqueResponse || 'No critique from AI2 in round 2.';
    const r2_ai3 = ai3CritiqueResponse || 'No critique from AI3 in round 2.';

    setRound(3);
    await startVotingRound(r2_ai1, r2_ai2, r2_ai3);
  }, [messages, sendMessage]);

  const startVotingRound = useCallback(async (ai1R2, ai2R2, ai3R2) => {
    setIsLoading(true);

    const { buildRound3VotingPrompt } = await import('@/prompt_engineering/prompts');
    const votingPrompt = buildRound3VotingPrompt();

    const [ai1Vote, ai2Vote, ai3Vote] = await Promise.all([
      sendMessage('ai1', votingPrompt, 'round3'),
      sendMessage('ai2', votingPrompt, 'round3'),
      sendMessage('ai3', votingPrompt, 'round3')
    ]);

    const v_ai1 = ai1Vote || 'No vote from AI1 in round 3.';
    const v_ai2 = ai2Vote || 'No vote from AI2 in round 3.';
    const v_ai3 = ai3Vote || 'No vote from AI3 in round 3.';

    await generateFinalRecommendation(v_ai1, v_ai2, v_ai3);
  }, [sendMessage]);

  const generateFinalRecommendation = useCallback(async (ai1Response = null, ai2Response = null, ai3Response = null) => {
    setIsLoading(true);

    // Look for user question in messages (from startConsultation)
    const userQuestionFromMessages = questionAtStart || messages.find(m => m.speaker === 'user' && m.round === 'question')?.content || '';
    const finalUserQuestion = (userQuestionFromMessages || userQuestion || '').trim();
    // Ensure we only proceed to judge after round 3 prompts have been issued
    // (this function is called from startVotingRound so round3 has executed)
    // finalUserQuestion should now be captured from the start of the session.
    
    console.log('🔍 Debug - User question sources:', {
      fromMessages: userQuestionFromMessages,
      fromState: userQuestion,
      finalQuestion: finalUserQuestion,
      allMessages: messages.map(m => ({ speaker: m.speaker, round: m.round, content: m.content?.substring(0, 50) + '...' }))
    });

    let round3Responses = {
      ai1: ai1Response || 'No vote from AI1 in round 3.',
      ai2: ai2Response || 'No vote from AI2 in round 3.',
      ai3: ai3Response || 'No vote from AI3 in round 3.'
    };

    if (!round3Responses.ai1 && !round3Responses.ai2 && !round3Responses.ai3) {
      const round3Messages = messages.filter(m => m.round === 'round3');
      round3Responses = {
        ai1: round3Messages.find(m => m.speaker === 'ai1')?.content || 'No vote from AI1 in round 3.',
        ai2: round3Messages.find(m => m.speaker === 'ai2')?.content || 'No vote from AI2 in round 3.',
        ai3: round3Messages.find(m => m.speaker === 'ai3')?.content || 'No vote from AI3 in round 3.'
      };
    }

    if (!finalUserQuestion.trim()) {
      // Use a placeholder question so judge can still run
      const placeholderQuestion = 'No explicit user question captured. Provide a general mental health recommendation based on limited context.';
      try {
        const response = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round3Responses,
            userQuestion: placeholderQuestion,
            sessionId,
            feelingToday: feelingTodayRating ?? null,
            feelingBetter: feelingBetterRating ?? null
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        const recommendation = {
          summary: "🏆 Final Mental Health Recommendation",
          content: data.text,
          timestamp: new Date().toLocaleTimeString(),
          color: data.color || 'bg-yellow-500'
        };
        setFinalRecommendation(recommendation);
        if (showOnlyJudge) {
          setMessages(prev => [...prev, { id: Date.now(), speaker: 'judge', content: recommendation.content, timestamp: new Date().toLocaleTimeString(), round: 'final' }]);
        }
      } catch (e) {
        setFinalRecommendation({ summary: "🏆 Final Mental Health Recommendation", content: "Sorry, there was an error generating the final recommendation.", timestamp: new Date().toLocaleTimeString(), color: 'bg-yellow-500' });
      } finally {
        setRound(0);
        setIsLoading(false);
      }
      return;
    }

    if (!round3Responses.ai1 && !round3Responses.ai2 && !round3Responses.ai3) {
      const recommendation = {
        summary: "🏆 Final Mental Health Recommendation",
        content: "Unable to generate final recommendation - no specialist responses found. Please try the consultation again.",
        timestamp: new Date().toLocaleTimeString(),
        color: 'bg-yellow-500'
      };
      setFinalRecommendation(recommendation);
      setRound(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round3Responses,
          userQuestion: finalUserQuestion,
          sessionId,
          feelingToday: feelingTodayRating ?? null,
          feelingBetter: feelingBetterRating ?? null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      const recommendation = {
        summary: "🏆 Final Mental Health Recommendation",
        content: data.text,
        timestamp: new Date().toLocaleTimeString(),
        color: data.color || 'bg-yellow-500'
      };

      setFinalRecommendation(recommendation);

      if (showOnlyJudge) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            speaker: 'judge',
            content: recommendation.content,
            timestamp: new Date().toLocaleTimeString(),
            round: 'final'
          }
        ]);
      }
    } catch (error) {
      const recommendation = {
        summary: "🏆 Final Mental Health Recommendation",
        content: "Sorry, there was an error generating the final recommendation. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
        color: 'bg-yellow-500'
      };
      setFinalRecommendation(recommendation);
      if (showOnlyJudge) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            speaker: 'judge',
            content: recommendation.content,
            timestamp: new Date().toLocaleTimeString(),
            round: 'final'
          }
        ]);
      }
    } finally {
      setRound(0);
      setIsLoading(false);
    }
  }, [messages, userQuestion, questionAtStart, sessionId, feelingTodayRating, feelingBetterRating, showOnlyJudge]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setRound(0);
    setUserQuestion('');
    setFinalRecommendation(null);
    setFeelingTodayRating(null);
    setFeelingBetterRating(null);
    setSessionId(genSessionId());
    try {
      localStorage.removeItem('multiAI_questionAtStart');
      // keep last typed question for convenience
    } catch (e) { /* ignore */ }
  }, []);

  return {
    // state
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

    // config (for UI labels/colors)
    aiConfig,

    // actions
    sendMessage,
    startConsultation,
    startCriticismRound,
    startVotingRound,
    generateFinalRecommendation,
    clearChat,
  };
}
