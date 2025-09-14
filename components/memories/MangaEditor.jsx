// MangaEditor Component - Memory editing interface with manga styling
import React, { useState } from 'react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { DialogHeader, DialogTitle } from '../ui/dialog';

/**
 * Manga-style memory editor
 * Allows editing of memory content, mood, and metadata
 */
export default function MangaEditor({ memory, onSave, onCancel, isLoading }) {
  const [editedMemory, setEditedMemory] = useState({ ...memory });

  // Handle save with proper memory structure
  const handleSave = () => {
    const memoryToSave = {
      ...editedMemory,
      status: 'edited',
      updatedAt: new Date().toISOString()
    };
    onSave(memoryToSave);
  };

  return (
    <div className="manga-editor">
      <DialogHeader>
        <DialogTitle className="manga-editor-title">Edit Memory</DialogTitle>
      </DialogHeader>

      <ScrollArea className="manga-editor-content">
        <div className="space-y-4">
          {/* Basic information section */}
          <Card className="manga-editor-section">
            <CardHeader>
              <CardTitle className="manga-section-title">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Memory title */}
              <div>
                <label className="manga-label">Title</label>
                <Input
                  value={editedMemory.title || ''}
                  onChange={(e) => setEditedMemory(prev => ({...prev, title: e.target.value}))}
                  className="manga-input"
                  placeholder="Memory title..."
                />
              </div>
              
              {/* Memory logline/summary */}
              <div>
                <label className="manga-label">Logline</label>
                <Textarea
                  value={editedMemory.logline || ''}
                  onChange={(e) => setEditedMemory(prev => ({...prev, logline: e.target.value}))}
                  className="manga-input"
                  placeholder="One-line summary..."
                  rows={2}
                />
              </div>

              {/* Tags input */}
              <div>
                <label className="manga-label">Tags (comma-separated)</label>
                <Input
                  value={editedMemory.tags ? editedMemory.tags.join(', ') : ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    setEditedMemory(prev => ({...prev, tags}));
                  }}
                  className="manga-input"
                  placeholder="exercise, meditation, friends..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Mood and feelings section */}
          <Card className="manga-editor-section">
            <CardHeader>
              <CardTitle className="manga-section-title">Mood & Feelings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary mood selector */}
              <div>
                <label className="manga-label">Primary Mood</label>
                <Select 
                  value={editedMemory.mood?.primary || 'neutral'}
                  onValueChange={(value) => setEditedMemory(prev => ({
                    ...prev,
                    mood: { ...prev.mood, primary: value }
                  }))}
                >
                  <SelectTrigger className="manga-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="happy">😊 Happy</SelectItem>
                    <SelectItem value="calm">😌 Calm</SelectItem>
                    <SelectItem value="anxious">😰 Anxious</SelectItem>
                    <SelectItem value="sad">😢 Sad</SelectItem>
                    <SelectItem value="angry">😠 Angry</SelectItem>
                    <SelectItem value="mixed">😕 Mixed</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Energy level slider */}
              <div>
                <label className="manga-label">Energy Level: {(editedMemory.mood?.energy || 0.5).toFixed(1)}</label>
                <Slider
                  value={[editedMemory.mood?.energy || 0.5]}
                  onValueChange={([value]) => setEditedMemory(prev => ({
                    ...prev,
                    mood: { ...prev.mood, energy: value }
                  }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="manga-slider"
                />
              </div>

              {/* Valence (positive/negative) slider */}
              <div>
                <label className="manga-label">Valence: {(editedMemory.mood?.valence || 0).toFixed(1)}</label>
                <Slider
                  value={[editedMemory.mood?.valence || 0]}
                  onValueChange={([value]) => setEditedMemory(prev => ({
                    ...prev,
                    mood: { ...prev.mood, valence: value }
                  }))}
                  max={1}
                  min={-1}
                  step={0.1}
                  className="manga-slider"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Editor action buttons */}
      <div className="manga-editor-actions">
        <Button variant="outline" onClick={onCancel} disabled={isLoading} className="manga-button">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading} className="manga-button">
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <style jsx>{`
        .manga-editor {
          width: 100%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .manga-editor-title {
          font-family: 'Bangers', cursive;
          font-size: 1.5rem;
          color: black;
          text-transform: uppercase;
        }

        .manga-editor-content {
          flex: 1;
          padding: 1rem 0;
        }

        .manga-editor-section {
          border: 3px solid black !important;
          background: white !important;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.2) !important;
        }

        .manga-section-title {
          font-family: 'Bangers', cursive;
          font-size: 1.2rem;
          color: black;
          text-transform: uppercase;
        }

        .manga-label {
          display: block;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          color: black;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .manga-input {
          border: 2px solid black !important;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          color: black !important;
          background: white !important;
        }

        .manga-input:focus {
          box-shadow: 0 0 0 3px rgba(0,0,0,0.1) !important;
        }

        .manga-select {
          border: 2px solid black !important;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          color: black !important;
          background: white !important;
        }

        .manga-slider {
          margin: 1rem 0;
        }

        .manga-button {
          border: 2px solid black !important;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
          transition: all 0.2s;
          color: black !important;
          background: white !important;
        }

        .manga-button:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0 rgba(0,0,0,0.3);
        }

        .manga-editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1rem 0 0;
          border-top: 3px solid black;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
