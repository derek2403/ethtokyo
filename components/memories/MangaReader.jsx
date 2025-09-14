// MangaReader Component - Full-screen memory reader with manga styling
import React, { useState } from 'react';
import { Edit3, X, ChevronLeft, ChevronRight } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

/**
 * Full-screen manga-style memory reader
 * Displays memory content as comic book pages with navigation
 */
export default function MangaReader({ memory, onEdit, onNext, onPrev, onClose }) {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="manga-reader">
      {/* Reader header with title and controls */}
      <div className="manga-reader-header">
        <div>
          <h2 className="manga-reader-title">{memory.title}</h2>
          <div className="manga-reader-date">{formatDate(memory.date)}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="manga-button">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="manga-button">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable reader content */}
      <ScrollArea className="manga-reader-content">
        <div className="manga-reader-pages">
          {/* Summary page - first page showing memory overview */}
          <div className="manga-reader-page">
            <Card className="manga-summary-panel">
              <CardHeader>
                <CardTitle className="manga-panel-title">Today's Story</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="manga-speech-bubble">
                  <div className="speech-text">"{memory.logline}"</div>
                </div>
                
                <div className="manga-metadata">
                  {/* Mood information */}
                  <div className="metadata-item">
                    <strong>Mood:</strong> {memory.mood?.primary} {memory.mood && (
                      <span className="ml-2">
                        Energy: {(memory.mood.energy * 100).toFixed(0)}% | 
                        Valence: {memory.mood.valence > 0 ? '+' : ''}{memory.mood.valence.toFixed(1)}
                      </span>
                    )}
                  </div>
                  
                  {/* Tags display */}
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="metadata-item">
                      <strong>Tags:</strong>
                      <div className="manga-tags mt-2">
                        {memory.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="manga-tag">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Key moments timeline */}
                  {memory.keyMoments && memory.keyMoments.length > 0 && (
                    <div className="metadata-item">
                      <strong>Key Moments:</strong>
                      <div className="key-moments mt-2">
                        {memory.keyMoments.map((moment, index) => (
                          <div key={index} className="moment-item">
                            {moment.time && <span className="moment-time">{moment.time}</span>}
                            <span className="moment-note">{moment.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel pages - each memory panel as a comic page */}
          {memory.panels && memory.panels.map((panel, index) => (
            <div key={panel.id} className="manga-reader-page">
              <Card className="manga-story-panel">
                <CardContent className="p-0">
                  <div className="manga-panel-container">
                    {/* Panel artwork area */}
                    <div className="manga-panel-art">
                      {panel.imgUrl ? (
                        <img 
                          src={panel.imgUrl} 
                          alt={panel.altText}
                          className="panel-image"
                        />
                      ) : (
                        <div className="manga-art-placeholder">
                          <div className="art-frame">
                            <div className="art-icon">🎭</div>
                            <div className="panel-number">Panel {index + 1}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Panel caption in speech bubble */}
                    <div className="manga-panel-caption">
                      <div className="manga-speech-bubble">
                        <div className="speech-text">{panel.caption}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Navigation controls */}
      <div className="manga-reader-nav">
        <Button variant="outline" onClick={onPrev} className="manga-button">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="page-info">
          Page {currentPage + 1} of {(memory.panels?.length || 0) + 1}
        </div>
        
        <Button variant="outline" onClick={onNext} className="manga-button">
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <style jsx>{`
        .manga-reader {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .manga-reader-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 3px solid black;
          background: rgba(0,0,0,0.05);
        }

        .manga-reader-title {
          font-family: 'Bangers', cursive;
          font-size: 1.5rem;
          font-weight: bold;
          color: black;
          margin: 0;
          text-transform: uppercase;
        }

        .manga-reader-date {
          font-family: 'Courier Prime', monospace;
          font-size: 0.9rem;
          color: rgba(0,0,0,0.7);
          font-weight: bold;
        }

        .manga-reader-content {
          flex: 1;
          padding: 1rem;
        }

        .manga-reader-pages {
          display: grid;
          gap: 2rem;
        }

        .manga-reader-page {
          min-height: 300px;
        }

        .manga-summary-panel,
        .manga-story-panel {
          border: 4px solid black !important;
          background: white !important;
          box-shadow: 6px 6px 0 rgba(0,0,0,0.2) !important;
        }

        .manga-panel-title {
          font-family: 'Bangers', cursive;
          font-size: 1.3rem;
          color: black;
          text-transform: uppercase;
        }

        .manga-metadata {
          margin-top: 1.5rem;
        }

        .metadata-item {
          margin-bottom: 1rem;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
        }

        .key-moments {
          background: rgba(0,0,0,0.05);
          padding: 1rem;
          border: 2px solid black;
          margin-top: 0.5rem;
        }

        .moment-item {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .moment-time {
          font-weight: bold;
          color: black;
          min-width: 60px;
        }

        .moment-note {
          color: rgba(0,0,0,0.8);
        }

        .manga-panel-container {
          position: relative;
          min-height: 300px;
        }

        .manga-panel-art {
          height: 200px;
          border-bottom: 3px solid black;
          background: rgba(0,0,0,0.05);
        }

        .panel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .manga-art-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(0,0,0,0.1) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(0,0,0,0.1) 1px, transparent 1px);
          background-size: 15px 15px;
          background-position: 0 0, 7px 7px;
        }

        .art-frame {
          text-align: center;
          border: 3px solid black;
          background: white;
          padding: 2rem;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
        }

        .art-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .panel-number {
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          color: rgba(0,0,0,0.7);
        }

        .manga-panel-caption {
          padding: 1rem;
        }

        .manga-reader-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-top: 3px solid black;
          background: rgba(0,0,0,0.05);
        }

        .page-info {
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          color: rgba(0,0,0,0.8);
        }

        /* Shared manga styles - these are duplicated from main page */
        .manga-speech-bubble {
          position: relative;
          background: white;
          border: 3px solid black;
          border-radius: 20px;
          padding: 1rem;
          margin: 1rem 0;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }

        .manga-speech-bubble::before {
          content: '';
          position: absolute;
          bottom: -15px;
          left: 20px;
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 15px solid black;
        }

        .manga-speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 22px;
          width: 0;
          height: 0;
          border-left: 13px solid transparent;
          border-right: 13px solid transparent;
          border-top: 13px solid white;
        }

        .speech-text {
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          line-height: 1.4;
          color: black !important;
        }

        .manga-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin: 1rem 0;
        }

        .manga-tag {
          border: 2px solid black !important;
          font-family: 'Courier Prime', monospace;
          font-weight: bold;
          font-size: 0.7rem;
          background: white !important;
          color: black !important;
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
      `}</style>
    </div>
  );
}
