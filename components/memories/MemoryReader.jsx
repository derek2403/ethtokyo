// Memory Reader Component
// Full-screen reader with two-page manga spread layout

import { useState, useEffect } from 'react';
import MoodRing from './MoodRing';

/**
 * Full-screen memory reader with manga-style two-page spread
 * Left page: summary and metadata, Right page: panels and content
 */
export default function MemoryReader({ 
  memory, 
  isOpen, 
  onClose, 
  onEdit,
  onNextMemory,
  onPrevMemory,
  reduceMotion = false 
}) {
  const [currentPage, setCurrentPage] = useState(0); // 0 = summary, 1+ = panel pages
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeydown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
          } else if (onPrevMemory) {
            onPrevMemory();
          }
          break;
        case 'ArrowRight':
          const maxPages = Math.ceil((memory?.panels?.length || 0) / 2);
          if (currentPage < maxPages) {
            setCurrentPage(currentPage + 1);
          } else if (onNextMemory) {
            onNextMemory();
          }
          break;
        case 'e':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onEdit && onEdit();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, currentPage, memory, onClose, onEdit, onNextMemory, onPrevMemory]);

  // Don't render if not open or no memory
  if (!isOpen || !memory) return null;

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get panels for current page spread
  const getPanelsForPage = (pageNumber) => {
    if (pageNumber === 0) return []; // Summary page
    
    const panels = memory.panels || [];
    const startIndex = (pageNumber - 1) * 2;
    return panels.slice(startIndex, startIndex + 2);
  };

  const maxPages = Math.ceil((memory.panels?.length || 0) / 2) + 1; // +1 for summary page
  const currentPanels = getPanelsForPage(currentPage);

  // Handle page navigation
  const goToPage = (page) => {
    setCurrentPage(Math.max(0, Math.min(maxPages - 1, page)));
  };

  return (
    <div className={`memory-reader ${isOpen ? 'open' : ''}`}>
      {/* Reader overlay */}
      <div className="reader-overlay" onClick={onClose}>
        <div className="reader-content" onClick={e => e.stopPropagation()}>
          
          {/* Header controls */}
          <div className="reader-header">
            <div className="reader-title">
              <h1>{memory.title}</h1>
              <span className="reader-date">{formatDate(memory.date)}</span>
            </div>
            
            <div className="reader-controls">
              <MoodRing mood={memory.mood} size="small" />
              
              <button 
                className="control-btn"
                onClick={() => onEdit && onEdit()}
                title="Edit memory (Ctrl+E)"
              >
                ✏️
              </button>
              
              <button 
                className="control-btn"
                onClick={onClose}
                title="Close reader (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Book content */}
          <div className="book-container">
            <div className="book-spread">
              
              {/* Left page */}
              <div className="book-page left-page">
                {currentPage === 0 ? (
                  /* Summary page */
                  <div className="summary-page">
                    <div className="summary-content">
                      <div className="logline">
                        <h2>"{memory.logline}"</h2>
                      </div>

                      <div className="metadata-section">
                        <div className="mood-section">
                          <h3>Mood Journey</h3>
                          <div className="mood-details">
                            <MoodRing mood={memory.mood} size="medium" showLabel />
                            <div className="mood-metrics">
                              <div className="metric">
                                <label>Energy:</label>
                                <div className="energy-bar">
                                  <div 
                                    className="energy-fill"
                                    style={{ width: `${memory.mood.energy * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="metric">
                                <label>Valence:</label>
                                <div className={`valence-indicator ${memory.mood.valence >= 0 ? 'positive' : 'negative'}`}>
                                  {memory.mood.valence >= 0 ? '+' : ''}{memory.mood.valence.toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {memory.keyMoments && memory.keyMoments.length > 0 && (
                          <div className="key-moments">
                            <h3>Key Moments</h3>
                            <div className="moments-list">
                              {memory.keyMoments.map((moment, index) => (
                                <div key={index} className="moment-item">
                                  {moment.time && <span className="moment-time">{moment.time}</span>}
                                  <span className="moment-note">{moment.note}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {memory.tags && memory.tags.length > 0 && (
                          <div className="tags-section">
                            <h3>Tags</h3>
                            <div className="tags-list">
                              {memory.tags.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {memory.skillsUsed && memory.skillsUsed.length > 0 && (
                          <div className="skills-section">
                            <h3>Skills Applied</h3>
                            <div className="skills-list">
                              {memory.skillsUsed.map(skill => (
                                <span key={skill} className="skill">{skill}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Panel page - left panel */
                  currentPanels[0] && (
                    <div className="panel-page">
                      <div className="manga-panel large-panel">
                        <div className="panel-content">
                          <div className="panel-image-placeholder">
                            {currentPanels[0].imgUrl ? (
                              <img 
                                src={currentPanels[0].imgUrl} 
                                alt={currentPanels[0].altText}
                                className="panel-image"
                              />
                            ) : (
                              <div className="placeholder-art">
                                <div className="art-frame">
                                  <span className="art-icon">🎭</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="panel-caption">
                            {currentPanels[0].caption}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Right page */}
              <div className="book-page right-page">
                {currentPage === 0 ? (
                  /* Cover or intro illustration */
                  <div className="cover-page">
                    <div className="cover-art">
                      {memory.coverUrl ? (
                        <img 
                          src={memory.coverUrl} 
                          alt={`Cover for ${memory.title}`}
                          className="cover-image"
                        />
                      ) : (
                        <div className="cover-placeholder">
                          <div className="cover-illustration">
                            <span className="cover-icon">📖</span>
                            <p>Memory of {formatDate(memory.date)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {memory.contentWarnings && memory.contentWarnings.length > 0 && (
                      <div className="content-warnings">
                        <h4>Content Notes:</h4>
                        {memory.contentWarnings.map((warning, index) => (
                          <p key={index} className="warning">{warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Panel page - right panel */
                  currentPanels[1] && (
                    <div className="panel-page">
                      <div className="manga-panel large-panel">
                        <div className="panel-content">
                          <div className="panel-image-placeholder">
                            {currentPanels[1].imgUrl ? (
                              <img 
                                src={currentPanels[1].imgUrl} 
                                alt={currentPanels[1].altText}
                                className="panel-image"
                              />
                            ) : (
                              <div className="placeholder-art">
                                <div className="art-frame">
                                  <span className="art-icon">🎭</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="panel-caption">
                            {currentPanels[1].caption}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="reader-nav">
            <button 
              className="nav-btn prev"
              onClick={() => currentPage > 0 ? goToPage(currentPage - 1) : onPrevMemory?.()}
              disabled={currentPage === 0 && !onPrevMemory}
              title="Previous page/memory"
            >
              ‹
            </button>
            
            <div className="page-indicator">
              <span>Page {currentPage + 1} of {maxPages}</span>
              {memory.panels && (
                <div className="page-dots">
                  {Array.from({ length: maxPages }, (_, i) => (
                    <button
                      key={i}
                      className={`page-dot ${i === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(i)}
                      title={`Go to page ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <button 
              className="nav-btn next"
              onClick={() => currentPage < maxPages - 1 ? goToPage(currentPage + 1) : onNextMemory?.()}
              disabled={currentPage === maxPages - 1 && !onNextMemory}
              title="Next page/memory"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .memory-reader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: ${reduceMotion ? 'none' : 'opacity 0.3s ease, visibility 0.3s ease'};
        }

        .memory-reader.open {
          opacity: 1;
          visibility: visible;
        }

        .reader-overlay {
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .reader-content {
          width: 100%;
          max-width: 1200px;
          height: 90vh;
          background: #f8f9fa;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: ${reduceMotion ? 'none' : 'scale(0.9)'};
          transition: ${reduceMotion ? 'none' : 'transform 0.3s ease'};
        }

        .memory-reader.open .reader-content {
          transform: scale(1);
        }

        .reader-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: white;
          border-bottom: 1px solid #e9ecef;
        }

        .reader-title h1 {
          margin: 0 0 4px 0;
          font-size: 1.5rem;
          color: #333;
        }

        .reader-date {
          font-size: 0.9rem;
          color: #666;
        }

        .reader-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .control-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .control-btn:hover {
          background: #f8f9fa;
        }

        .book-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .book-spread {
          width: 100%;
          max-width: 900px;
          height: 100%;
          display: flex;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .book-page {
          flex: 1;
          height: 100%;
          padding: 30px;
          overflow-y: auto;
        }

        .left-page {
          border-right: 1px solid #e9ecef;
        }

        .summary-page {
          height: 100%;
        }

        .summary-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .logline {
          margin-bottom: 30px;
          text-align: center;
        }

        .logline h2 {
          font-size: 1.3rem;
          font-style: italic;
          color: #495057;
          margin: 0;
          line-height: 1.4;
        }

        .metadata-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .metadata-section h3 {
          font-size: 1.1rem;
          color: #333;
          margin: 0 0 12px 0;
          border-bottom: 2px solid #667eea;
          padding-bottom: 4px;
        }

        .mood-details {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .mood-metrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .metric label {
          font-weight: 600;
          min-width: 60px;
        }

        .energy-bar {
          width: 80px;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }

        .energy-fill {
          height: 100%;
          background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
          transition: width 0.3s ease;
        }

        .valence-indicator {
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .valence-indicator.positive {
          background: #d4edda;
          color: #155724;
        }

        .valence-indicator.negative {
          background: #f8d7da;
          color: #721c24;
        }

        .moments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .moment-item {
          display: flex;
          gap: 12px;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .moment-time {
          font-weight: 600;
          color: #667eea;
          min-width: 50px;
        }

        .moment-note {
          color: #495057;
        }

        .tags-list,
        .skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag,
        .skill {
          background: #e9ecef;
          color: #495057;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .skill {
          background: #d1ecf1;
          color: #0c5460;
        }

        .cover-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }

        .cover-art {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .cover-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
        }

        .cover-placeholder {
          width: 200px;
          height: 250px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 3px solid #dee2e6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cover-illustration {
          text-align: center;
        }

        .cover-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 12px;
        }

        .cover-illustration p {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
        }

        .content-warnings {
          margin-top: 20px;
          padding: 12px;
          background: #fff3cd;
          border-radius: 6px;
          border-left: 4px solid #ffc107;
        }

        .content-warnings h4 {
          margin: 0 0 8px 0;
          font-size: 0.9rem;
          color: #856404;
        }

        .warning {
          margin: 0;
          font-size: 0.8rem;
          color: #856404;
        }

        .panel-page {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .manga-panel {
          width: 100%;
          height: 90%;
          border: 3px solid #333;
          border-radius: 8px;
          background: white;
          overflow: hidden;
          position: relative;
        }

        .panel-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .panel-image-placeholder {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
        }

        .panel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-art {
          text-align: center;
        }

        .art-frame {
          width: 120px;
          height: 120px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .art-icon {
          font-size: 3rem;
          opacity: 0.6;
        }

        .panel-caption {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.95);
          font-size: 0.9rem;
          line-height: 1.4;
          color: #333;
          border-top: 1px solid #dee2e6;
        }

        .reader-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e9ecef;
        }

        .nav-btn {
          background: #667eea;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-btn:hover:not(:disabled) {
          background: #5a67d8;
        }

        .nav-btn:disabled {
          background: #e9ecef;
          color: #6c757d;
          cursor: not-allowed;
        }

        .page-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #666;
        }

        .page-dots {
          display: flex;
          gap: 6px;
        }

        .page-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: #dee2e6;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .page-dot.active {
          background: #667eea;
        }

        .page-dot:hover {
          background: #adb5bd;
        }

        @media (max-width: 768px) {
          .book-spread {
            flex-direction: column;
          }
          
          .left-page {
            border-right: none;
            border-bottom: 1px solid #e9ecef;
          }
          
          .book-page {
            padding: 20px;
          }
          
          .reader-header {
            padding: 16px;
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .memory-reader,
          .reader-content,
          .energy-fill {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
