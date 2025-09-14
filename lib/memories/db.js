// IndexedDB helpers for Memories feature
// Provides simple CRUD operations for Memory entities with versioned migrations

const DB_NAME = 'MemoriesDB';
const DB_VERSION = 1;
const MEMORIES_STORE = 'memories';

/**
 * Initialize IndexedDB with proper schema and indexes
 * Creates the memories object store with indexes for efficient querying
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create memories object store if it doesn't exist
      if (!db.objectStoreNames.contains(MEMORIES_STORE)) {
        const store = db.createObjectStore(MEMORIES_STORE, { keyPath: 'id' });
        
        // Create indexes for efficient querying as per plan
        store.createIndex('date', 'date');
        store.createIndex('status', 'status'); 
        store.createIndex('favorite', 'favorite');
        store.createIndex('mood_primary', 'mood.primary');
        store.createIndex('tags', 'tags', { multiEntry: true });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
  });
};

/**
 * Get all memories with optional filtering
 * @param {Object} filters - Optional filters (month, favorite, mood, tags)
 * @returns {Promise<Memory[]>} Array of memory records
 */
export const getAllMemories = async (filters = {}) => {
  const db = await initDB();
  const transaction = db.transaction([MEMORIES_STORE], 'readonly');
  const store = transaction.objectStore(MEMORIES_STORE);
  
  let request;
  
  // Apply filters if provided
  if (filters.favorite) {
    request = store.index('favorite').getAll(true);
  } else if (filters.mood) {
    request = store.index('mood_primary').getAll(filters.mood);
  } else {
    request = store.getAll();
  }
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      let memories = request.result;
      
      // Apply additional filters client-side
      if (filters.month) {
        const monthPrefix = filters.month; // e.g., "2025-04"
        memories = memories.filter(m => m.date.startsWith(monthPrefix));
      }
      
      if (filters.tags && filters.tags.length > 0) {
        memories = memories.filter(m => 
          filters.tags.some(tag => m.tags.includes(tag))
        );
      }
      
      // Sort by date descending (newest first)
      memories.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      resolve(memories);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get a single memory by ID/date
 * @param {string} id - Memory ID (usually YYYY-MM-DD format)
 * @returns {Promise<Memory|null>} Memory record or null if not found
 */
export const getMemory = async (id) => {
  const db = await initDB();
  const transaction = db.transaction([MEMORIES_STORE], 'readonly');
  const store = transaction.objectStore(MEMORIES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save or update a memory record
 * @param {Memory} memory - Memory object to save
 * @returns {Promise<Memory>} The saved memory record
 */
export const saveMemory = async (memory) => {
  const db = await initDB();
  const transaction = db.transaction([MEMORIES_STORE], 'readwrite');
  const store = transaction.objectStore(MEMORIES_STORE);
  
  // Add timestamps
  const now = new Date().toISOString();
  const memoryToSave = {
    ...memory,
    updatedAt: now,
    createdAt: memory.createdAt || now,
    version: memory.version || 1
  };
  
  return new Promise((resolve, reject) => {
    const request = store.put(memoryToSave);
    request.onsuccess = () => resolve(memoryToSave);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a memory by ID
 * @param {string} id - Memory ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteMemory = async (id) => {
  const db = await initDB();
  const transaction = db.transaction([MEMORIES_STORE], 'readwrite');
  const store = transaction.objectStore(MEMORIES_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Export all memories as JSON for backup/migration
 * @returns {Promise<Object>} Export object with metadata and memories
 */
export const exportMemories = async () => {
  const memories = await getAllMemories();
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    count: memories.length,
    memories
  };
};

/**
 * Import memories from JSON backup
 * @param {Object} exportData - Export data from exportMemories()
 * @returns {Promise<number>} Number of memories imported
 */
export const importMemories = async (exportData) => {
  const { memories = [] } = exportData;
  let importCount = 0;
  
  for (const memory of memories) {
    await saveMemory(memory);
    importCount++;
  }
  
  return importCount;
};
