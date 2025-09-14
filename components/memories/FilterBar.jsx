// FilterBar Component - Search and filter controls for memories
import React from 'react';
import { Search, Filter, BookOpen, Heart } from 'lucide-react';

// UI Components
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Search and filter bar for memories with manga styling
 * Handles search queries, mood filtering, date filtering, and favorites
 */
export default function FilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  memoriesCount
}) {
  
  // Clear all filters and search
  const handleClearAll = () => {
    const emptyFilters = { month: null, favorite: false, mood: null, tags: [] };
    onFiltersChange(emptyFilters);
    onSearchChange('');
  };

  return (
    <div className="manga-search-panel">
      <Card className="manga-search-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
              <Input
                placeholder="Search your memories..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 manga-input"
              />
            </div>
            
            {/* Filter toggle button */}
            <Button 
              variant="outline" 
              onClick={onToggleFilters}
              className="manga-button"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            {/* Memory count display */}
            <div className="flex items-center gap-2 text-sm" style={{color: 'black'}}>
              <BookOpen className="w-4 h-4" />
              {memoriesCount} memories
            </div>
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-black manga-screentone">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Mood filter */}
                <div>
                  <label className="block text-sm font-bold mb-2">Mood</label>
                  <Select 
                    value={filters.mood || ''} 
                    onValueChange={(value) => onFiltersChange({...filters, mood: value || null})}
                  >
                    <SelectTrigger className="manga-select">
                      <SelectValue placeholder="All moods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All moods</SelectItem>
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

                {/* Month filter */}
                <div>
                  <label className="block text-sm font-bold mb-2">Month</label>
                  <Input
                    type="month"
                    value={filters.month || ''}
                    onChange={(e) => onFiltersChange({...filters, month: e.target.value || null})}
                    className="manga-input"
                  />
                </div>

                {/* Favorites filter */}
                <div className="flex items-end">
                  <Button
                    variant={filters.favorite ? "default" : "outline"}
                    onClick={() => onFiltersChange({...filters, favorite: !filters.favorite})}
                    className="manga-button"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${filters.favorite ? 'fill-current' : ''}`} />
                    Favorites
                  </Button>
                </div>

                {/* Clear filters button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                    className="manga-button"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}