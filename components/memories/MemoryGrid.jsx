// MemoryGrid Component - Dynamic comic panel layout for memories
import React from 'react';
import { Heart } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

// Utils
import { 
  getMemoriesByMonth, 
  getSortedMonths, 
  formatMonthHeader, 
  getMoodEmoji,
  getPanelVariation,
  formatMemoryDate
} from '../../lib/memories/utils';

/**
 * Dynamic comic panel grid for displaying memories
 * Groups memories by month with varying panel sizes for manga aesthetic
 */
export default function MemoryGrid({ memories, onMemoryClick }) {
  const groupedMemories = getMemoriesByMonth(memories);
  const sortedMonths = getSortedMonths(groupedMemories);

  return (
    <div className="manga-grid-container">
      {sortedMonths.map(monthKey => (
        <div key={monthKey} className="manga-month-section">
          {/* Month header as manga title */}
          <div className="manga-month-header">
            <div className="manga-month-title">
              {formatMonthHeader(monthKey)}
            </div>
            <Badge variant="outline" className="manga-badge">
              {groupedMemories[monthKey].length} memories
            </Badge>
          </div>

          {/* Dynamic comic panel grid */}
          <div className="manga-panels-grid">
            {groupedMemories[monthKey].map((memory, index) => {
              // Get panel size variation for dynamic layout
              const panelClass = getPanelVariation(index);
              
              return (
                <Card 
                  key={memory.id} 
                  className={`manga-memory-card ${panelClass}`}
                  onClick={() => onMemoryClick(memory.id)}
                >
                  <CardHeader className="manga-card-header">
                    <div className="flex justify-between items-start">
                      {/* Date stamp */}
                      <div className="manga-date-stamp">
                        {formatMemoryDate(memory.date)}
                      </div>
                      
                      {/* Mood indicator */}
                      <div className="manga-mood-indicator">
                        {getMoodEmoji(memory.mood?.primary)}
                      </div>
                    </div>
                    
                    {/* Favorite burst indicator */}
                    {memory.favorite && (
                      <div className="manga-favorite-burst">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="manga-card-content">
                    {/* Memory title */}
                    <CardTitle className="manga-memory-title">
                      {memory.title}
                    </CardTitle>
                    
                    {/* Logline in speech bubble */}
                    <div className="manga-speech-bubble small">
                      <div className="speech-text">
                        "{memory.logline}"
                      </div>
                    </div>

                    {/* Tags display */}
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="manga-tags">
                        {memory.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="manga-tag">
                            {tag}
                          </Badge>
                        ))}
                        {memory.tags.length > 3 && (
                          <Badge variant="outline" className="manga-tag">
                            +{memory.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Panel count */}
                    <div className="manga-panel-count">
                      {memory.panels?.length || 0} panels
                    </div>
                  </CardContent>

                  {/* Manga-style border and effects */}
                  <div className="manga-panel-border"></div>
                  <div className="manga-screentone-overlay"></div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}