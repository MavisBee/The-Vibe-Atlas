# Principle Spotting

An analysis of the software engineering principles at work (or conspicuously absent) in The Vibe Atlas.

---

## 1. Separation of Concerns: UI vs Data Fetching

### What it means
UI components render pixels. Data-fetching code talks to servers. Never let them share a bedroom.

### How it shows up

```
src/hooks/useMoodImages.js   ← data layer (fetch, preload, state machine)
src/components/*.jsx          ← presentation layer (divs, buttons, images)
src/App.jsx                   ← orchestrator (calls hook, passes props down)
```

**The hook is a firewall.** `MoodBar`, `ImageCard`, `SkeletonGrid`, and `ErrorState` have no idea how images arrive. They receive props (`url`, `loading`, `error`, `onSelect`, `onRetry`) and render them. That's it.

`ImageCard.jsx` receives a `url` string and an `alt` string. It does not know those strings came from picsum.photos, or that they were preloaded via `Image` constructor. It does not care. If tomorrow you swap picsum for Unsplash, `ImageCard` changes by zero lines.

`MoodBar.jsx` receives `activeMood`, `onSelect`, and `disabled`. It does not know that selecting a mood triggers a `Promise.all` of five preload fetches. It just calls `onSelect(mood.id)` and styles itself according to whether it's `active` or `disabled`.

**Where the line blurs:** `App.jsx` imports both the hook and the components. It's the thin coordinator layer that wires them together. This is acceptable — a single orchestrator is not a violation; it's the "controller" in a clean-architecture sense. The problem would be if `ImageCard` imported `useMoodImages` directly and called it. That would be spaghetti.

### Verdict
Clean separation. Data layer is fully encapsulated in the custom hook. Components are pure-presentational. The orchestrator (`App`) is a thin wiring layer.

---

## 2. Loading State Management

### What it means
Every async operation has three states: before, during, after. Each must have a corresponding UI. Race conditions between concurrent fetches must be handled.

### The state machine

```
IDLE ──(click mood)──→ LOADING ──(success)──→ SUCCESS
                            │
                            └──(error)──→ ERROR ──(retry)──→ LOADING
```

### How it shows up

**Single source of truth:** One `useState` object holds all four fields:

```js
const [state, setState] = useState({
  images: [],       // ← data
  loading: false,   // ← loading flag
  error: null,      // ← error message
  activeMood: null, // ← which mood triggered this
});
```

**Atomic transitions.** State is never set piecemeal. Every update is a single `setState({...})` call that moves the entire state machine to its next valid state:

| Transition | What calls it | State after |
|---|---|---|
| IDLE → LOADING | `fetchImages` start | `{ loading: true, error: null, images: [] or old, activeMood: mood }` |
| LOADING → SUCCESS | `.then` | `{ loading: false, error: null, images: [5 URLs], activeMood: mood }` |
| LOADING → ERROR | `.catch` | `{ loading: false, error: "message", images: prev, activeMood: mood }` |

**No impossible states.** You cannot have `loading: true` and `images.length > 0` from different moods (images are cleared on mood switch). You cannot have `error` and `loading` both true (error sets loading false). This is the **"make impossible states unrepresentable"** principle.

**Race condition handling.** The `loadingRef` pattern prevents the classic React fetch race:

```
User clicks "Calm"   → fetchImages("calm") starts, ref = "calm"
User clicks "Loud"   → fetchImages("loud") starts, ref = "loud"
"Calm" fetch resolves → checks ref ("loud" !== "calm") → discards
"Loud" fetch resolves → checks ref ("loud" === "loud") → renders
```

Without this guard, the "Calm" images would overwrite the "Loud" images. The user would be confused. This is a **stale closure / race condition** bug that plagues naive `useEffect` + `useState` patterns.

### Verdict
Excellent loading state management. Atomic state transitions. Race conditions handled via ref-based identity checks. The four-way decision tree in `App.jsx:39-65` maps exactly to the valid states of the machine.

---

## 3. Error Boundaries

### What it means
Errors should be caught at the right level, presented gracefully, and offer a recovery path.

### Two levels of error handling

#### a) Data-layer errors (caught in the hook)

```js
.catch((err) => {
  if (loadingRef.current !== mood) return;
  loadingRef.current = null;
  setState((prev) => ({
    ...prev,
    loading: false,
    error: err.message || "Something went wrong",
  }));
})
```

The `.catch` on `Promise.all` catches any failed image preload. The error becomes a string on the state object. The hook does not swallow the error — it surfaces it to the UI layer.

#### b) Presentation-layer errors (rendered by ErrorState)

```jsx
{error && !loading && (
  <ErrorState message={error} onRetry={() => fetchImages(activeMood)} />
)}
```

`ErrorState` receives the error message and a retry callback. It shows:
- A red-tinted warning icon
- The error message text
- A "Try again" button

The retry button calls `fetchImages(activeMood)` — same mood, fresh attempt. The ref check passes because the `.catch` already set `loadingRef.current = null`.

#### What's missing: React Error Boundary

A **React Error Boundary** is a component that catches **uncaught exceptions** thrown during rendering, lifecycle methods, or constructors. This codebase does not have one. If a component throws a runtime error (e.g., `images.map is not a function` because `images` is somehow `null`), the entire app crashes with a white screen.

For a production app, you would wrap the image grid or the entire app in an error boundary:

```jsx
class ImageGridErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <p>Something went wrong rendering these images.</p>;
    return this.props.children;
  }
}
```

This is not present. The current error handling only covers **expected errors** (fetch failures). **Unexpected errors** (null pointer, type errors) are unguarded.

#### What's also missing: error granularity

The entire fetch is one `Promise.all`. If 4 of 5 images load but 1 fails, the whole batch is rejected. There is no partial-success state. A more resilient approach would be:

```js
const results = await Promise.allSettled(urls.map(fetchWithPreload));
const images = results
  .filter(r => r.status === "fulfilled")
  .map(r => r.value);
if (images.length === 0) throw new Error("All images failed");
// render partial results
```

`Promise.allSettled` never rejects — each promise either fulfills or rejects, and you filter. This gives you partial success (4 out of 5 images). The current code uses `Promise.all`, which fails fast on the first error.

### Verdict
Good handling of expected async errors with a clear recovery path. Missing a React Error Boundary for unexpected rendering errors. Missing partial-success handling (all-or-nothing batch).

---

## 4. Dependency Injection

### What it means
A component should not hard-code its dependencies. It should receive them (injected) so they can be swapped for testing or alternate environments.

### How it shows up (or doesn't)

#### a) The hook as a service locator

`useMoodImages` is a **hard-coded dependency** in `App.jsx`:

```js
import { useMoodImages } from "./hooks/useMoodImages";
```

There is no way to inject a mock hook for testing without mocking the module itself (e.g., `vi.mock("./hooks/useMoodImages")` in Vitest). This is acceptable for a small app, but the tightest form of coupling.

#### b) The image API URL builder is hard-coded

```js
function buildImageUrl(mood, index) {
  return `https://picsum.photos/seed/vibe-${mood}-${index + 1}/600/400`;
}
```

The API endpoint is hard-coded inside the hook. You cannot configure it via props, context, or environment variables. To swap from picsum to Unsplash, you edit this function directly.

A more DI-friendly approach:

```js
// config.js
export const IMAGE_API = import.meta.env.VITE_IMAGE_API || "picsum";

// useMoodImages.js
import { IMAGE_API } from "../config";
const API_BUILDERS = {
  picsum: (mood, i) => `https://picsum.photos/seed/vibe-${mood}-${i + 1}/600/400`,
  unsplash: (mood, i) => `https://api.unsplash.com/...`,
};
const buildImageUrl = API_BUILDERS[IMAGE_API];
```

Or even better, accept the image URL builder as a parameter to the hook or to a context provider:

```jsx
// App.jsx
const { images, ... } = useMoodImages({ imageBuilder: myBuilder });
```

This is **not done here** but the codebase is small enough that it doesn't matter.

#### c) Components receive props (good injection)

```jsx
<ImageCard url={url} alt={alt} index={i} />
<ErrorState message={error} onRetry={...} />
<MoodBar activeMood={...} onSelect={...} disabled={...} />
```

All presentational components receive their data via props. This is **dependency injection at the component level**. You could render `ErrorState` in a Storybook without a hook, just by passing `message` and `onRetry`. That's good.

#### d) The `onRetry` function is a closure

```jsx
onRetry={() => fetchImages(activeMood)}
```

This creates a **new function every render** (because it's an inline arrow). However, it's only rendered when `error && !loading`, which is a transient state. The re-creation cost is negligible. If this were a hot path, you'd extract it with `useCallback`.

### Verdict
Light on DI for the data layer (hard-coded hook import, hard-coded API URL). Good DI for presentational components (props-based). Acceptable for this scale. A production app would inject the image builder and mock the hook in tests.

---

## 5. Immutability of Fetched Data

### What it means
Once data arrives from the server, you should not mutate it. Treat it as frozen. If you need a modified version, create a copy.

### How it shows up

#### a) State is replaced, not mutated

```js
setState({ images: results, loading: false, error: null, activeMood: mood });
```

This is a brand new object. The old state is garbage-collected. No property of the old state is modified in place.

#### b) The functional updater is used correctly

```js
setState((prev) => ({ ...prev, loading: true, ... }));
```

The spread operator (`...prev`) creates a **shallow copy** of the previous state, then the new properties are merged on top. The previous state object is never mutated.

#### c) `images` array is never mutated in place

The `images` array is set to:
- `[]` — a new empty array
- `prev.images` — the previous array (reference kept)
- `results` — a new array from `Promise.all`

No `.push()`, `.pop()`, `.splice()`, or index assignment. The array is always replaced, never mutated.

#### d) URL strings are immutable by nature

The preload function returns the URL string. Strings are primitive and immutable in JavaScript. The `results` array from `Promise.all(urls.map(fetchWithPreload))` is a new array of the same URL strings that went in. No transformation is applied.

#### e) The ref is mutable (intentional)

```js
loadingRef.current = mood;
loadingRef.current = null;
```

`useRef` is the **one exception** to immutability in this codebase. Refs are explicitly designed for mutable values that don't participate in the rendering cycle. The ref is mutated freely, and this is correct — ref mutation does not trigger re-renders, and the ref value is not rendered anywhere.

### What's good: no accidental mutations

There is no code that does:
```js
const imgs = state.images;
imgs.push(newUrl);  // mutation!
setState({ ...state, images: imgs });  // same array, mutated
```

This common mistake is absent. Every state update creates a new array or reuses the previous reference (but never mutates it).

### What's not tested: deep immutability

The images are URL strings — flat data, no nesting. There is no complex object graph to protect. If the data model were deeper (e.g., `{ id, urls: { small, full }, user: { name } }`), you would need to ensure nested objects are also treated immutably. Not relevant here.

### Verdict
Fetched data is handled immutably. State is always replaced, never mutated. The one mutable reference (`loadingRef`) is used correctly for non-rendering state. No violations found.

---

## Summary Table

| Principle | Present? | Evidence | Gaps |
|---|---|---|---|
| **Separation of concerns** | Yes | Hook encapsulates data; components are presentational; App orchestrates | Thin orchestrator is acceptable |
| **Loading state management** | Yes | Atomic state machine, 4 valid states, ref-based race condition guard | None significant |
| **Error boundaries** | Partial | Fetch errors caught and rendered with retry | No React Error Boundary, no partial-success |
| **Dependency injection** | Partial | Props-based DI for components | Hook and API URL are hard-coded |
| **Immutability** | Yes | State replaced via spread, no array mutations, strings are immutable | Not exercised deeply (flat data) |
