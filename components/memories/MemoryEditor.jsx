// Memory Editor Component
// Inline editing interface for memory content

import React, { useState } from 'react';

/**
 * Memory editor for inline editing of title, logline, panels, and metadata
 * Simple modal-style editor with form controls
 */
export default function MemoryEditor({ 
  memory, 
  isOpen, 
  onSave, 
  onCancel,
  isLoading = false 
}) {
  const [editedMemory, setEditedMemory] = useState(memory);
  const [hasChanges, setHasChanges] = useState(false);

  // Update edited memory when memory prop changes
  React.useEffect(() => {
    if (memory) {
      setEditedMemory({ ...memory });
      setHasChanges(false);
    }
  }, [memory]);

  if (!isOpen || !memory) return null;

  // Handle input changes
  const handleChange = (field, value) => {
    setEditedMemory(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle nested field changes (e.g., mood.primary)
  const handleNestedChange = (parentField, field, value) => {
    setEditedMemory(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  // Handle panel changes
  const handlePanelChange = (panelIndex, field, value) => {
    setEditedMemory(prev => ({
      ...prev,
      panels: prev.panels.map((panel, index) => 
        index === panelIndex 
          ? { ...panel, [field]: value }
          : panel
      )
    }));
    setHasChanges(true);
  };

  // Add new panel
  const addPanel = () => {
    const newPanel = {
      id: `panel-${Date.now()}`,
      order: editedMemory.panels.length,
      caption: '',
      altText: '',
      style: 'bw'
    };
    
    setEditedMemory(prev => ({
      ...prev,
      panels: [...prev.panels, newPanel]
    }));
    setHasChanges(true);
  };

  // Remove panel
  const removePanel = (panelIndex) => {
    setEditedMemory(prev => ({
      ...prev,
      panels: prev.panels.filter((_, index) => index !== panelIndex)
        .map((panel, index) => ({ ...panel, order: index }))
    }));
    setHasChanges(true);
  };

  // Move panel up/down
  const movePanel = (panelIndex, direction) => {
    const panels = [...editedMemory.panels];
    const targetIndex = direction === 'up' ? panelIndex - 1 : panelIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < panels.length) {
      [panels[panelIndex], panels[targetIndex]] = [panels[targetIndex], panels[panelIndex]];
      
      // Update order indices
      panels.forEach((panel, index) => {
        panel.order = index;
      });
      
      setEditedMemory(prev => ({ ...prev, panels }));
      setHasChanges(true);
    }
  };

  // Handle tags change
  const handleTagsChange = (tagsString) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    handleChange('tags', tags);
  };

  // Handle save
  const handleSave = () => {
    const memoryToSave = {
      ...editedMemory,
      status: 'edited',
      updatedAt: new Date().toISOString()
    };
    
    onSave(memoryToSave);
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasChanges && !window.confirm('Discard changes?')) {
      return;
    }
    
    setEditedMemory({ ...memory });
    setHasChanges(false);
    onCancel();
  };

  return (
    <div className="memory-editor-overlay">
      <div className="editor-container">
        
        {/* Header */}
        <div className="editor-header">
          <h2>Edit Memory</h2>
          <div className="header-actions">
            <span className="edit-date">{new Date(editedMemory.date).toLocaleDateString()}</span>
            <button 
              className="cancel-btn"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="save-btn"
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Editor content */}
        <div className="editor-content">
          
          {/* Basic info section */}
          <section className="editor-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editedMemory.title || ''}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="Memory title..."
                className="text-input"
              />
            </div>
            
            <div className="form-group">
              <label>Logline</label>
              <textarea
                value={editedMemory.logline || ''}
                onChange={e => handleChange('logline', e.target.value)}
                placeholder="One-line summary..."
                className="textarea-input"
                rows="2"
              />
            </div>
            
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={editedMemory.tags ? editedMemory.tags.join(', ') : ''}
                onChange={e => handleTagsChange(e.target.value)}
                placeholder="exercise, meditation, friends..."
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editedMemory.favorite || false}
                  onChange={e => handleChange('favorite', e.target.checked)}
                />
                Mark as favorite
              </label>
            </div>
          </section>

          {/* Mood section */}
          <section className="editor-section">
            <h3>Mood & Feelings</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Primary Mood</label>
                <select
                  value={editedMemory.mood?.primary || 'neutral'}
                  onChange={e => handleNestedChange('mood', 'primary', e.target.value)}
                  className="select-input"
                >
                  <option value="happy">😊 Happy</option>
                  <option value="calm">😌 Calm</option>
                  <option value="anxious">😰 Anxious</option>
                  <option value="sad">😢 Sad</option>
                  <option value="angry">😠 Angry</option>
                  <option value="mixed">😕 Mixed</option>
                  <option value="neutral">😐 Neutral</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Energy Level (0-1)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editedMemory.mood?.energy || 0.5}
                  onChange={e => handleNestedChange('mood', 'energy', parseFloat(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{(editedMemory.mood?.energy || 0.5).toFixed(1)}</span>
              </div>
              
              <div className="form-group">
                <label>Valence (-1 to 1)</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={editedMemory.mood?.valence || 0}
                  onChange={e => handleNestedChange('mood', 'valence', parseFloat(e.target.value))}
                  className="range-input"
                />
                <span className="range-value">{(editedMemory.mood?.valence || 0).toFixed(1)}</span>
              </div>
            </div>
          </section>

          {/* Panels section */}
          <section className="editor-section">
            <div className="section-header">
              <h3>Manga Panels</h3>
              <button className="add-panel-btn" onClick={addPanel}>
                + Add Panel
              </button>
            </div>
            
            <div className="panels-list">
              {editedMemory.panels?.map((panel, index) => (
                <div key={panel.id} className="panel-editor">
                  <div className="panel-header">
                    <span className="panel-number">Panel {index + 1}</span>
                    <div className="panel-actions">
                      <button
                        onClick={() => movePanel(index, 'up')}
                        disabled={index === 0}
                        className="move-btn"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => movePanel(index, 'down')}
                        disabled={index === editedMemory.panels.length - 1}
                        className="move-btn"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removePanel(index)}
                        className="remove-btn"
                        title="Remove panel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="panel-form">
                    <div className="form-group">
                      <label>Caption</label>
                      <textarea
                        value={panel.caption || ''}
                        onChange={e => handlePanelChange(index, 'caption', e.target.value)}
                        placeholder="Panel caption or dialogue..."
                        className="textarea-input"
                        rows="3"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Alt Text (accessibility)</label>
                      <input
                        type="text"
                        value={panel.altText || ''}
                        onChange={e => handlePanelChange(index, 'altText', e.target.value)}
                        placeholder="Description for screen readers..."
                        className="text-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Style</label>
                      <select
                        value={panel.style || 'bw'}
                        onChange={e => handlePanelChange(index, 'style', e.target.value)}
                        className="select-input small"
                      >
                        <option value="bw">Black & White</option>
                        <option value="halftone">Halftone</option>
                        <option value="colorAccent">Color Accent</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!editedMemory.panels || editedMemory.panels.length === 0) && (
                <div className="empty-panels">
                  <p>No panels yet. Click "Add Panel" to create your first manga panel.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <div className="footer-info">
            {hasChanges && <span className="changes-indicator">Unsaved changes</span>}
          </div>
          
          <div className="footer-actions">
            <button 
              className="cancel-btn"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="save-btn primary"
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .memory-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .editor-container {
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          background: white;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e9ecef;
          background: #f8f9fa;
        }

        .editor-header h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #333;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .edit-date {
          font-size: 0.9rem;
          color: #666;
        }

        .editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .editor-section {
          margin-bottom: 32px;
        }

        .editor-section h3 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          color: #333;
          border-bottom: 2px solid #667eea;
          padding-bottom: 4px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h3 {
          margin: 0;
          border: none;
          padding: 0;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 6px;
          font-size: 0.9rem;
        }

        .text-input,
        .textarea-input,
        .select-input {
          width: 100%;
          padding: 8px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .text-input:focus,
        .textarea-input:focus,
        .select-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .textarea-input {
          resize: vertical;
          min-height: 60px;
        }

        .select-input.small {
          width: auto;
          min-width: 140px;
        }

        .range-input {
          width: 100%;
          margin: 8px 0;
        }

        .range-value {
          font-weight: 600;
          color: #667eea;
          margin-left: 8px;
        }

        .add-panel-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .add-panel-btn:hover {
          background: #5a67d8;
        }

        .panels-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .panel-editor {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .panel-number {
          font-weight: 600;
          color: #333;
        }

        .panel-actions {
          display: flex;
          gap: 6px;
        }

        .move-btn,
        .remove-btn {
          background: none;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background-color 0.2s;
        }

        .move-btn:hover:not(:disabled) {
          background: #e9ecef;
        }

        .move-btn:disabled {
          color: #adb5bd;
          cursor: not-allowed;
        }

        .remove-btn {
          color: #dc3545;
        }

        .remove-btn:hover {
          background: #f8d7da;
        }

        .panel-form {
          padding: 16px;
        }

        .empty-panels {
          text-align: center;
          padding: 40px 20px;
          color: #666;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .empty-panels p {
          margin: 0;
        }

        .editor-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }

        .changes-indicator {
          color: #ffc107;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .footer-actions {
          display: flex;
          gap: 12px;
        }

        .cancel-btn,
        .save-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #e9ecef;
          color: #495057;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #dee2e6;
        }

        .save-btn {
          background: #28a745;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #218838;
        }

        .save-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .save-btn.primary {
          background: #667eea;
        }

        .save-btn.primary:hover:not(:disabled) {
          background: #5a67d8;
        }

        @media (max-width: 768px) {
          .editor-container {
            margin: 10px;
            max-height: 95vh;
          }
          
          .editor-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          
          .header-actions {
            width: 100%;
            justify-content: center;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .editor-footer {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
