# Audit: Security, Robustness, Accessibility, Performance

Findings and fixes for five critical dimensions.

---

## 1. API Key Exposure

### Finding: No keys exposed — but the architecture invites it

The app uses **picsum.photos**, which requires no API key. This is safe by accident. 

The danger is structural: the codebase has **no abstraction layer** for API credentials. `buildImageUrl` in `useMoodImages.js:3-5` is a bare function that concatenates strings:

```js
function buildImageUrl(mood, index) {
  return `https://picsum.photos/seed/vibe-${mood}-${index + 1}/600/400`;
}
```

If a developer swaps in Unsplash tomorrow, the natural instinct would be to inline the API key:

```js
function buildImageUrl(mood, index) {
  return `https://api.unsplash.com/photos/random?query=${mood}&client_id=ABC123`;
}
```

This **hard-codes the API key in source**. The key would be committed to git, exposed to every developer, and visible in the browser devtools network tab.

### Fix: environment variables + service abstraction

**Step 1:** Add a `.env` file (already in `.gitignore` by Vite default):

```env
VITE_IMAGE_API_BASE=https://picsum.photos
VITE_UNSPLASH_KEY=
```

**Step 2:** Create a service module that reads from env:

```js
// src/services/imageService.js
const API = import.meta.env.VITE_IMAGE_API_BASE || "https://picsum.photos";

const BUILDERS = {
  picsum: (mood, i) =>
    `${API}/seed/vibe-${mood}-${i + 1}/600/400`,

  unsplash: (mood, i) => {
    const key = import.meta.env.VITE_UNSPLASH_KEY;
    if (!key) throw new Error("Missing VITE_UNSPLASH_KEY");
    return `https://api.unsplash.com/photos/random?query=${mood}&count=5&client_id=${key}`;
  },
};

export const imageBuilder = BUILDERS.picsum;
```

**Step 3:** Inject it into the hook:

```js
export function useMoodImages({ imageBuilder: builder } = {}) {
  // ...
  const url = builder(mood, i);
}
```

**Step 4:** Add `.env` to `.gitignore` (Vite already does this).

**Severity: Low** (no key currently exposed) → **High** (architecturally risky on next API change).

---

## 2. Race Conditions on Rapid Mood Clicks

### Finding: The basic case is handled; edge cases are not

The `loadingRef` pattern correctly prevents the common race:

```
Click "calm" → loadingRef = "calm", fetch starts
Click "loud" → loadingRef = "loud", fetch starts
"calm" resolves → ref !== "calm" → discarded ✓
"loud" resolves → ref === "loud" → rendered ✓
```

But three edge cases exist:

### Edge case A: Same mood clicked twice in rapid succession

```
Click "calm"       → loadingRef = "calm", fetch A starts
Click "calm" again → loadingRef === "calm" → bail out ✓
```

Handled. The second click is silently ignored.

### Edge case B: Mood A, then mood B, then mood A again — before A's first fetch resolves

```
Click "calm"    → loadingRef = "calm",    fetch C1 starts
Click "loud"    → loadingRef = "loud",    fetch L starts
Click "calm"    → loadingRef = "calm",    fetch C2 starts
C1 resolves     → ref !== "calm" (it's "loud") → discarded ✓
                (wait, actually ref is now "calm" from C2)

Let me re-trace more carefully:
1. Click "calm"     → loadingRef = "calm",   start C1
2. Click "loud"     → loadingRef = "loud",   start L
3. Click "calm"     → loadingRef = "calm",   start C2
4. C1 resolves      → ref ("calm") === "calm" → RENDERS ← BUG!
```

**The bug:** C1 was started first, but C2 was started later. C1 should have been discarded because C2 is the authoritative request. But since both have mood "calm," the ref check passes for both.

**Consequence:** The user sees the result of whichever request finishes first (C1 or C2), not necessarily the most recent one. The images are the same mood, so the visual difference is minimal (same mood, different random seeds). But ordering is not guaranteed.

**Severity: Low.** The stale data is semantically correct (same mood). The user won't notice wrong images — just possibly a slightly different set.

### Edge case C: Component unmount during fetch

If the component containing `useMoodImages` unmounts (navigating away, React StrictMode double-mount in dev), the `.then`/`.catch` callbacks still fire. `setState` on an unmounted component is a no-op in React 18+, but the `loadingRef` mutation is not cleaned up.

```js
// After unmount:
fetch resolves → loadingRef.current = null  ← harmless
setState(...)  ← React warns but doesn't crash (React 18+)
```

**Severity: Very Low** in React 18+. In React 16, this would trigger a memory leak warning.

### Fix: abort controller for true cancellation

Replace the ref-based guard with an `AbortController`-based approach:

```js
export function useMoodImages() {
  const [state, setState] = useState({ ... });
  const abortRef = useRef(null);

  const fetchImages = useCallback((mood) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true, error: null, activeMood: mood, images: [] }));

    const urls = Array.from({ length: 5 }, (_, i) => buildImageUrl(mood, i));

    const preloadWithSignal = (url) =>
      new Promise((resolve, reject) => {
        if (controller.signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error("Failed to load image"));
        controller.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        img.src = url;
      });

    Promise.all(urls.map(preloadWithSignal))
      .then((results) => {
        if (controller.signal.aborted) return;
        setState({ images: results, loading: false, error: null, activeMood: mood });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState(prev => ({ ...prev, loading: false, error: err.message }));
      });
  }, []);

  return { ...state, fetchImages };
}
```

This **cancels** the in-flight request instead of silently discarding it. The Image download is stopped, and the HTTP request is aborted.

---

## 3. API Rate Limiting

### Finding: No rate-limit handling exists

The app has zero protection against rate limiting:

- No retry-after detection
- No exponential backoff
- No request throttling
- No queue or debounce

Picsum.photos has no documented rate limit — but all real APIs do. Unsplash allows 50 requests/hour unauthenticated, 5,000/month with a free key. Pexels allows 200 requests/hour.

If the app fetches a new mood every time a user clicks, a power user cycling through 5 moods = 5 requests. If they do this 10 times = 50 requests. If the API returns a 429 (Too Many Requests), the app shows a generic `"Failed to load image"` error with no indication that the user should wait.

### Fix 1: Detect 429 and show a specific message

The current `fetchWithPreload` uses `Image` onerror, which provides no HTTP status code. Switch to `fetch` for error introspection:

```js
async function fetchWithPreload(url) {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) throw new RateLimitError("Too many requests. Please wait a moment.");
    throw new Error(`Failed to load image (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
```

But this trades preloading for more detailed errors. The current `Image`-based approach actually has better browser-level caching. A hybrid: use `Image` for loading, but probe with `fetch` + `HEAD` for status first.

### Fix 2: Client-side throttling

Add a `lastFetchTime` ref and a minimum interval:

```js
const lastFetchRef = useRef(0);
const MIN_INTERVAL = 2000; // 2 seconds between different moods

const fetchImages = useCallback((mood) => {
  const now = Date.now();
  if (now - lastFetchRef.current < MIN_INTERVAL) return;
  lastFetchRef.current = now;
  // ... proceed
}, []);
```

### Fix 3: Exponential backoff on retry

Track retry count per mood:

```js
const retryCountRef = useRef({});

const fetchImages = useCallback((mood) => {
  const retries = retryCountRef.current[mood] || 0;
  const delay = Math.min(1000 * Math.pow(2, retries), 30000);
  // ... implement delay before fetching
}, []);
```

**Severity: Medium.** The app currently fails silently or with a generic error. Users have no feedback about rate limits and no recovery guidance beyond "Try again."

---

## 4. Accessibility (Image Grid Alt Text)

### Finding: Alt text exists but is nearly useless

```jsx
<ImageCard
  alt={`${activeMood} ${i + 1}`}
  ...
/>
```

A screen reader hears **"calm 1"**, **"loud 3"**, etc. This conveys no information about the image content. It is marginally better than empty alt text (`alt=""`), which tells screen readers to skip the image entirely — which is actually **preferable for decorative images**.

### WCAG violation

WCAG 2.1 **Success Criterion 1.1.1 (Non-text Content)** requires alt text to serve the **equivalent purpose** of the image. "Calm 1" fails this — it tells a blind user nothing they couldn't get from the surrounding context.

### Fix 1: Mark images as decorative (simplest)

If the images are purely aesthetic mood-fillers, set `alt=""` so screen readers skip them entirely:

```jsx
<ImageCard alt="" ... />
```

This is the correct approach for this app — the images are background inspiration, not information.

### Fix 2: Descriptive alt text (if images convey meaning)

Use a mapping of mood-index to descriptive text:

```js
const ALT_TEXT = {
  calm: ["Still lake at dawn", "Empty beach shoreline", "Mist over pine forest", "Smooth pebbles in water", "White clouds drifting"],
  loud: ["City street at night", "Concert crowd cheering", "Neon signs reflecting", "Fireworks exploding", "Graffiti-covered wall"],
  // ...
};
```

```jsx
<ImageCard alt={ALT_TEXT[activeMood]?.[i] || `${activeMood} image`} ... />
```

### Fix 3: Add ARIA live region for loading announcements

When images load, screen reader users have no feedback. Add a visually hidden live region:

```jsx
<div aria-live="polite" className="sr-only">
  {loading && `Loading ${activeMood} images...`}
  {!loading && images.length > 0 && `${activeMood} images loaded`}
  {error && `Error loading ${activeMood} images`}
</div>
```

`aria-live="polite"` tells screen readers to announce content changes without interrupting.

### Fix 4: Keyboard accessibility for the grid

The image cards are not focusable. Keyboard users cannot navigate between them. Add `tabIndex` and keyboard-triggered hover effects:

```jsx
<div
  tabIndex={0}
  role="img"
  aria-label={alt}
  className="... focus-visible:ring-2 focus-visible:ring-white"
>
```

Add `focus-visible:` variants so keyboard users get a visible ring on focus.

**Severity: Medium-High.** The current alt text is technically present but functionally useless. Combined with no loading announcements and no keyboard navigation, the image grid is partially inaccessible.

---

## 5. Performance / Re-renders

### Finding: Generally good, with two unnecessary re-render sources

#### Serial dependency chain analysis

The full re-render path when a mood is selected:

```
User clicks
  → MoodBar onClick fires
    → App.handleSelect("calm")
      → fetchImages("calm")
        → setState({ loading: true, ... })
          → App re-renders
            → MoodBar re-renders  (receives activeMood, disabled)
            → SkeletonGrid renders (loading = true)
  → Promise.all resolves
    → setState({ images: [...], loading: false })
      → App re-renders
        → MoodBar re-renders  (disabled = false)
        → ImageCard ×5 renders (new image URLs)
```

This is the **minimum possible** — 2 re-renders per mood selection. No wasted cycles.

#### Issue A: Inline `onRetry` closure recreates every render

```jsx
<ErrorState message={error} onRetry={() => fetchImages(activeMood)} />
```

This inline arrow function is a **new reference every render**. React's reconciliation sees a new `onRetry` prop every time and cannot skip re-rendering `ErrorState`. In this context, the impact is negligible because:
- Error state is transient (shown briefly)
- `ErrorState` is a leaf component with no children

But if this pattern proliferated, it would defeat React's memoization.

#### Fix: Stable callback

```jsx
const handleRetry = useCallback(() => {
  fetchImages(activeMood);
}, [fetchImages, activeMood]);
```

Then:

```jsx
<ErrorState message={error} onRetry={handleRetry} />
```

#### Issue B: No `React.memo` on components that receive stable props

`ImageCard` receives `url`, `alt`, and `index`. When a new mood loads, `url` and `alt` always change (new images). But during the same mood (e.g., retry), the URLs are identical. Without `React.memo`, `ImageCard` re-renders even if its props haven't changed.

#### Fix: Wrap presentational components in `React.memo`

```jsx
import { memo } from "react";

const ImageCard = memo(function ImageCard({ url, alt, index }) {
  // ...
});
```

Same for `SkeletonGrid` and `ErrorState` (they receive no props or stable props).

#### Issue C: Missing `key` concern in image grid

```jsx
{images.map((url, i) => (
  <ImageCard key={url} ... />
))}
```

The `key={url}` is correct — each picsum URL is unique per mood+index. If the user switches from "calm" to "loud," every URL changes, so every card unmounts and remounts. That's correct behavior; you don't want to reuse DOM nodes across moods.

But if the user retries the **same mood** and gets the same URLs (picsum seeds are deterministic), React reuses the DOM nodes because the keys match. No unnecessary DOM churn. Good.

#### Fix summary for re-renders

```jsx
// ImageCard.jsx
import { memo } from "react";
export default memo(function ImageCard({ url, alt, index }) { ... });

// SkeletonGrid.jsx
import { memo } from "react";
export default memo(function SkeletonGrid() { ... });

// App.jsx
const handleRetry = useCallback(() => fetchImages(activeMood), [fetchImages, activeMood]);
```

**Severity: Low.** The app is small enough that these optimizations are premature. The current re-render count is already minimal. These fixes matter if the grid grows to 50+ cards or if each card becomes expensive to render.

---

## Summary & Priority Matrix

| Issue | Severity | Effort to Fix | Priority |
|---|---|---|---|
| API key exposure risk (architecture) | High | Low | **Fix now** |
| Race condition (edge case B) | Low | Medium | Monitor |
| Rate limiting (no handling) | Medium | Medium | **Fix before shipping** |
| Alt text (useless values) | High | Low | **Fix now** |
| ARIA live region (missing) | Medium | Low | **Fix now** |
| Keyboard nav (missing) | Medium | Medium | **Fix now** |
| Inline retry closure | Low | Low | Nice-to-have |
| React.memo (missing) | Low | Low | Nice-to-have |
| AbortController | Medium | Medium | Consider for production |

### Quick wins (implement immediately)

1. **Alt text → `alt=""`** — change one prop, instantly WCAG-compliant for decorative images
2. **ARIA live region** — add 10 lines in `App.jsx`
3. **`.env` + `imageService.js`** — decouple the API URL from source code
4. **`handleRetry` stable callback** — wrap in `useCallback`
