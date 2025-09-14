import { atom, useAtom } from "jotai";
import { useEffect } from "react";

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

// Global state for current page
export const pageAtom = atom(0);

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
