import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function FeelingTodayModal({ isOpen, onClose, onSubmit }) {
  const [rating, setRating] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feelings = [
    { value: 1, label: 'Very Sad', emoji: '😢', color: 'bg-red-500' },
    { value: 2, label: 'Sad', emoji: '😔', color: 'bg-orange-500' },
    { value: 3, label: 'Normal', emoji: '😐', color: 'bg-yellow-500' },
    { value: 4, label: 'Happy', emoji: '😊', color: 'bg-green-500' },
    { value: 5, label: 'Very Happy', emoji: '😄', color: 'bg-blue-500' }
  ];

  const handleSubmit = async () => {
    if (!rating) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(rating);
      onClose();
    } catch (error) {
      console.error('Error submitting feeling:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💭</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            How are you feeling today?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Please rate your current emotional state
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {feelings.map((feeling) => (
            <button
              key={feeling.value}
              onClick={() => setRating(feeling.value)}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                rating === feeling.value
                  ? `${feeling.color} text-white border-transparent`
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">{feeling.emoji}</span>
                <span className="font-medium">{feeling.label}</span>
                <span className="text-sm opacity-75">({feeling.value})</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rating || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
