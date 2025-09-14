// Mood Ring Component
// Visual representation of mood metrics with color and style

/**
 * Mood ring component that visualizes mood data
 * Shows primary emotion with color and energy/valence indicators
 */
export default function MoodRing({ mood, size = 'medium', showLabel = false }) {
  if (!mood) return null;

  // Get mood configuration
  const getMoodConfig = (moodData) => {
    const configs = {
      happy: { 
        color: '#FFD700', 
        bgColor: '#FFF9C4',
        icon: '😊',
        label: 'Happy' 
      },
      calm: { 
        color: '#87CEEB', 
        bgColor: '#E3F2FD',
        icon: '😌',
        label: 'Calm' 
      },
      anxious: { 
        color: '#FFA500', 
        bgColor: '#FFF3E0',
        icon: '😰',
        label: 'Anxious' 
      },
      sad: { 
        color: '#9370DB', 
        bgColor: '#F3E5F5',
        icon: '😢',
        label: 'Sad' 
      },
      angry: { 
        color: '#DC143C', 
        bgColor: '#FFEBEE',
        icon: '😠',
        label: 'Angry' 
      },
      mixed: { 
        color: '#DDA0DD', 
        bgColor: '#F8F5FF',
        icon: '😕',
        label: 'Mixed' 
      },
      neutral: { 
        color: '#C0C0C0', 
        bgColor: '#F5F5F5',
        icon: '😐',
        label: 'Neutral' 
      }
    };
    
    return configs[moodData.primary] || configs.neutral;
  };

  // Get size configuration
  const getSizeConfig = (sizeType) => {
    const sizes = {
      small: { 
        diameter: 32, 
        iconSize: '0.8rem',
        fontSize: '0.7rem'
      },
      medium: { 
        diameter: 48, 
        iconSize: '1.2rem',
        fontSize: '0.8rem'
      },
      large: { 
        diameter: 64, 
        iconSize: '1.8rem',
        fontSize: '1rem'
      }
    };
    
    return sizes[sizeType] || sizes.medium;
  };

  const moodConfig = getMoodConfig(mood);
  const sizeConfig = getSizeConfig(size);

  // Calculate ring segments based on valence and energy
  const getEnergyGradient = (energy, color) => {
    const intensity = Math.max(0.3, energy); // Minimum visibility
    return `radial-gradient(circle, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, ${color}44 70%, transparent 100%)`;
  };

  // Get valence indicator (border style)
  const getValenceBorder = (valence, color) => {
    const borderWidth = Math.abs(valence) * 3 + 2; // 2-5px based on intensity
    const borderStyle = valence > 0.2 ? 'solid' : valence < -0.2 ? 'dashed' : 'dotted';
    return `${borderWidth}px ${borderStyle} ${color}`;
  };

  return (
    <div className="mood-ring-container">
      <div 
        className="mood-ring"
        title={`Mood: ${moodConfig.label} (Valence: ${mood.valence.toFixed(1)}, Energy: ${mood.energy.toFixed(1)})`}
      >
        <div className="mood-icon">
          {moodConfig.icon}
        </div>
        
        {/* Energy ring indicator */}
        <div className="energy-indicator"></div>
        
        {/* Top emotions indicator */}
        {mood.topEmotions && mood.topEmotions.length > 1 && (
          <div className="multi-emotion-indicator">
            <span>•</span>
          </div>
        )}
      </div>
      
      {showLabel && (
        <div className="mood-label">
          {moodConfig.label}
        </div>
      )}

      <style jsx>{`
        .mood-ring-container {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .mood-ring {
          width: ${sizeConfig.diameter}px;
          height: ${sizeConfig.diameter}px;
          border-radius: 50%;
          background: ${moodConfig.bgColor};
          border: ${getValenceBorder(mood.valence, moodConfig.color)};
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: help;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .mood-ring:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px ${moodConfig.color}44;
        }

        .mood-icon {
          font-size: ${sizeConfig.iconSize};
          z-index: 2;
          position: relative;
        }

        .energy-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          background: ${getEnergyGradient(mood.energy, moodConfig.color)};
          opacity: 0.6;
          z-index: 1;
        }

        .multi-emotion-indicator {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: ${moodConfig.color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: white;
          z-index: 3;
        }

        .mood-label {
          font-size: ${sizeConfig.fontSize};
          font-weight: 500;
          color: #666;
          text-align: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .mood-ring {
            transition: none;
          }
          
          .mood-ring:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
