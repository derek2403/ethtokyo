import { atom, useAtom } from "jotai";
import { useEffect } from "react";

// Simple modal component
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 max-w-3xl w-[90vw] max-h-[80vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-black/10 hover:bg-black/20 text-black px-3 py-1"
        >
          Close
        </button>
        {children}
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
function textureUrlsForPage(index) {
  const total = pages.length; // includes cover and back cover entries
  const cover = "/book_pages/cover_page.png";
  const firstLeft = "/book_pages/page_1.png";
  const backCover = "/book_pages/back_cover.png";
  const continued = "/book_pages/continued.png";

  if (index === 0) {
    return { front: cover, back: firstLeft };
  }
  if (index === total - 1) {
    return { front: continued, back: backCover };
  }
  return { front: continued, back: continued };
}

// Global state for current page
export const pageAtom = atom(0);
// Modal state for showing page content popup
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
      <main className="pointer-events-none select-none z-10 fixed inset-0 flex flex-col justify-end">
        {/* Modal for page content */}
        <Modal open={modalPage !== null} onClose={() => setModalPage(null)}>
          {modalPage !== null && (
            <div className="text-black">
              <h2 className="text-xl font-semibold mb-3">Page {modalPage}</h2>
              {/* Zoomed textures of the exact page content */}
              {(() => {
                const urls = textureUrlsForPage(modalPage);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Front</div>
                      <img
                        src={urls.front}
                        alt={`Page ${modalPage} front`}
                        className="w-full h-auto object-contain rounded border"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Back</div>
                      <img
                        src={urls.back}
                        alt={`Page ${modalPage} back`}
                        className="w-full h-auto object-contain rounded border"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Modal>
        
        {/* Page navigation buttons */}
        <div className="w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                  index === page
                    ? "bg-white/90 text-black"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? "Cover" : `Page ${index}`}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back Cover
            </button>
          </div>
        </div>
      </main>

    </>
  );
};
