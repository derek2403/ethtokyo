// EmptyState Component - Manga-styled empty memories display
import React from 'react';

// UI Components
import { Card, CardContent } from '../ui/card';

/**
 * Manga-style empty state when no memories are found
 */
export default function EmptyState() {
  return (
    <div className="manga-empty">
      <Card className="manga-empty-card">
        <CardContent className="p-8 text-center">
          <div className="manga-speech-bubble">
            <div className="speech-text">
              No memories found!<br />
              Start by generating your first memory!
            </div>
          </div>
          <div className="manga-character">📚</div>
        </CardContent>
      </Card>
    </div>
  );
}
