// LoadingState Component - Manga-styled loading indicator
import React from 'react';

/**
 * Manga-style loading state with dramatic burst animation
 */
export default function LoadingState() {
  return (
    <div className="manga-loading">
      <div className="manga-panel loading-panel">
        <div className="loading-burst">
          <div className="loading-text">LOADING...</div>
          <div className="speed-lines-circular"></div>
        </div>
      </div>
    </div>
  );
}
