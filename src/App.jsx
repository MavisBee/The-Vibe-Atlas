import { useCallback } from "react";
import { useMoodImages } from "./hooks/useMoodImages";
import MoodBar from "./components/MoodBar";
import SkeletonGrid from "./components/SkeletonGrid";
import ErrorState from "./components/ErrorState";
import ImageCard from "./components/ImageCard";

function App() {
  const { images, loading, error, activeMood, fetchImages } = useMoodImages();

  const handleSelect = useCallback(
    (mood) => {
      fetchImages(mood);
    },
    [fetchImages]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-3">
            The Vibe Atlas
          </h1>
          <p className="text-white/40 text-sm md:text-base">
            Pick a mood. Feel the vibe.
          </p>
        </header>

        <div className="mb-10">
          <MoodBar
            activeMood={activeMood}
            onSelect={handleSelect}
            disabled={loading}
          />
        </div>

        <div className="mt-8">
          {!activeMood && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-sm">Choose a mood to explore</p>
            </div>
          )}

          {loading && <SkeletonGrid />}

          {error && !loading && (
            <ErrorState message={error} onRetry={() => fetchImages(activeMood)} />
          )}

          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {images.map((url, i) => (
                <ImageCard
                  key={url}
                  url={url}
                  alt={`${activeMood} ${i + 1}`}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
