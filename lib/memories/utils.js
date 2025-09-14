// Memory utility functions
// Helper functions for memory display, formatting, and interaction

/**
 * Get emoji representation for mood
 * @param {string} mood - Primary mood string
 * @returns {string} Emoji representation
 */
export const getMoodEmoji = (mood) => {
  const moodEmojis = {
    happy: '😊',
    calm: '😌', 
    anxious: '😰',
    sad: '😢',
    angry: '😠',
    mixed: '😕',
    neutral: '😐'
  };
  return moodEmojis[mood] || '😐';
};

/**
 * Group memories by month for display
 * @param {Array} memories - Array of memory objects
 * @returns {Object} Memories grouped by month key (YYYY-MM)
 */
export const getMemoriesByMonth = (memories) => {
  const grouped = {};
  memories.forEach(memory => {
    const monthKey = memory.date.substring(0, 7); // "YYYY-MM"
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(memory);
  });
  return grouped;
};

/**
 * Show manga-style toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success' | 'error')
 */
export const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `manga-toast manga-toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#000' : '#fff'};
    color: ${type === 'error' ? '#fff' : '#000'};
    padding: 12px 20px;
    border: 3px solid #000;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    z-index: 10000;
    animation: mangaSlideIn 0.3s ease;
    box-shadow: 4px 4px 0 rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
};

/**
 * Format date for memory display
 * @param {string} dateStr - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatMemoryDate = (dateStr, options = {}) => {
  const defaultOptions = {
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  };
  
  return new Date(dateStr).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Get panel size variation class for dynamic comic layout
 * @param {number} index - Panel index
 * @returns {string} CSS class name for panel size
 */
export const getPanelVariation = (index) => {
  const panelVariations = [
    'manga-panel-small',
    'manga-panel-medium', 
    'manga-panel-large',
    'manga-panel-wide',
    'manga-panel-tall'
  ];
  return panelVariations[index % panelVariations.length];
};

/**
 * Check if we're in development environment
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Generate today's date string in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format month key to readable month name
 * @param {string} monthKey - Month key in YYYY-MM format
 * @returns {string} Formatted month and year
 */
export const formatMonthHeader = (monthKey) => {
  return new Date(monthKey + '-01').toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });
};

/**
 * Get sorted months from grouped memories (newest first)
 * @param {Object} groupedMemories - Memories grouped by month
 * @returns {Array} Sorted month keys
 */
export const getSortedMonths = (groupedMemories) => {
  return Object.keys(groupedMemories).sort().reverse();
};

/**
 * Check if memory exists for given date
 * @param {Array} memories - Array of memories
 * @param {string} date - Date string to check
 * @returns {Object|null} Found memory or null
 */
export const findMemoryByDate = (memories, date) => {
  return memories.find(m => m.id === date) || null;
};

/**
 * Find adjacent memory for navigation
 * @param {Array} memories - Array of memories
 * @param {string} currentMemoryId - Current memory ID
 * @param {string} direction - 'next' or 'prev'
 * @returns {Object|null} Adjacent memory or null
 */
export const findAdjacentMemory = (memories, currentMemoryId, direction) => {
  const currentIndex = memories.findIndex(m => m.id === currentMemoryId);
  if (currentIndex === -1) return null;
  
  const nextIndex = direction === 'next' ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex >= 0 && nextIndex < memories.length) {
    return memories[nextIndex];
  }
  return null;
};
