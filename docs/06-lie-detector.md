# Lie Detector

## Statements

1. The app preloads images using the JavaScript `Image()` constructor before adding them to the DOM.
2. The app uses a `useRef` to track the currently-loading mood and ignores duplicate requests for the same mood.
3. A race condition guard checks `loadingRef.current` when a fetch resolves, discarding results if a different mood was selected in the meantime.
4. The app does not use `useEffect` anywhere — all state changes are triggered imperatively through `useCallback`.
5. The app stores previously loaded images in a cache so switching back to a previously selected mood shows them instantly without re-fetching.

## The Lie

Statement **5** is false. The app does not cache fetched images. Each time a mood is selected (or re-selected), a fresh set of image preloads is triggered. When same mood is re-selected, old images stay visible during loading, but returning to a previously visited mood always initiates a new network request.

**Proof:** From `useMoodImages.js:26-62`, when `fetchImages(mood)` is called, I always build fresh URLs and run `Promise.all(urls.map(fetchWithPreload))`. There is no cache map, no `sessionStorage`, no `localStorage`, and no memoization anywhere in the hook. If I select *Calm*, then *Loud*, then *Calm* again, the third call re-fetches all five images from scratch — lines 38-40 generate new promises every invocation. The only concession to re-selection is on line 35: `images: prev.activeMood === mood ? prev.images : []`, which keeps the old grid visible *during* the new load, but the moment the new batch resolves, I overwrite the state entirely. A real cache would skip the network entirely on the second visit. This code never does.
