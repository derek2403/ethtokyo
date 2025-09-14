import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import FeelingTodayModal from './FeelingTodayModal';
import FeelingBetterModal from './FeelingBetterModal';

// Simple session id generator for grouping logs
const genSessionId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function MultiAIChat() {
  const [userQuestion, setUserQuestion] = useState('');
  
  // Client-side logger to central API so all events go to a single text file
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
  const [round, setRound] = useState(0); // 0: waiting, 1: initial answers, 2: criticism, 3: voting
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [finalRecommendation, setFinalRecommendation] = useState(null);
  const [showFeelingTodayModal, setShowFeelingTodayModal] = useState(false);
  const [showFeelingBetterModal, setShowFeelingBetterModal] = useState(false);
  const [feelingTodayRating, setFeelingTodayRating] = useState(null);
  const [sessionId, setSessionId] = useState(genSessionId());
  const [feelingBetterRating, setFeelingBetterRating] = useState(null);

  const aiConfig = {
    ai1: { name: 'AI1 - Clinical Psychologist', color: 'bg-purple-500', endpoint: '/api/ai1' },
    ai2: { name: 'AI2 - Psychiatrist', color: 'bg-blue-500', endpoint: '/api/ai2' },
    ai3: { name: 'AI3 - Holistic Counselor', color: 'bg-green-500', endpoint: '/api/ai3' },
    judge: { name: 'AI Judge - Final Synthesis', color: 'bg-yellow-500', endpoint: '/api/judge' }
  };

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

  const startConsultation = async () => {
    if (!userQuestion.trim()) return;
    
    setIsLoading(true);
    setMessages([]);
    setRound(1);
    setFinalRecommendation(null);
    
    // Add user question to messages
    const userMessage = {
      id: Date.now(),
      speaker: 'user',
      content: userQuestion,
      timestamp: new Date().toLocaleTimeString(),
      round: 'question'
    };
    setMessages([userMessage]);
    // Log session start with initial rating and question
    logEvent('session_start', { feelingTodayRating, question: userQuestion });
    
    // Round 1: All AIs provide initial assessment
    const { buildRound1Prompt } = await import('@/prompt_enginnering/prompts');
    const question = buildRound1Prompt(userQuestion);
    
    // Run all Round 1 responses concurrently
    const [ai1Response, ai2Response, ai3Response] = await Promise.all([
      sendMessage('ai1', question, 'round1'),
      sendMessage('ai2', question, 'round1'),
      sendMessage('ai3', question, 'round1')
    ]);
    
    if (ai1Response && ai2Response && ai3Response) {
      setRound(2);
      await startCriticismRound(ai1Response, ai2Response, ai3Response);
    }
  };

  const startCriticismRound = async (ai1AnswerFromR1, ai2AnswerFromR1, ai3AnswerFromR1) => {
    setIsLoading(true);
    
    // Get the latest responses from each AI
    const ai1Answer = (ai1AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai1')?.content) ?? '';
    const ai2Answer = (ai2AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai2')?.content) ?? '';
    const ai3Answer = (ai3AnswerFromR1 ?? messages.filter(m => m.round === 'round1').find(m => m.speaker === 'ai3')?.content) ?? '';
    
    // Each AI discusses the other two's approaches
    const { buildRound2Critiques } = await import('@/prompt_enginnering/prompts');
    const { ai1: ai1Critique, ai2: ai2Critique, ai3: ai3Critique } = buildRound2Critiques(ai1Answer, ai2Answer, ai3Answer);
    
    // Run all Round 2 responses concurrently, then immediately move to Round 3 when done
    const [ai1CritiqueResponse, ai2CritiqueResponse, ai3CritiqueResponse] = await Promise.all([
      sendMessage('ai1', ai1Critique, 'round2'),
      sendMessage('ai2', ai2Critique, 'round2'),
      sendMessage('ai3', ai3Critique, 'round2')
    ]);
    
    if (ai1CritiqueResponse && ai2CritiqueResponse && ai3CritiqueResponse) {
      setRound(3);
      await startVotingRound(ai1CritiqueResponse, ai2CritiqueResponse, ai3CritiqueResponse);
    }
  };

  const startVotingRound = async (ai1R2, ai2R2, ai3R2) => {
    setIsLoading(true);
    
    // Get all responses for voting (kept for display/state integrity; not required for prompt building)
    const round1Messages = messages.filter(m => m.round === 'round1');
    const round2Messages = messages.filter(m => m.round === 'round2');
    
    const { buildRound3VotingPrompt } = await import('@/prompt_enginnering/prompts');
    const votingPrompt = buildRound3VotingPrompt();
    
    // Run all Round 3 responses concurrently
    const [ai1Vote, ai2Vote, ai3Vote] = await Promise.all([
      sendMessage('ai1', votingPrompt, 'round3'),
      sendMessage('ai2', votingPrompt, 'round3'),
      sendMessage('ai3', votingPrompt, 'round3')
    ]);
    
    if (ai1Vote && ai2Vote && ai3Vote) {
      // Pass the responses directly to avoid timing issues with state updates
      await generateFinalRecommendation(ai1Vote, ai2Vote, ai3Vote);
    }
  };

  const generateFinalRecommendation = async (ai1Response = null, ai2Response = null, ai3Response = null) => {
    setIsLoading(true);
    
    const userQuestionFromMessages = messages.find(m => m.speaker === 'user')?.content || '';
    
    // Use the state userQuestion as fallback
    const finalUserQuestion = userQuestionFromMessages || userQuestion;
    
    // Prepare round 3 responses for judge - use passed parameters first, then fallback to state
    let round3Responses = {
      ai1: ai1Response || '',
      ai2: ai2Response || '',
      ai3: ai3Response || ''
    };
    
    // If no responses were passed, try to get from state
    if (!round3Responses.ai1 && !round3Responses.ai2 && !round3Responses.ai3) {
      const round3Messages = messages.filter(m => m.round === 'round3');
      round3Responses = {
        ai1: round3Messages.find(m => m.speaker === 'ai1')?.content || '',
        ai2: round3Messages.find(m => m.speaker === 'ai2')?.content || '',
        ai3: round3Messages.find(m => m.speaker === 'ai3')?.content || ''
      };
    }
    
    console.log('Sending to judge:', { round3Responses, userQuestion: finalUserQuestion });
    console.log('Round 3 responses check:', {
      ai1: round3Responses.ai1 ? 'Found' : 'Missing',
      ai2: round3Responses.ai2 ? 'Found' : 'Missing', 
      ai3: round3Responses.ai3 ? 'Found' : 'Missing'
    });
    
    // If still no responses, try to get the latest responses from each AI
    if (!round3Responses.ai1 && !round3Responses.ai2 && !round3Responses.ai3) {
      console.log('Round 3 responses empty, trying to get latest AI responses...');
      const latestAi1 = messages.filter(m => m.speaker === 'ai1').pop()?.content || '';
      const latestAi2 = messages.filter(m => m.speaker === 'ai2').pop()?.content || '';
      const latestAi3 = messages.filter(m => m.speaker === 'ai3').pop()?.content || '';
      
      round3Responses.ai1 = latestAi1;
      round3Responses.ai2 = latestAi2;
      round3Responses.ai3 = latestAi3;
      
      console.log('Using latest AI responses:', {
        ai1: latestAi1 ? 'Found' : 'Missing',
        ai2: latestAi2 ? 'Found' : 'Missing',
        ai3: latestAi3 ? 'Found' : 'Missing'
      });
    }
    
    // Validate we have the required data
    if (!finalUserQuestion.trim()) {
      console.error('No user question found');
      const recommendation = {
        summary: "🏆 Final Mental Health Recommendation",
        content: "Unable to generate final recommendation - no user question found. Please try the consultation again.",
        timestamp: new Date().toLocaleTimeString(),
        color: 'bg-yellow-500'
      };
      setFinalRecommendation(recommendation);
      setRound(0);
      setIsLoading(false);
      return;
    }
    
    if (!round3Responses.ai1 && !round3Responses.ai2 && !round3Responses.ai3) {
      console.error('No AI responses found at all');
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
        headers: {
          'Content-Type': 'application/json',
        },
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
        console.error('Judge API error:', errorData);
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
    } catch (error) {
      console.error('Error getting judge recommendation:', error);
      const recommendation = {
        summary: "🏆 Final Mental Health Recommendation",
        content: "Sorry, there was an error generating the final recommendation. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
        color: 'bg-yellow-500'
      };
      setFinalRecommendation(recommendation);
    } finally {
      setRound(0);
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setRound(0);
    setUserQuestion('');
    setFinalRecommendation(null);
    setFeelingTodayRating(null);
    setFeelingBetterRating(null);
  };

  const handleFeelingTodayRating = (rating) => {
    setFeelingTodayRating(rating);
    logEvent('initial_feeling', { rating });
    console.log('Feeling today rating:', rating);
  };

  // Build and send a single-line summary log
  const sendSimpleSummaryLog = async (betterRating) => {
    try {
      const tsDay = new Date();
      const formatSingleLine = (text) =>
        String(text || '')
          .replace(/\s+/g, ' ') // collapse whitespace
          .trim();

      // Extract user input
      const userMsg = messages.find(m => m.speaker === 'user')?.content || userQuestion || '';

      // Helper to extract outputs per round
      const getRoundOutput = (round, aiKey) => {
        const msg = messages.find(m => m.round === round && m.speaker === aiKey);
        return msg ? formatSingleLine(msg.content) : '';
      };

      const r1_ai1 = getRoundOutput('round1', 'ai1');
      const r1_ai2 = getRoundOutput('round1', 'ai2');
      const r1_ai3 = getRoundOutput('round1', 'ai3');

      const r2_ai1 = getRoundOutput('round2', 'ai1');
      const r2_ai2 = getRoundOutput('round2', 'ai2');
      const r2_ai3 = getRoundOutput('round2', 'ai3');

      const r3_ai1 = getRoundOutput('round3', 'ai1');
      const r3_ai2 = getRoundOutput('round3', 'ai2');
      const r3_ai3 = getRoundOutput('round3', 'ai3');

      // Build the single line in the requested order
      const line = [
        // time day (local date and time)
        `date/time: ${tsDay.toLocaleString()}`,
        `feeling today:${feelingTodayRating ?? ''}`,
        `user input:${formatSingleLine(userMsg)}`,
        'round1', `ai1:${r1_ai1}`, `ai2:${r1_ai2}`, `ai3:${r1_ai3}`,
        'round2', `ai1:${r2_ai1}`, `ai2:${r2_ai2}`, `ai3:${r2_ai3}`,
        'round3', `ai1:${r3_ai1}`, `ai2:${r3_ai2}`, `ai3:${r3_ai3}`,
        `feeling better:${betterRating ?? ''}`
      ].join(' ');

      await fetch('/api/log_summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line })
      });
    } catch (e) {
      console.warn('sendSimpleSummaryLog failed', e);
    }
  };

  const handleFeelingBetterRating = (rating) => {
    setFeelingBetterRating(rating);
    logEvent('post_consult_feeling', { rating });
    // Do not append consolidated one-line summary; end the session at 'feeling better' in simple log only
    console.log('Feeling better rating:', rating);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Mental Health AI Consultation
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get mental health support from 3 AI specialists in 3 rounds: Assessment → Discussion → Recommendation
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowFeelingTodayModal(true)} 
                variant="outline"
                className="text-sm"
              >
                How are you feeling?
              </Button>
              <Button onClick={clearChat} variant="ghost">
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* User Input */}
        {round === 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Share your mental health concern:
              </label>
              <textarea
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Describe your feelings, thoughts, concerns, or mental health challenges..."
                className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                disabled={isLoading}
              />
              <Button 
                onClick={startConsultation} 
                disabled={!userQuestion.trim() || isLoading}
                className="w-full"
              >
                Start Mental Health Consultation
              </Button>
            </div>
          </div>
        )}

        {/* Round Status */}
        {round > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${round >= 1 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                Round 1: Initial Assessment
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${round >= 2 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                Round 2: Discussion
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${round >= 3 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                Round 3: Recommendation
              </div>
            </div>
          </div>
        )}

        {/* AI Status */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-center gap-4 flex-wrap">
            {Object.entries(aiConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                <span className={`text-sm font-medium ${key === 'judge' ? 'text-yellow-700 dark:text-yellow-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                  {config.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && round === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="mb-4">
                <div className="text-4xl mb-2">🧠💚🤝🌈</div>
                <p className="text-lg font-medium">Ready for Mental Health Support</p>
              </div>
              <p>Share your mental health concern above to get support from 3 AI specialists</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    {message.speaker === 'user' ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Your Concern
                        </span>
                      </>
                    ) : (
                      <>
                        <div className={`w-3 h-3 rounded-full ${aiConfig[message.speaker].color}`}></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {aiConfig[message.speaker].name}
                        </span>
                        {message.round && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                            {message.round === 'round1' ? 'Round 1' : message.round === 'round2' ? 'Round 2' : 'Round 3'}
                          </span>
                        )}
                      </>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.timestamp}
                    </span>
                  </div>
                  <div className={`px-4 py-3 rounded-lg ${
                    message.speaker === 'user' 
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-center">
              <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">Mental health specialists are consulting...</div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final Recommendation */}
        {finalRecommendation && (
          <div className="p-4 bg-green-50 dark:bg-green-900 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
              {finalRecommendation.summary}
            </h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${finalRecommendation.color || 'bg-yellow-500'}`}></div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  AI Judge - Final Synthesis
                </span>
                <span className="text-xs text-green-600 dark:text-green-400">
                  {finalRecommendation.timestamp}
                </span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {finalRecommendation.content}
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div className="text-sm text-green-700 dark:text-green-300">
                Consultation completed at {finalRecommendation.timestamp}
              </div>
              <Button 
                onClick={() => setShowFeelingBetterModal(true)} 
                variant="outline"
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                How are you feeling now?
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Messages: {messages.length}</span>
            <span>Current Round: {round === 0 ? 'Waiting' : round === 1 ? 'Initial Assessment' : round === 2 ? 'Discussion' : 'Recommendation'}</span>
            <span>Status: {isLoading ? 'Mental Health Specialists Consulting...' : 'Ready'}</span>
          </div>
          {(feelingTodayRating || feelingBetterRating) && (
            <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <div className="flex justify-center gap-4 text-xs">
                {feelingTodayRating && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    Initial Feeling: {feelingTodayRating}/5
                  </span>
                )}
                {feelingBetterRating && (
                  <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    After Consultation: {feelingBetterRating}/5
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Modals */}
      <FeelingTodayModal
        isOpen={showFeelingTodayModal}
        onClose={() => setShowFeelingTodayModal(false)}
        onRatingSubmit={handleFeelingTodayRating}
      />
      
      <FeelingBetterModal
        isOpen={showFeelingBetterModal}
        onClose={() => setShowFeelingBetterModal(false)}
        onRatingSubmit={handleFeelingBetterRating}
      />
    </div>
  );
}
