// Collection Page - "Polaroid Collection of Memories"
// Interactive draggable polaroid-style memory display

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// UI Components
import { Dialog, DialogContent } from '../components/ui/dialog';
import { DraggableCardBody, DraggableCardContainer } from '../components/ui/draggable-card';

// Memory Components
import {
  MangaReader,
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
 * Collection page displaying memories as interactive polaroid cards
 * Features draggable, tiltable cards with physics-based interactions
 */
export default function CollectionPage() {
  const router = useRouter();
  
  // State management
  const [memories, setMemories] = useState([]);
  const [currentMemory, setCurrentMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Position tracking for draggable cards
  const [cardPositions, setCardPositions] = useState({});

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


  // Open memory in reader
  const openMemory = async (memoryId) => {
    await memoryStore.openReader(memoryId);
    setIsReaderOpen(true);
    
    // Update URL without triggering navigation
    router.push(`/collection?date=${memoryId}`, undefined, { shallow: true });
  };

  // Close reader
  const closeReader = () => {
    memoryStore.closeReader();
    setIsReaderOpen(false);
    
    // Remove date from URL
    router.push('/collection', undefined, { shallow: true });
  };

  // Navigate to adjacent memories in reader
  const navigateToMemory = (direction) => {
    if (!currentMemory || !memories.length) return;
    
    const adjacentMemory = findAdjacentMemory(memories, currentMemory.id, direction);
    if (adjacentMemory) {
      openMemory(adjacentMemory.id);
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

  // Generate initial positions for polaroids (x, y coordinates and rotations)
  const generateInitialPositions = (memories) => {
    const positions = [
      { x: -200, y: -150, rotation: -8 },
      { x: -100, y: -80, rotation: 5 },
      { x: 50, y: -180, rotation: -3 },
      { x: 200, y: -50, rotation: 7 },
      { x: 300, y: -120, rotation: -5 },
      { x: -150, y: 50, rotation: 10 },
      { x: -50, y: 20, rotation: -7 },
      { x: 100, y: -200, rotation: 4 },
      { x: 250, y: 80, rotation: -2 },
      { x: 350, y: -160, rotation: 6 },
      { x: -250, y: 120, rotation: -9 },
      { x: 0, y: 60, rotation: 3 },
    ];
    
    return memories.map((memory, index) => {
      const defaultPos = positions[index % positions.length];
      const savedPos = cardPositions[memory.id];
      
      return {
        ...memory,
        x: savedPos?.x ?? defaultPos.x,
        y: savedPos?.y ?? defaultPos.y,
        rotation: defaultPos.rotation
      };
    });
  };

  // Handle position updates from draggable cards
  const handlePositionChange = (memoryId, x, y) => {
    setCardPositions(prev => ({
      ...prev,
      [memoryId]: { x, y }
    }));
  };

  const memoriesWithPositions = generateInitialPositions(memories);

  return (
    <>
      <Head>
        <title>Collection - Polaroid Memories</title>
        <meta name="description" content="Browse your memories as an interactive polaroid collection" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Creepster&family=Bangers&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="manga-memories-page">
        {/* Manga-style header with dramatic title */}
        <div className="manga-header">
          <div className="manga-title-panel">
            <h1 className="manga-title">COLLECTION</h1>
            <div className="manga-subtitle">～ポラロイドコレクション～</div>
            <div className="speed-lines"></div>
          </div>
        </div>

        {/* Main content area */}
        <div className="manga-content">
          {/* Loading state */}
          {isLoading && <LoadingState />}

          {/* Error state */}
          {error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

          {/* Empty state */}
          {!isLoading && !error && memories.length === 0 && <EmptyState />}

          {/* Polaroid Collection */}
          {!isLoading && !error && memories.length > 0 && (
            <DraggableCardContainer className="relative flex min-h-screen w-full items-center justify-center overflow-clip bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
              {/* Background text for atmosphere */}
              <p className="absolute top-1/2 mx-auto max-w-2xl -translate-y-3/4 text-center text-3xl font-black text-neutral-300 md:text-5xl dark:text-neutral-700 select-none pointer-events-none">
                Your memories scattered like polaroids...
              </p>
              
              {/* Draggable Polaroid Cards */}
              {memoriesWithPositions.map((memory, index) => (
                <DraggableCardBody 
                  key={memory.id}
                  className={`polaroid-card cursor-grab active:cursor-grabbing bg-white dark:bg-neutral-100 shadow-xl`}
                  initialX={memory.x}
                  initialY={memory.y}
                  onPositionChange={(x, y) => handlePositionChange(memory.id, x, y)}
                  style={{ 
                    transform: `rotate(${memory.rotation}deg)`
                  }}
                >
                  {/* Polaroid image area */}
                  <div 
                    className="relative h-64 w-64 bg-gray-200 mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openMemory(memory.id)}
                  >
                    {memory.image ? (
                      <img
                        src={memory.image}
                        alt={memory.title}
                        className="pointer-events-none relative z-10 h-full w-full object-cover"
                      />
                    ) : (
                      // Placeholder for memories without images
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-300 dark:to-neutral-400">
                        <div className="text-center text-neutral-600">
                          <div className="text-4xl mb-2">{memory.mood?.emoji || '📝'}</div>
                          <div className="text-sm font-medium">{memory.date}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="text-white font-bold text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        Click to read
                      </div>
                    </div>
                  </div>
                  
                  {/* Polaroid caption area */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-800 line-clamp-1">
                      {memory.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-600">
                      {memory.date}
                    </p>
                    {memory.mood && (
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <span>{memory.mood.emoji}</span>
                        <span className="text-neutral-500">{memory.mood.name}</span>
                      </div>
                    )}
                  </div>
                </DraggableCardBody>
              ))}
            </DraggableCardContainer>
          )}
        </div>

        {/* Floating generate button */}
        <GenerateButton onGenerate={generateTodaysMemory} isGenerating={isGenerating} />

        {/* Development Panel */}
        {isDevelopment && (
          <DevPanel
            isVisible={showDevPanel}
            onToggle={() => setShowDevPanel(!showDevPanel)}
            onSeedData={seedTestData}
            onClearData={clearTestData}
            memoriesCount={memories.length}
            isLoading={isLoading}
          />
        )}

        {/* Manga Reader Dialog */}
        <Dialog open={isReaderOpen} onOpenChange={closeReader}>
          <DialogContent className="manga-reader-dialog max-w-6xl" showCloseButton={false}>
            {currentMemory && (
              <MangaReader 
                memory={currentMemory}
                onEdit={() => {}} // Disable editing in collection view
                onNext={() => navigateToMemory('next')}
                onPrev={() => navigateToMemory('prev')}
                onClose={closeReader}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Custom styles for polaroid effect */}
      <style jsx>{`
        .polaroid-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.12),
            0 2px 4px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        
        .polaroid-card:hover {
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.15),
            0 4px 8px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
