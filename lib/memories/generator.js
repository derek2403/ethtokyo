// Memory generation pipeline
// Creates daily manga-style memories from chat logs and interactions

/**
 * Generate a memory from chat logs for a specific date
 * This is a deterministic stub implementation as per Phase 5 plan
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} chatLogs - Array of chat messages for the day
 * @param {Object} options - Generation options
 * @returns {Promise<Memory>} Generated memory object
 */
export const generateMemoryForDate = async (date, chatLogs = [], options = {}) => {
  const {
    tone = 'reflective',
    panelCount = 4,
    contentSensitivity = 'medium'
  } = options;

  // Analyze the day's interactions
  const analysis = analyzeDay(chatLogs);
  
  // Generate memory components
  const memory = {
    id: date,
    date: date,
    title: generateTitle(analysis),
    logline: generateLogline(analysis),
    tags: generateTags(analysis),
    mood: generateMoodMetrics(analysis),
    skillsUsed: generateSkillsUsed(analysis),
    keyMoments: generateKeyMoments(analysis, chatLogs),
    panels: generatePanels(analysis, panelCount),
    status: 'generated',
    favorite: false,
    sources: generateSourceRefs(chatLogs),
    contentWarnings: generateContentWarnings(analysis),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Apply safety pass
  return applySafetyPass(memory, contentSensitivity);
};

/**
 * Analyze the day's chat interactions to extract themes and emotions
 * @param {Array} chatLogs - Chat messages from the day
 * @returns {Object} Analysis results
 */
function analyzeDay(chatLogs) {
  // Simple keyword-based analysis for the stub implementation
  const text = chatLogs.map(msg => msg.content || '').join(' ').toLowerCase();
  
  // Detect emotional themes
  const emotionalKeywords = {
    happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'love', 'amazing'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'quiet', 'meditation'],
    anxious: ['worried', 'stress', 'anxiety', 'nervous', 'concerned', 'fear'],
    sad: ['sad', 'down', 'depressed', 'upset', 'disappointed', 'cry'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'rage']
  };
  
  const emotionScores = {};
  for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
    emotionScores[emotion] = keywords.filter(keyword => text.includes(keyword)).length;
  }
  
  // Determine primary emotion
  const primaryEmotion = Object.keys(emotionScores).reduce((a, b) => 
    emotionScores[a] > emotionScores[b] ? a : b
  );
  
  // Detect activities and skills
  const activityKeywords = ['exercise', 'walk', 'run', 'yoga', 'meditation', 'read', 'work', 'friend', 'family'];
  const activities = activityKeywords.filter(activity => text.includes(activity));
  
  return {
    messageCount: chatLogs.length,
    primaryEmotion,
    emotionScores,
    activities,
    textLength: text.length,
    hasPositiveWords: text.includes('good') || text.includes('better') || text.includes('help'),
    hasNegativeWords: text.includes('bad') || text.includes('worse') || text.includes('difficult')
  };
}

/**
 * Generate a meaningful title for the day
 * @param {Object} analysis - Day analysis results
 * @returns {string} Generated title
 */
function generateTitle(analysis) {
  const { primaryEmotion, activities, hasPositiveWords } = analysis;
  
  const titleTemplates = {
    happy: ['A day of joy', 'Finding happiness', 'Bright moments'],
    calm: ['Finding peace', 'A quiet day', 'Moments of serenity'],
    anxious: ['Working through worry', 'Facing the storm', 'Finding calm after anxiety'],
    sad: ['Processing sadness', 'A difficult day', 'Working through emotions'],
    angry: ['Managing frustration', 'Working through anger', 'Finding balance'],
    mixed: ['A complex day', 'Mixed emotions', 'Processing the day']
  };
  
  let templates = titleTemplates[primaryEmotion] || titleTemplates.mixed;
  
  // Add activity-specific titles
  if (activities.includes('exercise')) {
    templates.push('Moving through the day', 'Finding strength through movement');
  }
  if (activities.includes('friend')) {
    templates.push('Connecting with others', 'Friendship and support');
  }
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a one-line summary for the memory card
 * @param {Object} analysis - Day analysis results
 * @returns {string} Generated logline
 */
function generateLogline(analysis) {
  const { primaryEmotion, activities, messageCount } = analysis;
  
  const loglineTemplates = [
    `A ${primaryEmotion} day with ${messageCount} moments of reflection`,
    `Navigating ${primaryEmotion} feelings through conversation`,
    `Processing the day's ${primaryEmotion} experiences`
  ];
  
  if (activities.length > 0) {
    loglineTemplates.push(`A day of ${activities.join(', ')} and ${primaryEmotion} moments`);
  }
  
  return loglineTemplates[Math.floor(Math.random() * loglineTemplates.length)];
}

/**
 * Generate relevant tags for the memory
 * @param {Object} analysis - Day analysis results
 * @returns {string[]} Array of tags
 */
function generateTags(analysis) {
  const tags = [analysis.primaryEmotion];
  
  // Add activity tags
  tags.push(...analysis.activities);
  
  // Add contextual tags
  if (analysis.hasPositiveWords) tags.push('growth');
  if (analysis.messageCount > 10) tags.push('active-day');
  if (analysis.messageCount < 3) tags.push('quiet-day');
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Generate mood metrics
 * @param {Object} analysis - Day analysis results
 * @returns {Object} Mood metrics
 */
function generateMoodMetrics(analysis) {
  const { primaryEmotion, emotionScores, hasPositiveWords, hasNegativeWords } = analysis;
  
  // Calculate valence (-1 to 1)
  let valence = 0;
  if (hasPositiveWords) valence += 0.3;
  if (hasNegativeWords) valence -= 0.3;
  if (['happy', 'calm'].includes(primaryEmotion)) valence += 0.4;
  if (['sad', 'anxious', 'angry'].includes(primaryEmotion)) valence -= 0.4;
  
  // Calculate energy (0 to 1)
  let energy = 0.5;
  if (['happy', 'angry'].includes(primaryEmotion)) energy += 0.3;
  if (['calm', 'sad'].includes(primaryEmotion)) energy -= 0.2;
  if (analysis.activities.includes('exercise')) energy += 0.2;
  
  // Clamp values
  valence = Math.max(-1, Math.min(1, valence));
  energy = Math.max(0, Math.min(1, energy));
  
  return {
    primary: primaryEmotion,
    valence,
    energy,
    topEmotions: Object.keys(emotionScores).filter(e => emotionScores[e] > 0)
  };
}

/**
 * Generate skills used based on conversation patterns
 * @param {Object} analysis - Day analysis results
 * @returns {string[]} Array of skills used
 */
function generateSkillsUsed(analysis) {
  const skills = [];
  
  if (analysis.hasPositiveWords) skills.push('positive-thinking');
  if (analysis.activities.includes('meditation')) skills.push('mindfulness');
  if (analysis.activities.includes('exercise')) skills.push('physical-activity');
  if (analysis.messageCount > 5) skills.push('self-reflection');
  
  return skills;
}

/**
 * Generate key moments from the day
 * @param {Object} analysis - Day analysis results  
 * @param {Array} chatLogs - Original chat messages
 * @returns {Array} Key moments with timestamps and notes
 */
function generateKeyMoments(analysis, chatLogs) {
  // For stub: create 2-3 key moments based on analysis
  const moments = [];
  
  if (chatLogs.length > 0) {
    moments.push({
      time: '09:00',
      note: 'Started the day with reflection'
    });
    
    if (analysis.activities.length > 0) {
      moments.push({
        time: '14:30', 
        note: `Engaged in ${analysis.activities[0]}`
      });
    }
    
    moments.push({
      time: '20:00',
      note: `Ended the day feeling ${analysis.primaryEmotion}`
    });
  }
  
  return moments;
}

/**
 * Generate manga panels for the day
 * @param {Object} analysis - Day analysis results
 * @param {number} panelCount - Number of panels to generate
 * @returns {Array} Array of panel objects
 */
function generatePanels(analysis, panelCount) {
  const panels = [];
  
  const panelTemplates = {
    opening: 'The day begins with quiet contemplation...',
    conflict: 'Challenges arise, but there is strength to face them.',
    growth: 'Through conversation and reflection, understanding grows.',
    resolution: 'The day ends with newfound clarity and peace.'
  };
  
  const templates = Object.values(panelTemplates);
  
  for (let i = 0; i < panelCount; i++) {
    panels.push({
      id: `panel-${i + 1}`,
      order: i,
      caption: templates[i] || `A moment of ${analysis.primaryEmotion} reflection`,
      altText: `Panel ${i + 1}: A manga-style illustration depicting ${analysis.primaryEmotion} emotions`,
      style: 'bw' // Black and white manga style
    });
  }
  
  return panels;
}

/**
 * Generate source references for tracking
 * @param {Array} chatLogs - Chat messages
 * @returns {Array} Source reference objects  
 */
function generateSourceRefs(chatLogs) {
  return chatLogs.slice(0, 5).map((msg, index) => ({
    type: 'chat',
    id: msg.id || `msg-${index}`,
    timestamp: msg.timestamp || new Date().toISOString(),
    summary: (msg.content || '').substring(0, 50) + '...'
  }));
}

/**
 * Generate content warnings if needed
 * @param {Object} analysis - Day analysis results
 * @returns {string[]} Array of content warnings
 */
function generateContentWarnings(analysis) {
  const warnings = [];
  
  if (analysis.primaryEmotion === 'sad' && analysis.emotionScores.sad > 3) {
    warnings.push('Contains themes of sadness');
  }
  
  if (analysis.primaryEmotion === 'anxious' && analysis.emotionScores.anxious > 3) {
    warnings.push('Contains themes of anxiety');
  }
  
  return warnings;
}

/**
 * Apply safety filtering and content warnings
 * @param {Object} memory - Generated memory object
 * @param {string} sensitivity - Content sensitivity level
 * @returns {Object} Memory with safety pass applied
 */
function applySafetyPass(memory, sensitivity) {
  // Simple safety pass - in real implementation would use more sophisticated filtering
  
  // Add content warnings based on sensitivity level
  if (sensitivity === 'high' && memory.contentWarnings.length === 0) {
    // For high sensitivity, be more cautious
    if (memory.mood.valence < -0.5) {
      memory.contentWarnings.push('Contains emotional content');
    }
  }
  
  return memory;
}

/**
 * Generate mock chat data for testing
 * @param {string} date - Date in YYYY-MM-DD format  
 * @returns {Array} Mock chat messages
 */
export const generateMockChatData = (date) => {
  const mockMessages = [
    { id: '1', content: 'Started my day feeling a bit anxious about the presentation', timestamp: `${date}T09:00:00Z` },
    { id: '2', content: 'Decided to go for a walk to clear my head', timestamp: `${date}T10:30:00Z` },
    { id: '3', content: 'The walk really helped. Feeling much calmer now', timestamp: `${date}T11:00:00Z` },
    { id: '4', content: 'Presentation went well! So proud of myself', timestamp: `${date}T15:00:00Z` },
    { id: '5', content: 'Ending the day with gratitude. Today was good', timestamp: `${date}T21:00:00Z` }
  ];
  
  return mockMessages;
};
