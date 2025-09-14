// Memory Card Component
// Individual memory card for grid display with cover, title, mood indicators

import MoodRing from './MoodRing';

/**
 * Memory card component displayed in the grid
 * Shows memory cover, title, logline, mood, tags, and favorite status
 */
export default function MemoryCard({ memory, onClick }) {
  if (!memory) return null;

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get mood color for accent
  const getMoodColor = (mood) => {
    const moodColors = {
      happy: '#FFD700',
      calm: '#87CEEB', 
      anxious: '#FFA500',
      sad: '#9370DB',
      angry: '#DC143C',
      mixed: '#DDA0DD',
      neutral: '#C0C0C0'
    };
    return moodColors[mood] || moodColors.neutral;
  };

  // Handle card click
  const handleClick = () => {
    if (onClick) {
      onClick(memory);
    }
  };

  // Handle favorite click (prevent card click propagation)
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    // TODO: Implement favorite toggle
  };

  return (
    <div 
      className="memory-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Card header with date and favorite */}
      <div className="card-header">
        <span className="memory-date">
          {formatDate(memory.date)}
        </span>
        <button 
          className={`favorite-btn ${memory.favorite ? 'is-favorite' : ''}`}
          onClick={handleFavoriteClick}
          title={memory.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {memory.favorite ? '★' : '☆'}
        </button>
      </div>

      {/* Cover image placeholder */}
      <div className="card-cover">
        {memory.coverUrl ? (
          <img 
            src={memory.coverUrl} 
            alt={`Cover for ${memory.title}`}
            className="cover-image"
          />
        ) : (
          <div className="cover-placeholder">
            <div className="manga-panel">
              <div className="panel-border"></div>
              <div className="panel-content">
                <span className="panel-icon">📔</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Mood indicator */}
        <div className="mood-indicator">
          <MoodRing 
            mood={memory.mood}
            size="small"
          />
        </div>
      </div>

      {/* Card content */}
      <div className="card-content">
        <h3 className="memory-title">
          {memory.title}
        </h3>
        
        <p className="memory-logline">
          {memory.logline}
        </p>

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="memory-tags">
            {memory.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {memory.tags.length > 3 && (
              <span className="tag tag-more">
                +{memory.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Status indicator */}
        <div className="card-footer">
          <span className={`status-badge ${memory.status}`}>
            {memory.status}
          </span>
          
          {memory.panels && (
            <span className="panel-count">
              {memory.panels.length} panels
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .memory-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .memory-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .memory-card:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(102, 126, 234, 0.05);
        }

        .memory-date {
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
        }

        .favorite-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #ccc;
          transition: color 0.2s;
        }

        .favorite-btn:hover,
        .favorite-btn.is-favorite {
          color: #FFD700;
        }

        .card-cover {
          height: 200px;
          position: relative;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .manga-panel {
          width: 80px;
          height: 80px;
          position: relative;
        }

        .panel-border {
          position: absolute;
          inset: 0;
          border: 3px solid #333;
          border-radius: 4px;
          background: white;
        }

        .panel-content {
          position: absolute;
          inset: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .panel-icon {
          font-size: 2rem;
          opacity: 0.6;
        }

        .mood-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .card-content {
          padding: 16px;
        }

        .memory-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .memory-logline {
          font-size: 0.9rem;
          color: #666;
          margin: 0 0 12px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .memory-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .tag {
          background: #f0f2ff;
          color: #667eea;
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .tag-more {
          background: #f5f5f5;
          color: #999;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .status-badge {
          padding: 3px 8px;
          border-radius: 8px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.draft {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.generated {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status-badge.edited {
          background: #d4edda;
          color: #155724;
        }

        .panel-count {
          color: #999;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .card-cover {
            height: 160px;
          }
          
          .memory-title {
            font-size: 1rem;
          }
          
          .memory-logline {
            font-size: 0.85rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .memory-card {
            transition: none;
          }
          
          .memory-card:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
