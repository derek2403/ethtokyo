// DevPanel Component - Development tools for testing memories
import React from 'react';
import { Settings } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

// Utils
import { isDevelopment } from '../../lib/memories/utils';

/**
 * Development panel with testing utilities
 * Only visible in development environment
 */
export default function DevPanel({ 
  isVisible, 
  onToggle, 
  onSeedData, 
  onClearData, 
  onAddTestMemories,
  memoriesCount, 
  isLoading 
}) {
  // Don't render in production
  if (!isDevelopment()) {
    return null;
  }

  return (
    <div className="manga-dev-panel">
      <Button 
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="manga-dev-toggle"
      >
        <Settings className="w-4 h-4" />
      </Button>
      
      {isVisible && (
        <Card className="manga-dev-card">
          <CardHeader>
            <CardTitle className="text-sm">Dev Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={onSeedData} 
              disabled={isLoading} 
              size="sm" 
              className="w-full"
            >
              Seed Data (60 days)
            </Button>
            <Button 
              onClick={onAddTestMemories} 
              disabled={isLoading} 
              size="sm" 
              variant="secondary"
              className="w-full"
            >
              Add 3 Test Memories
            </Button>
            <Button 
              onClick={onClearData} 
              disabled={isLoading} 
              size="sm" 
              variant="destructive" 
              className="w-full"
            >
              Clear All Data
            </Button>
            <div className="text-xs text-center" style={{color: 'black'}}>
              {memoriesCount} memories
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
