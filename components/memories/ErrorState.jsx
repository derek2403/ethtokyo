// ErrorState Component - Manga-styled error display
import React from 'react';

// UI Components
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

/**
 * Manga-style error state with dramatic explosion text
 */
export default function ErrorState({ error, onRetry }) {
  return (
    <div className="manga-error">
      <Card className="manga-error-card">
        <CardContent className="p-6 text-center">
          <div className="manga-explosion">ERROR!</div>
          <p className="mt-4">{error}</p>
          <Button onClick={onRetry} className="mt-4 manga-button">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
