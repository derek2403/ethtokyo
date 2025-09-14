// GenerateButton Component - Floating action button for generating today's memory
import React from 'react';
import { Sparkles } from 'lucide-react';

// UI Components
import { Button } from '../ui/button';

/**
 * Floating action button for generating today's memory
 * Features manga-style animation when generating
 */
export default function GenerateButton({ onGenerate, isGenerating }) {
  return (
    <div className="manga-floating-actions">
      <Button 
        className={`manga-generate-button ${isGenerating ? 'generating' : ''}`}
        onClick={onGenerate}
        disabled={isGenerating}
        size="lg"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        {isGenerating ? 'GENERATING...' : 'GENERATE TODAY'}
      </Button>
    </div>
  );
}
