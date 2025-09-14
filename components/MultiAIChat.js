import { useState } from 'react';
import { useMultiAIChat } from '@/lib/chat/useMultiAIChat';
import { Button } from '@/components/ui/button';
import FeelingTodayModal from './FeelingTodayModal';
import FeelingBetterModal from './FeelingBetterModal';

export default function MultiAIChat({ showOnlyJudge = true } = {}) {
  // Use shared chat logic hook exclusively
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
    startConsultation,
    clearChat,
  } = useMultiAIChat({ showOnlyJudge });

  // Local UI-only state
  const [showFeelingTodayModal, setShowFeelingTodayModal] = useState(false);
  const [showFeelingBetterModal, setShowFeelingBetterModal] = useState(false);

  const handleFeelingTodayRating = (rating) => {
    setFeelingTodayRating(rating);
    console.log('Feeling today rating:', rating);
  };

  const handleFeelingBetterRating = (rating) => {
    setFeelingBetterRating(rating);
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
        {finalRecommendation && !showOnlyJudge && (
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
