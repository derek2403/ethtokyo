// Memory store and state management 
// Simple state management for memories with local persistence

import { getAllMemories, getMemory, saveMemory, deleteMemory } from './db.js';

/**
 * Simple state store for memories
 * Manages memories list, current selection, filters, and UI state
 */
class MemoryStore {
  constructor() {
    // Core data
    this.memories = [];
    this.currentMemory = null;
    
    // UI state
    this.selectedDate = null;
    this.isReaderOpen = false;
    this.isLoading = false;
    this.error = null;
    
    // Filters and search
    this.filters = {
      month: null,      // e.g., "2025-04"
      favorite: false,
      mood: null,       // 'calm', 'happy', etc.
      tags: []          // array of tag strings
    };
    this.searchQuery = '';
    
    // Settings
    this.reduceMotion = false;
    
    // Listeners for state changes
    this.listeners = [];
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function called on state change
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Load all memories from IndexedDB with current filters
   */
  async loadMemories() {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      this.memories = await getAllMemories(this.filters);
      
      // Apply search filter if active
      if (this.searchQuery.trim()) {
        this.memories = this.filterBySearch(this.memories, this.searchQuery);
      }
      
      this.isLoading = false;
      this.notify();
    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      this.notify();
      console.error('Failed to load memories:', error);
    }
  }

  /**
   * Filter memories by search query (simple text matching)
   * @param {Memory[]} memories - Array of memories to filter
   * @param {string} query - Search query
   * @returns {Memory[]} Filtered memories
   */
  filterBySearch(memories, query) {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return memories;

    return memories.filter(memory => {
      const searchableText = [
        memory.title,
        memory.logline,
        memory.tags.join(' '),
        memory.keyMoments?.map(m => m.note).join(' ') || '',
        memory.panels?.map(p => p.caption).join(' ') || ''
      ].join(' ').toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  /**
   * Get memory by date/ID
   * @param {string} id - Memory ID (YYYY-MM-DD)
   */
  async getMemoryById(id) {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      this.currentMemory = await getMemory(id);
      this.isLoading = false;
      this.notify();
      return this.currentMemory;
    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      this.notify();
      console.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * Save a memory (create or update)
   * @param {Memory} memory - Memory object to save
   */
  async saveMemory(memory) {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const savedMemory = await saveMemory(memory);
      
      // Update local state
      const existingIndex = this.memories.findIndex(m => m.id === savedMemory.id);
      if (existingIndex >= 0) {
        this.memories[existingIndex] = savedMemory;
      } else {
        this.memories.unshift(savedMemory); // Add to beginning (newest first)
      }
      
      if (this.currentMemory?.id === savedMemory.id) {
        this.currentMemory = savedMemory;
      }
      
      this.isLoading = false;
      this.notify();
      return savedMemory;
    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      this.notify();
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  /**
   * Delete a memory
   * @param {string} id - Memory ID to delete
   */
  async deleteMemory(id) {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      await deleteMemory(id);
      
      // Update local state
      this.memories = this.memories.filter(m => m.id !== id);
      if (this.currentMemory?.id === id) {
        this.currentMemory = null;
      }
      
      this.isLoading = false;
      this.notify();
    } catch (error) {
      this.error = error.message;
      this.isLoading = false;
      this.notify();
      console.error('Failed to delete memory:', error);
      throw error;
    }
  }

  /**
   * Update filters and reload memories
   * @param {Object} newFilters - Filter updates
   */
  async updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    await this.loadMemories();
  }

  /**
   * Update search query and filter memories
   * @param {string} query - Search query
   */
  async updateSearch(query) {
    this.searchQuery = query;
    await this.loadMemories();
  }

  /**
   * Open reader for specific memory
   * @param {string} memoryId - Memory ID to open
   */
  async openReader(memoryId) {
    await this.getMemoryById(memoryId);
    this.selectedDate = memoryId;
    this.isReaderOpen = true;
    this.notify();
  }

  /**
   * Close reader
   */
  closeReader() {
    this.isReaderOpen = false;
    this.selectedDate = null;
    this.currentMemory = null;
    this.notify();
  }

  /**
   * Toggle favorite status for a memory
   * @param {string} memoryId - Memory ID to toggle
   */
  async toggleFavorite(memoryId) {
    const memory = this.memories.find(m => m.id === memoryId) || this.currentMemory;
    if (!memory) return;

    const updatedMemory = {
      ...memory,
      favorite: !memory.favorite
    };

    await this.saveMemory(updatedMemory);
  }

  /**
   * Get memories grouped by month for grid display
   * @returns {Object} Memories grouped by month
   */
  getMemoriesByMonth() {
    const grouped = {};
    
    this.memories.forEach(memory => {
      const monthKey = memory.date.substring(0, 7); // "YYYY-MM"
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(memory);
    });
    
    return grouped;
  }
}

// Create and export singleton store instance
export const memoryStore = new MemoryStore();

// Initialize preferences from localStorage
if (typeof window !== 'undefined') {
  memoryStore.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
