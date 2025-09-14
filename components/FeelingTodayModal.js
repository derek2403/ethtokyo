import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function FeelingTodayModal({ isOpen, onClose, onRatingSubmit }) {
  const [selectedRating, setSelectedRating] = useState(null);

  const ratings = [
    { value: 1, label: 'Very Sad', emoji: '😢', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
    { value: 2, label: 'Sad', emoji: '😔', color: 'bg-orange-100 hover:bg-orange-200 border-orange-300' },
    { value: 3, label: 'Normal', emoji: '😐', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
    { value: 4, label: 'Happy', emoji: '😊', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
    { value: 5, label: 'Very Happy', emoji: '😄', color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' }
  ];

  const handleSubmit = () => {
    if (selectedRating) {
      onRatingSubmit(selectedRating);
      setSelectedRating(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedRating(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/10 dark:bg-black/10 flex items-center justify-center z-50">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            How are you feeling today?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please rate your current emotional state
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {ratings.map((rating) => (
            <button
              key={rating.value}
              onClick={() => setSelectedRating(rating.value)}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedRating === rating.value
                  ? `${rating.color} border-2 ring-2 ring-offset-2 ring-blue-500`
                  : `${rating.color} border`
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-3xl">{rating.emoji}</span>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {rating.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating}
            className="flex-1"
          >
            Submit Rating
          </Button>
        </div>
      </div>
    </div>
  );
}