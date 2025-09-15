import { useState } from 'react';
import Image from 'next/image';

export default function FeelingTodayModal({ isOpen, onClose, onRatingSubmit }) {
  const [selectedRating, setSelectedRating] = useState(null);

  const ratings = [
    { value: 1, label: 'Very Sad', image: '/faces/very_sad.png' },
    { value: 2, label: 'Sad', image: '/faces/sad.png' },
    { value: 3, label: 'Normal', image: '/faces/normal.png' },
    { value: 4, label: 'Happy', image: '/faces/happy.png' },
    { value: 5, label: 'Very Happy', image: '/faces/very_happy.png' }
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
    <>
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h2 className="modal-title">
              How are you feeling today?
            </h2>
            <p className="modal-subtitle">
              Please rate your current emotional state
            </p>
          </div>

          <div className="ratings-container">
            {ratings.map((rating) => (
              <button
                key={rating.value}
                onClick={() => setSelectedRating(rating.value)}
                className={`rating-button ${selectedRating === rating.value ? 'selected' : ''}`}
              >
                <div className="rating-content">
                  <div className="image-container">
                    <Image
                      src={rating.image}
                      alt={rating.label}
                      fill
                      sizes="200px"
                      quality={100}
                      className="face-image"
                    />
                  </div>
                  <span className="rating-label">
                    {rating.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="button-container">
            <button
              onClick={handleClose}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedRating}
              className="submit-button"
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(1px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }

        .modal-container {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          /* Increase overall padding slightly (top/bottom, left/right) */
          padding: 36px 40px;
          /* Make the glass modal wider */
          max-width: 1200px;
          width: 95%;
          margin: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
        }

        .modal-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
        }

        .ratings-container {
          display: flex;
          flex-direction: row;
          /* Add a bit more spacing and slight side padding */
          gap: 48px;
          padding: 0 8px;
          margin-bottom: 32px;
          /* Center the row so images don't skew to the sides */
          justify-content: center;
          flex-wrap: wrap;
          width: 100%;
        }

        .rating-button {
          background: transparent;
          border: none;
          padding: 20px 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          /* Fixed-sized items to maintain centering and spacing */
          flex: 0 0 auto;
          min-width: 168px;
          max-width: 180px;
        }

        .rating-button:hover {
          transform: translateY(-4px);
        }

        .rating-button.selected {
          transform: scale(1.1);
        }

        .rating-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .image-container {
          display: flex;
          align-items: center;
          justify-content: center;
          /* Smaller circle to emphasize zoomed image */
          width: 106px;
          height: 106px;
          position: relative; /* needed for next/image fill */
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          /* 20% thicker ring */
          border: 4px solid rgba(255, 255, 255, 0.55);
          border-radius: 50%;
          transition: all 0.3s ease;
          overflow: hidden;
          box-sizing: border-box;
        }

        .face-image {
          /* Keep natural proportions; no squeeze */
          object-fit: cover;
          object-position: center;
          transform: none;
          width: 100%;
          height: 100%;
          image-rendering: auto;
          border-radius: 0;
          border: none;
          transition: all 0.3s ease;
        }

        .rating-button:hover .face-image {
          transform: scale(1.1);
        }

        .rating-label {
          font-size: 16px;
          font-weight: 500;
          color: white;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
          text-align: center;
          line-height: 1.2;
        }

        .button-container {
          display: flex;
          gap: 16px;
        }

        .cancel-button,
        .submit-button {
          flex: 1;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-button {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }

        .cancel-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .submit-button {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
