// Memories Page - "Manga of your days" feature
// Black-and-white manga-style theme with dynamic comic panels

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// UI Components
import { Dialog, DialogContent } from '../components/ui/dialog';

// Memory Components
import {
  MangaReader,
  MangaEditor,
  FilterBar,
  MemoryGrid,
  DevPanel,
  GenerateButton,
  LoadingState,
  ErrorState,
  EmptyState
} from '../components/memories';

// Memory store and utilities
import { memoryStore } from '../lib/memories/store';
import { generateMemoryForDate, generateMockChatData } from '../lib/memories/generator';
import { seedMemories, clearAllMemories } from '../lib/memories/seedData';
import { 
  showToast, 
  getTodayDateString, 
  findMemoryByDate, 
  findAdjacentMemory 
} from '../lib/memories/utils';

/**
 * Main Memories page with manga-style design
 * Features dynamic comic panels, screentone textures, and bold manga aesthetics
 */
export default function MemoriesPage() {
  const router = useRouter();
  
  // State management
  const [memories, setMemories] = useState([]);
  const [currentMemory, setCurrentMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter and search state
  const [filters, setFilters] = useState({
    month: null,
    favorite: false,
    mood: null,
    tags: []
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Development state (only in development)
  const [showDevPanel, setShowDevPanel] = useState(false);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = memoryStore.subscribe(() => {
      setMemories([...memoryStore.memories]);
      setCurrentMemory(memoryStore.currentMemory);
      setIsLoading(memoryStore.isLoading);
      setError(memoryStore.error);
    });

    return unsubscribe;
  }, []);

  // Load memories on page mount
  useEffect(() => {
    loadMemories();
  }, []);

  // Handle URL date parameter (deep linking)
  useEffect(() => {
    if (router.query.date && !isReaderOpen) {
      openMemory(router.query.date);
    }
  }, [router.query.date]);

  // Load memories with current filters
  const loadMemories = async () => {
    try {
      await memoryStore.loadMemories();
    } catch (error) {
      console.error('Failed to load memories:', error);
      setError('Failed to load memories');
    }
  };

  // Handle filter changes
  const handleFiltersChange = async (newFilters) => {
    setFilters(newFilters);
    await memoryStore.updateFilters(newFilters);
  };

  // Handle search changes
  const handleSearchChange = async (query) => {
    setSearchQuery(query);
    await memoryStore.updateSearch(query);
  };

  // Open memory in reader
  const openMemory = async (memoryId) => {
    await memoryStore.openReader(memoryId);
    setIsReaderOpen(true);
    
    // Update URL without triggering navigation
    router.push(`/memories?date=${memoryId}`, undefined, { shallow: true });
  };

  // Close reader
  const closeReader = () => {
    memoryStore.closeReader();
    setIsReaderOpen(false);
    setIsEditorOpen(false);
    
    // Remove date from URL
    router.push('/memories', undefined, { shallow: true });
  };

  // Open editor
  const openEditor = () => {
    setIsEditorOpen(true);
  };

  // Close editor
  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  // Save memory from editor
  const saveMemory = async (editedMemory) => {
    try {
      await memoryStore.saveMemory(editedMemory);
      setIsEditorOpen(false);
      
      // Reload memories to reflect changes
      await loadMemories();
      
      // Show success message
      showToast('Memory updated successfully!');
    } catch (error) {
      console.error('Failed to save memory:', error);
      showToast('Failed to save memory', 'error');
    }
  };

  // Generate today's memory
  const generateTodaysMemory = async () => {
    setIsGenerating(true);
    
    try {
      const today = getTodayDateString();
      
      // Check if today's memory already exists
      const existingMemory = findMemoryByDate(memories, today);
      if (existingMemory) {
        if (!confirm('Today\'s memory already exists. Regenerate it?')) {
          setIsGenerating(false);
          return;
        }
      }
      
      // Generate mock chat data for today (in real app, would fetch from chat history)
      const mockChatData = generateMockChatData(today);
      
      // Generate the memory
      const generatedMemory = await generateMemoryForDate(today, mockChatData);
      
      // Save the generated memory
      await memoryStore.saveMemory(generatedMemory);
      
      // Open the newly generated memory in reader
      await openMemory(today);
      
      showToast('Today\'s memory generated successfully!');
      
    } catch (error) {
      console.error('Failed to generate memory:', error);
      showToast('Failed to generate memory', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigate to adjacent memories in reader
  const navigateToMemory = (direction) => {
    if (!currentMemory || !memories.length) return;
    
    const adjacentMemory = findAdjacentMemory(memories, currentMemory.id, direction);
    if (adjacentMemory) {
      openMemory(adjacentMemory.id);
    }
  };


  // Development helper functions
  const seedTestData = async () => {
    setIsLoading(true);
    try {
      const count = await seedMemories(60);
      await loadMemories();
      showToast(`Created ${count} test memories!`);
    } catch (error) {
      console.error('Failed to seed data:', error);
      showToast('Failed to seed test data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm('Clear all memories? This cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      await clearAllMemories();
      await loadMemories();
      showToast('All memories cleared!');
    } catch (error) {
      console.error('Failed to clear data:', error);
      showToast('Failed to clear memories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Memories - Your Days in Manga</title>
        <meta name="description" content="Browse and read your daily memories as manga pages" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Creepster&family=Bangers&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="manga-memories-page">
        {/* Manga-style header with dramatic title */}
        <div className="manga-header">
          <div className="manga-title-panel">
            <h1 className="manga-title">MEMORIES</h1>
            <div className="manga-subtitle">～あなたの日々の物語～</div>
            <div className="speed-lines"></div>
          </div>
        </div>

        {/* Main content area with proper scrolling */}
        <div className="manga-content">
          {/* Search and filter controls */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            memoriesCount={memories.length}
          />

          {/* Loading state */}
          {isLoading && <LoadingState />}

          {/* Error state */}
          {error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

          {/* Empty state */}
          {!isLoading && !error && memories.length === 0 && <EmptyState />}

          {/* Memory grid */}
          {!isLoading && !error && memories.length > 0 && (
            <MemoryGrid memories={memories} onMemoryClick={openMemory} />
          )}
        </div>

        {/* Floating generate button */}
        <GenerateButton onGenerate={generateTodaysMemory} isGenerating={isGenerating} />

        {/* Development Panel */}
        <DevPanel
          isVisible={showDevPanel}
          onToggle={() => setShowDevPanel(!showDevPanel)}
          onSeedData={seedTestData}
          onClearData={clearTestData}
          memoriesCount={memories.length}
          isLoading={isLoading}
        />

        {/* Manga Reader Dialog */}
        <Dialog open={isReaderOpen} onOpenChange={closeReader}>
          <DialogContent className="manga-reader-dialog max-w-6xl" showCloseButton={false}>
            {currentMemory && (
              <MangaReader 
                memory={currentMemory}
                onEdit={openEditor}
                onNext={() => navigateToMemory('next')}
                onPrev={() => navigateToMemory('prev')}
                onClose={closeReader}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Manga Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={closeEditor}>
          <DialogContent className="manga-editor-dialog max-w-4xl">
            {currentMemory && (
              <MangaEditor 
                memory={currentMemory}
                onSave={saveMemory}
                onCancel={closeEditor}
                isLoading={isLoading}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

    </>
  );
}
