import { useState, useCallback, useRef } from "react";

function buildImageUrl(mood, index) {
  return `https://picsum.photos/seed/vibe-${mood}-${index + 1}/600/400`;
}

function fetchWithPreload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image`));
    img.src = url;
  });
}

export function useMoodImages() {
  const [state, setState] = useState({
    images: [],
    loading: false,
    error: null,
    activeMood: null,
  });

  const loadingRef = useRef(null);

  const fetchImages = useCallback((mood) => {
    if (loadingRef.current === mood) return;
    loadingRef.current = mood;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      activeMood: mood,
      images: prev.activeMood === mood ? prev.images : [],
    }));

    const urls = Array.from({ length: 5 }, (_, i) =>
      buildImageUrl(mood, i)
    );

    Promise.all(urls.map(fetchWithPreload))
      .then((results) => {
        if (loadingRef.current !== mood) return;
        loadingRef.current = null;
        setState({
          images: results,
          loading: false,
          error: null,
          activeMood: mood,
        });
      })
      .catch((err) => {
        if (loadingRef.current !== mood) return;
        loadingRef.current = null;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Something went wrong",
        }));
      });
  }, []);

  return { ...state, fetchImages };
}
