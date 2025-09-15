import { atom, useAtom } from "jotai";
import { useEffect } from "react";

// Component to display half of a page image (left or right side)
const HalfPageView = ({ src, isLeft }) => {
  // Determine the correct image path
  let imagePath = src;
  
  // Handle different texture sources
  if (typeof src === 'string' && src.startsWith('data:')) {
    // Direct data URL from generated canvas
    imagePath = src;
  } else if (src.startsWith('/book_pages/')) {
    // Use PNG images from book_pages directory (cover, back cover, etc.)
    imagePath = src;
  } else if (src === 'book-cover') {
    imagePath = '/textures/book-cover.jpg';
  } else if (src === 'book-back') {
    imagePath = '/textures/book-back.jpg';
  } else if (src.startsWith('book-page-')) {
    // Use texture images for content pages
    imagePath = `/textures/${src}.jpg`;
  } else {
    // Default fallback
    imagePath = `/textures/${src}.jpg`;
  }
  
  return (
    <div 
      className="relative w-full rounded-lg border shadow-lg bg-gray-100" 
      style={{ 
        aspectRatio: '0.75',
        height: '100vh',                // Full viewport height
        maxWidth: '75vh',               // Maintain aspect ratio (100vh * 0.75)
        width: '100%'                   // Use full available width
      }}
    >
      <img
        src={imagePath}
        alt={`${isLeft ? 'Left' : 'Right'} half of page`}
        className="absolute inset-0 w-[200%] h-full object-contain"
        style={{
          transform: isLeft ? 'translateX(0)' : 'translateX(-50%)',
          transformOrigin: 'top left'
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`);
          // Hide the broken image but keep the fallback visible
          e.target.style.opacity = '0';
        }}
      />
      {/* Only show fallback when image fails to load */}
    </div>
  );
};

// Simple modal component
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full h-full bg-transparent flex flex-col items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 rounded-full bg-white/20 hover:bg-white/30 text-white px-3 py-1 font-medium transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex-shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
};

// Sample pictures - you can replace these with your own images
// Configured for exactly 9 pages: Cover + 5 content pages + Back cover
const pictures = [
  "book-page-1",
  "book-page-2", 
  "book-page-3",
  "book-page-4",
  "book-page-5",
  "book-page-6",
  "book-page-7",
  "book-page-8",
  "book-page-9",
  "book-page-10",
  "book-page-11",
  "book-page-12",
  "book-page-13"
];

// Determine the texture image URLs used by the 3D Book for a given page index
// This mirrors the logic in components/book/Book.jsx
function textureUrlsForPage(index, summaryTextureUrl) {
  const total = pages.length; // includes cover and back cover entries
  
  if (index === 0) {
    // Cover page: front shows cover, back shows first content page
    return { 
      front: "/book_pages/cover_page.png", 
      back: "/book_pages/page_1.png" 
    };
  }
  if (index === total - 1) {
    // Last page: front shows continued, back shows back cover
    return { 
      front: "/book_pages/continued.png", 
      back: "/book_pages/back_cover.png" 
    };
  }

  // First content spread (right page next to page_1): use dynamic summary if available
  if (index === 1 && summaryTextureUrl) {
    return {
      front: summaryTextureUrl,
      back: summaryTextureUrl,
    };
  }
  
  // Content pages: map to the texture images
  // Each page spread (index) corresponds to 2 texture images
  const leftPageNum = (index - 1) * 2 + 2; // Start from page 2 for first content spread
  const rightPageNum = leftPageNum + 1;
  
  return { 
    front: `book-page-${leftPageNum}`, 
    back: `book-page-${rightPageNum}` 
  };
}

// Global state for current page
export const pageAtom = atom(0);
// Data URL for the dynamic summary texture (right page of first spread)
export const summaryTextureAtom = atom(null);
// Modal state for showing page content popup
// Holds { page: number, side: 'front'|'back', half: 'left'|'right' } or null
export const modalPageAtom = atom(null);

// Generate pages structure: cover -> content pages -> back cover
export const pages = [
  {
    front: "book-cover",
    back: pictures[0],
  },
];

// Create double-page spreads from pictures
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  });
}

// Add back cover
pages.push({
  front: pictures[pictures.length - 1],
  back: "book-back",
});

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);
  const [modalPage, setModalPage] = useAtom(modalPageAtom);
  const [summaryTextureUrl] = useAtom(summaryTextureAtom);

  // Page flip sound effect - disabled for now to avoid 416 errors
  // useEffect(() => {
  //   try {
  //     const audio = new Audio("/audios/page-flip-01a.mp3");
  //     audio.play().catch(() => {
  //       // Ignore audio errors - some browsers block autoplay
  //     });
  //   } catch (error) {
  //     // Ignore audio errors
  //   }
  // }, [page]);

  return (
    <>
      {/* Background with wooden floor texture */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/background/lightwooden_floor.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Main UI overlay */}
      <main className="pointer-events-none select-none z-10 fixed inset-0">
        {/* Modal for page content */}
        <Modal open={modalPage !== null} onClose={() => setModalPage(null)}>
            {modalPage !== null && (
              <div className="text-black">
                {/* Zoomed textures of the exact page content, cropped to the half clicked */}
              {(() => {
                const urls = textureUrlsForPage(modalPage.page, summaryTextureUrl);
                const imgSrc = modalPage.side === 'front' ? urls.front : urls.back;
                const isLeft = modalPage.half === 'left';
                return (
                  <div className="flex items-center justify-center">
                    <HalfPageView src={imgSrc} isLeft={isLeft} />
                  </div>
                );
              })()}
            </div>
          )}
        </Modal>

        {/* Glass arrows for previous/next navigation */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6">
          {/* Previous/Back Arrow */}
          <div
            className={`pointer-events-auto transition-all duration-300 hover:scale-110 ${
              page <= 0
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-90 hover:opacity-100 cursor-pointer'
            }`}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => page > 0 && setPage(Math.max(0, page - 1))}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid black',
                clipPath: 'polygon(70% 20%, 30% 50%, 70% 80%)',
                width: '80px',
                height: '80px'
              }}
            />
          </div>

          {/* Next/Forward Arrow */}
          <div
            className={`pointer-events-auto transition-all duration-300 hover:scale-110 ${
              page >= pages.length
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-90 hover:opacity-100 cursor-pointer'
            }`}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => page < pages.length && setPage(Math.min(pages.length, page + 1))}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid black',
                clipPath: 'polygon(30% 20%, 70% 50%, 30% 80%)',
                width: '80px',
                height: '80px'
              }}
            />
          </div>
        </div>
      </main>

    </>
  );
};
