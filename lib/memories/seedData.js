// Seed data utilities for testing the Memories feature
// Creates realistic mock memories for the past 60 days

import { saveMemory } from './db.js';
import { generateMemoryForDate, generateMockChatData } from './generator.js';

/**
 * Generate and save mock memories for the past N days
 * Creates a variety of realistic memories for testing
 * @param {number} days - Number of days back to generate memories for
 * @returns {Promise<number>} Number of memories created
 */
export const seedMemories = async (days = 60) => {
  console.log(`🌱 Seeding ${days} days of mock memories...`);
  
  let createdCount = 0;
  const today = new Date();
  
  // Create memories for past N days (skip some days to be realistic)
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Skip some days randomly to make it more realistic (not every day has a memory)
    if (Math.random() < 0.3) continue; // Skip 30% of days
    
    try {
      // Generate varied mock chat data based on day patterns
      const mockChatData = generateVariedMockChatData(dateStr, i);
      
      // Generate memory using the generator
      const memory = await generateMemoryForDate(dateStr, mockChatData, {
        tone: getRandomTone(),
        panelCount: Math.floor(Math.random() * 4) + 3, // 3-6 panels
        contentSensitivity: 'medium'
      });
      
      // Add some randomization to make memories more diverse
      const enhancedMemory = enhanceMemoryWithVariation(memory, i);
      
      // Save to database
      await saveMemory(enhancedMemory);
      createdCount++;
      
      // Log progress every 10 memories
      if (createdCount % 10 === 0) {
        console.log(`📝 Created ${createdCount} memories so far...`);
      }
      
    } catch (error) {
      console.warn(`Failed to create memory for ${dateStr}:`, error);
    }
  }
  
  console.log(`✅ Successfully seeded ${createdCount} memories!`);
  return createdCount;
};

/**
 * Generate varied mock chat data based on day patterns and themes
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} daysAgo - Number of days ago (affects patterns)
 * @returns {Array} Mock chat messages
 */
function generateVariedMockChatData(dateStr, daysAgo) {
  const dayOfWeek = new Date(dateStr).getDay(); // 0 = Sunday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isMonday = dayOfWeek === 1;
  
  // Different themes for different types of days
  const themes = {
    workStress: [
      'Feeling overwhelmed with the project deadline approaching',
      'Had a tough meeting today, but managed to stay calm',
      'Work is challenging, but trying to stay positive',
      'Took some deep breaths during lunch to manage stress',
      'Proud of how I handled the difficult situation'
    ],
    relaxation: [
      'Started the day with a peaceful meditation session',
      'Went for a lovely walk in the park this afternoon',
      'Reading a good book always helps me unwind',
      'Feeling grateful for this quiet weekend morning',
      'Enjoyed some time in nature today'
    ],
    social: [
      'Had a wonderful lunch with my friend today',
      'Family dinner was really heartwarming',
      'Interesting conversation with a colleague about mindfulness',
      'Called mom - it always makes me feel better',
      'Grateful for the people in my life'
    ],
    growth: [
      'Learned something new about myself today',
      'Practiced that new breathing technique',
      'Made progress on my personal goals',
      'Reflected on recent challenges and growth',
      'Feeling proud of my recent progress'
    ],
    difficult: [
      'Having a tough day emotionally',
      'Feeling anxious about upcoming changes',
      'Working through some difficult feelings',
      'Trying to be patient with myself today',
      'Tomorrow will be better - staying hopeful'
    ]
  };
  
  // Choose theme based on day patterns
  let selectedTheme;
  if (isMonday) {
    selectedTheme = Math.random() < 0.6 ? 'workStress' : 'growth';
  } else if (isWeekend) {
    selectedTheme = Math.random() < 0.7 ? 'relaxation' : 'social';
  } else if (daysAgo % 7 === 3) { // Wednesday pattern for difficult days
    selectedTheme = Math.random() < 0.3 ? 'difficult' : 'growth';
  } else {
    const themeKeys = Object.keys(themes);
    selectedTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
  }
  
  // Generate messages from selected theme
  const themeMessages = themes[selectedTheme];
  const messageCount = Math.floor(Math.random() * 3) + 3; // 3-5 messages
  const selectedMessages = [];
  
  for (let i = 0; i < messageCount; i++) {
    const message = themeMessages[Math.floor(Math.random() * themeMessages.length)];
    if (!selectedMessages.includes(message)) {
      selectedMessages.push(message);
    }
  }
  
  // Convert to chat message format
  return selectedMessages.map((content, index) => ({
    id: `msg-${dateStr}-${index}`,
    content,
    timestamp: `${dateStr}T${String(9 + index * 2).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
    type: 'user'
  }));
}

/**
 * Enhance generated memory with additional variation and realism
 * @param {Object} memory - Generated memory object
 * @param {number} daysAgo - Days ago for pattern-based enhancements
 * @returns {Object} Enhanced memory
 */
function enhanceMemoryWithVariation(memory, daysAgo) {
  // Add favorite status to some memories (about 20%)
  if (Math.random() < 0.2) {
    memory.favorite = true;
  }
  
  // Add some variety to titles based on mood
  const titleVariations = {
    happy: [
      'A day filled with joy',
      'Finding light in every moment', 
      'Gratitude and smiles',
      'When everything clicks',
      'Pure contentment'
    ],
    calm: [
      'Peace in the present moment',
      'Quiet strength',
      'Finding my center',
      'Stillness and clarity', 
      'Serene reflections'
    ],
    anxious: [
      'Navigating stormy waters',
      'Finding calm in the chaos',
      'Working through the worry',
      'Strength through struggle',
      'One breath at a time'
    ],
    sad: [
      'Honoring difficult emotions',
      'Finding light in darkness',
      'Gentle self-compassion',
      'Processing and healing',
      'Tomorrow\'s hope'
    ],
    mixed: [
      'A day of many colors',
      'Complex emotions, simple truths',
      'The full spectrum of feeling',
      'Life\'s rich tapestry',
      'Embracing all emotions'
    ]
  };
  
  // Sometimes replace title with a variation
  if (Math.random() < 0.4) {
    const variations = titleVariations[memory.mood.primary] || titleVariations.mixed;
    memory.title = variations[Math.floor(Math.random() * variations.length)];
  }
  
  // Add some additional tags based on patterns
  const additionalTags = [];
  if (daysAgo % 7 === 1) additionalTags.push('monday-motivation'); // Mondays
  if (daysAgo % 7 === 5 || daysAgo % 7 === 6) additionalTags.push('weekend-vibes'); // Weekends
  if (Math.random() < 0.3) additionalTags.push('breakthrough'); // Random breakthrough moments
  if (Math.random() < 0.2) additionalTags.push('creative'); // Creative days
  
  memory.tags = [...new Set([...memory.tags, ...additionalTags])];
  
  // Add content warnings for some difficult days
  if (memory.mood.primary === 'sad' || memory.mood.primary === 'anxious') {
    if (Math.random() < 0.3) {
      memory.contentWarnings = [...(memory.contentWarnings || []), 'Contains emotional processing'];
    }
  }
  
  // Vary panel styles
  if (memory.panels) {
    memory.panels.forEach((panel, index) => {
      // Vary panel styles more
      const styles = ['bw', 'halftone', 'colorAccent'];
      if (Math.random() < 0.3) {
        panel.style = styles[Math.floor(Math.random() * styles.length)];
      }
      
      // Make some captions more personal
      if (Math.random() < 0.4) {
        panel.caption = personalizeCaption(panel.caption, memory.mood.primary);
      }
    });
  }
  
  return memory;
}

/**
 * Get a random tone for generation variety
 * @returns {string} Random tone
 */
function getRandomTone() {
  const tones = ['reflective', 'hopeful', 'contemplative', 'gentle', 'encouraging'];
  return tones[Math.floor(Math.random() * tones.length)];
}

/**
 * Personalize panel captions based on mood
 * @param {string} caption - Original caption
 * @param {string} mood - Primary mood
 * @returns {string} Personalized caption
 */
function personalizeCaption(caption, mood) {
  const personalizations = {
    happy: [
      'The sun feels warmer when happiness fills your heart.',
      'Laughter echoes through the pages of this day.',
      'Joy transforms the ordinary into extraordinary.'
    ],
    calm: [
      'In this moment, everything is exactly as it should be.',
      'Peace settles like morning dew on the soul.',
      'Stillness speaks louder than any words.'
    ],
    anxious: [
      'Even storms pass, leaving cleaner skies behind.',
      'Courage isn\'t the absence of fear, but moving forward anyway.',
      'Each breath is an anchor in turbulent seas.'
    ],
    sad: [
      'Tears water the garden where strength will grow.',
      'Sometimes we must sit with sadness to understand joy.',
      'Even in darkness, hope plants seeds for tomorrow.'
    ]
  };
  
  const options = personalizations[mood];
  if (options && Math.random() < 0.5) {
    return options[Math.floor(Math.random() * options.length)];
  }
  
  return caption;
}

/**
 * Clear all existing memories (for development/testing)
 * @returns {Promise<boolean>} Success status
 */
export const clearAllMemories = async () => {
  try {
    const { exportMemories } = await import('./db.js');
    const data = await exportMemories();
    
    console.log(`🗑️ Clearing ${data.memories.length} existing memories...`);
    
    // Delete each memory individually (IndexedDB doesn't have a clear all method in our implementation)
    const { deleteMemory } = await import('./db.js');
    for (const memory of data.memories) {
      await deleteMemory(memory.id);
    }
    
    console.log('✅ All memories cleared!');
    return true;
  } catch (error) {
    console.error('Failed to clear memories:', error);
    return false;
  }
};

/**
 * Quick setup function for development
 * Clears existing data and creates fresh seed data
 */
export const setupDevelopmentData = async () => {
  console.log('🚀 Setting up development data...');
  
  await clearAllMemories();
  await seedMemories(60);
  
  console.log('🎉 Development data setup complete!');
};
