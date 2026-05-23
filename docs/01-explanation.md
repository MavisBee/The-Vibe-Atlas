# The Vibe Atlas — Line-by-Line ELI7

> **ELI7 = Explain Like I'm 7.** No jargon. No "closures" or "side effects." Stories and pictures.

---

## 📦 `index.html` — The front door

```html
<!doctype html>
<html lang="en">
```

This is the **front door** of your house. Every house needs one. The `<html lang="en">` tells browsers "this house speaks English."

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
```

**Preconnect** is like telling your mom "I'm going to ask Grandma for cookies later." Mom starts walking toward the kitchen before you even ask. When you finally ask, the cookies arrive faster because Mom is already there. This makes the font load quicker.

```html
<div id="root"></div>
```

An **empty bucket**. React will fill this bucket with everything we build. The `id="root"` is like writing "BUCKET" on the side so everyone knows which bucket to use.

```html
<script type="module" src="/src/main.jsx"></script>
```

"Go read this blueprint, then build the house inside the bucket."

---

## 🚀 `src/main.jsx` — The ignition key

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
```

**Imports** are like going to the toy shelf and grabbing the toys you want to play with: "I'll take StrictMode, the CSS crayons, and the App toy."

```jsx
createRoot(document.getElementById('root')).render(
```

Find the bucket (`root`), then fill it with whatever we render.

```jsx
<StrictMode>
  <App />
</StrictMode>
```

**StrictMode** is like having a babysitter who watches everything twice. In development, it makes your code run twice on purpose to catch bugs. "Did you wash your hands? Let me check again." It's annoying but helpful. Does nothing in the real (production) app.

---

## 🎨 `src/index.css` — The paint can

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

These three lines unlock a **giant box of crayons** called Tailwind. Suddenly you can use tiny words like `bg-[#0a0a0f]` and `rounded-full` instead of writing long paint recipes.

```css
body {
  @apply m-0 bg-[#0a0a0f] text-white font-['Inter',system-ui,sans-serif] antialiased;
}
```

- `m-0` — No gap between the wall and the floor. Zero margin.
- `bg-[#0a0a0f]` — Paint the whole wall **almost-black**. Like space.
- `text-white` — Make all words **white**, like stars.
- `font-['Inter',...]` — Use the Inter font first (the one we preconnected), then fall back to system fonts if Inter isn't here yet.
- `antialiased` — Smooth out the bumpy edges of letters, like sanding wood.

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**Keyframes** are a flipbook. We draw the first frame (light on the left), and the last frame (light on the right). The computer fills in all the in-between frames to make it look like the light is sliding across.

```css
.skeleton-shimmer {
  background: linear-gradient(90deg, #1a1a2e 25%, #2a2a3e 50%, #1a1a2e 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

This makes a gray rectangle with a **moving stripe of lighter gray**. It looks like someone is sweeping a flashlight across a dark room. The `1.5s` means one sweep takes one and a half seconds. `infinite` means it never stops. This is our "loading ghost."

---

## 🎨 `tailwind.config.js` — The custom crayon box

```js
colors: {
  calm: "#7EC8E3",
  loud: "#FF6B6B",
  warm: "#FFB347",
  lonely: "#8E8DBE",
  bright: "#FFE66D",
},
```

We name five colors after our five moods. Now we can write `bg-calm` instead of remembering the hex code `#7EC8E3`. It's like putting labels on your crayons: "this blue one is for Calm."

---

## 🧠 `src/hooks/useMoodImages.js` — The brain (MOST IMPORTANT)

```js
import { useState, useCallback, useRef } from "react";
```

We grab three tools from React's toolbox:
- **useState** — A sticky note that remembers things even when the page changes.
- **useCallback** — A promise: "I will always be the same function, I won't change."
- **useRef** — A secret notepad that you can read and write without anyone seeing you.

### `buildImageUrl(mood, index)`

```js
function buildImageUrl(mood, index) {
  return `https://picsum.photos/seed/vibe-${mood}-${index + 1}/600/400`;
}
```

This is a **recipe machine**. You give it a mood like "calm" and a number like 0, and it builds a URL:
`https://picsum.photos/seed/vibe-calm-1/600/400`

The `seed` part makes sure you get the **same image every time** for "calm 1." Like having a favorite toy that's always in the same spot.

### `fetchWithPreload(url)`

```js
function fetchWithPreload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image`));
    img.src = url;
  });
}
```

This is like **sneaking a snack before dinner**. Instead of waiting for the image to show up on screen, we create a secret Image object in JavaScript memory, tell it "go download this picture," and wait. When it finishes, we say "yay, here's your URL." If it fails, we say "boo, error."

A **Promise** is an IOU. "I promise to call you back when I'm done — either with the URL or with an error."

`resolve(url)` — "Here's your picture URL, all downloaded and ready."
`reject(new Error(...))` — "Sorry, the download broke."

### `useMoodImages()` — The boss hook

```js
const [state, setState] = useState({
  images: [],
  loading: false,
  error: null,
  activeMood: null,
});
```

The **sticky note** that remembers four things about our current mood quest:
- `images` — The pictures we already fetched (starts empty).
- `loading` — Are we still waiting? (starts false).
- `error` — Did something break? (starts null = no error).
- `activeMood` — Which mood button did we last press? (starts null = nothing).

```js
const loadingRef = useRef(null);
```

A **secret notepad** that holds one word: which mood is currently being fetched. Nobody can see this — it doesn't make the screen re-draw when it changes.

### `fetchImages(mood)` — The main event

```js
const fetchImages = useCallback((mood) => {
```

**useCallback** with an empty `[]` dependency array means: "This function is born once and never changes. I promise it's the same function every time you call it." This prevents unnecessary re-renders.

```js
  if (loadingRef.current === mood) return;
```

**THE DEDUP.** Read the secret notepad. Is it already fetching this exact mood? If yes, **do nothing**. This is the spam guard — you can mash the "Calm" button 100 times and only one request goes out.

```js
  loadingRef.current = mood;
```

Write on the secret notepad: "Now fetching: calm." Any future call to `fetchImages("calm")` will see this and bail out.

```js
  setState((prev) => ({
    ...prev,
    loading: true,
    error: null,
    activeMood: mood,
    images: prev.activeMood === mood ? prev.images : [],
  }));
```

Update the sticky note:
- `loading: true` — Show the shimmer ghosts.
- `error: null` — Clear any old error.
- `activeMood: mood` — Remember which mood we're collecting.
- `images: prev.activeMood === mood ? prev.images : []` — **Smart trick:** if we're re-fetching the same mood (e.g., retry), keep the old images on screen so it doesn't flash empty. If it's a new mood, clear the images.

```js
  const urls = Array.from({ length: 5 }, (_, i) =>
    buildImageUrl(mood, i)
  );
```

Make a list of 5 image URLs for this mood, numbered 0 through 4.

```js
  Promise.all(urls.map(fetchWithPreload))
```

`urls.map(fetchWithPreload)` — Take each URL and start downloading it. This returns 5 Promises.
`Promise.all(...)` — Wait for **all 5** to finish. Like having 5 friends each go get one ingredient, and you wait until everyone is back before you start cooking.

#### `.then()` — Success!

```js
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
```

1. **Check the notepad:** Is the `loadingRef` still pointing at our mood? If the user clicked "Loud" while we were fetching "Calm," `loadingRef.current` will be "loud" and we silently **discard** the stale "calm" results. This is the **cleanup logic**.
2. **Clear the notepad:** Set `loadingRef.current = null` to say "I'm done fetching."
3. **Update state:** Put the 5 image URLs on the sticky note, turn off loading, clear errors.

#### `.catch()` — Failure!

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

Same cleanup pattern. If the request is stale, throw it away. Otherwise:
1. Clear the notepad.
2. Turn off loading.
3. Write the error message on the sticky note so `ErrorState` can show it.

### Why no `useEffect`?

**No useEffect in the whole codebase.** We used `useRef` + `useCallback` instead.

Normally people use `useEffect` for fetching. The pattern looks like:

```js
useEffect(() => {
  fetch("/data").then(setData);
}, [mood]);
```

But `useEffect` has a problem: it runs **after** the screen paints. That adds a tiny delay. More importantly, `useEffect` has **dependency arrays** that people often get wrong — either missing dependencies (stale data) or including too many (infinite loops).

Our `useRef` approach **avoids useEffect entirely**. The ref acts as our "did this fetch already start?" check. The `.then` check `if (loadingRef.current !== mood) return` is our **manual cleanup** — it does the same job as a `useEffect` cleanup function (`return () => abort()`), but without the complexity.

### Return

```js
  return { ...state, fetchImages };
```

Spread the sticky note (images, loading, error, activeMood) and add the `fetchImages` function. The rest of the app gets everything it needs.

---

## 🏠 `src/App.jsx` — The floor plan

```jsx
import { useCallback } from "react";
import { useMoodImages } from "./hooks/useMoodImages";
import MoodBar from "./components/MoodBar";
import SkeletonGrid from "./components/SkeletonGrid";
import ErrorState from "./components/ErrorState";
import ImageCard from "./components/ImageCard";
```

Grab all the toys from the shelf: the brain (hook), the buttons, the ghosts, the error sign, and the picture frames.

```jsx
function App() {
  const { images, loading, error, activeMood, fetchImages } = useMoodImages();
```

Call the brain hook. Destructure the return value into five variables — like unpacking a backpack and putting each item on its own shelf.

```jsx
  const handleSelect = useCallback(
    (mood) => {
      fetchImages(mood);
    },
    [fetchImages]
  );
```

Wrap `fetchImages` in another `useCallback`. The dependency `[fetchImages]` means: "recreate this function only if `fetchImages` changes." Since `fetchImages` has `[]` dependencies (never changes), `handleSelect` also never changes. This is **dependency chain stability**.

If `fetchImages` were unstable (recreated every render), `handleSelect` would also be recreated, which would re-render `MoodBar`. The dependency chain keeps things efficient.

```jsx
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
```

The outer wrapper. `min-h-screen` means "at least as tall as your monitor." `bg-[#0a0a0f]` is the almost-black space color.

### Header

```jsx
<h1 className="text-5xl md:text-6xl font-extrabold tracking-tight
    bg-gradient-to-r from-white via-white/90 to-white/70
    bg-clip-text text-transparent mb-3">
  The Vibe Atlas
</h1>
```

**Gradient text trick:** Set the background to a fading gradient (white → slightly transparent white → more transparent). Then use `bg-clip-text` ("only show the background where the text is") and `text-transparent` ("hide the actual text color"). Result: text that looks like it fades from left to right. Magic.

### Conditional rendering (the four states)

The JSX below is a **decision tree**. Only one branch shows at a time:

```
┌─────────────────────────────────────────────┐
│  No mood chosen yet?  →  "Choose a mood"    │
│  Loading?             →  Skeleton ghosts    │
│  Error?               →  Error + retry      │
│  Have images?         →  Image grid         │
└─────────────────────────────────────────────┘
```

```jsx
{!activeMood && !loading && (
  <div>... Choose a mood to explore</div>
)}
```

If no mood is active and we're not loading, show a **friendly prompt** with a little mountain icon (SVG). The `opacity-50` makes it faint so it doesn't scream.

```jsx
{loading && <SkeletonGrid />}
```

If we're loading, show the **shimmer ghosts**. Simple.

```jsx
{error && !loading && (
  <ErrorState message={error} onRetry={() => fetchImages(activeMood)} />
)}
```

If there's an error and we're done loading, show the **error sign** with a retry button. `onRetry` calls `fetchImages(activeMood)` — try the same mood again.

**Note about the retry:** When retry calls `fetchImages(activeMood)`, the `loadingRef.current` is `null` (the failed request already set it to `null` in the `.catch`). So the dedup check `if (loadingRef.current === mood) return` passes, and a new fetch starts. The `images` state keeps the old images because `prev.activeMood === mood` is `true`.

```jsx
{!loading && !error && images.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
```

The **image grid**. `grid-cols-1` = 1 column on phone. `sm:grid-cols-2` = 2 on tablet. `xl:grid-cols-5` = 5 on wide screens. 5 images, 5 columns — each image gets its own slot.

```jsx
    {images.map((url, i) => (
      <ImageCard key={url} url={url} alt={`${activeMood} ${i + 1}`} index={i} />
    ))}
```

Loop through the 5 image URLs and create an `ImageCard` for each. `key={url}` helps React track which cards changed — if URLs stay the same, React doesn't re-create the card.

---

## 🎯 `src/components/MoodBar.jsx` — The buttons

```jsx
const MOODS = [
  { id: "calm", label: "Calm", color: "bg-calm", ring: "ring-calm" },
  ...
];
```

A **shopping list** of all five moods. Each entry has:
- `id` — The machine-readable name (used in code).
- `label` — The human-readable name (shown on button).
- `color` — The Tailwind background class.
- `ring` — The Tailwind ring (outline) class.

```jsx
disabled={disabled && !isActive}
```

This is careful: **only disable OTHER buttons** while loading. The active button stays clickable so you can spam it (but the dedup in the hook ignores it). If we disabled ALL buttons, the retry button on ErrorState would be the only way to retry.

```jsx
${isActive
  ? `${mood.color} text-black ring-2 ${mood.ring} ring-offset-2 ring-offset-[#0a0a0f] scale-105 shadow-lg`
  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
}
```

**Active button:** full color background (`bg-calm` → blue), dark text, a colored ring around it (like a glow), slightly bigger (`scale-105`), with a shadow.

**Inactive button:** nearly transparent white background (`5%`), dim white text, a faint border. On hover, it becomes slightly more visible.

```jsx
disabled:opacity-50 disabled:cursor-not-allowed
```

When disabled, the button turns half-transparent and the cursor changes to a "no" symbol. Visual feedback that says "I'm busy right now."

---

## 🖼️ `src/components/ImageCard.jsx` — One picture frame

```jsx
<div className="group relative overflow-hidden rounded-2xl ... hover:scale-[1.03]">
```

`group` — A flag that says "children can ask: is the parent being hovered?" This lets child elements react when you hover over the parent.

`relative overflow-hidden` — The frame has sharp edges; if the image spills out, hide the spill.

`hover:scale-[1.03]` — When you hover over the card, the whole card grows by 3%. Like leaning in for a closer look.

```jsx
<img
  src={url}
  alt={alt}
  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
  loading="lazy"
/>
```

`object-cover` — Zoom the image to fill the frame, cropping if needed (like Instagram fitting a photo into a square).

`group-hover:scale-110` — When the parent (`group`) is hovered, zoom the image to 110%. Combined with the card's 103% zoom, the image zooms **more** than the card. This creates a cool layered zoom effect.

`loading="lazy"` — Tell the browser: "don't download this image until it's about to appear on screen." Saves data for images below the fold.

```jsx
<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
    opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
```

A **dark gradient** that fades from black at the bottom to transparent at the top. Normally invisible (`opacity-0`). On hover, it fades in (`opacity-100`). This makes the text label readable against any image.

```jsx
<div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 ...">
  <span className="text-xs font-medium text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
    {alt}
  </span>
</div>
```

The **label** sits at the bottom of the card. `translate-y-full` pushes it all the way down (hidden). On hover, `translate-y-0` slides it up. Like a garage door opening.

`backdrop-blur-sm` blurs whatever is behind the label (the dark gradient) — makes it look frosted glass.

---

## 👻 `src/components/SkeletonGrid.jsx` — The loading ghosts

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
  {Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="aspect-[3/2] rounded-2xl skeleton-shimmer" />
  ))}
</div>
```

Same grid layout as the real images. Five rectangles with `aspect-[3/2]` (3 units wide, 2 units tall). The `skeleton-shimmer` class (defined in `index.css`) gives them the **moving flashlight effect**.

No text inside, no image — just gray blobs that shimmer. Your brain interprets: "something is coming soon."

---

## ⚠️ `src/components/ErrorState.jsx` — The oops sign

```jsx
<div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
  <svg ...>...</svg>
</div>
```

A **circle** with a very faint red background (`bg-red-500/10` = 10% red). Inside is a warning icon (SVG of a circle with an exclamation mark in the middle — actually a triangle/exclamation from Heroicons).

```jsx
<p className="text-white/60 text-sm mb-6 max-w-xs text-center">{message}</p>
```

The error message in dim white. Limited to `max-w-xs` (20rem / 320px) so it doesn't stretch too wide.

```jsx
<button onClick={onRetry} className="...">Try again</button>
```

A **retry button** styled with a glassmorphism look: semi-transparent white background, white border, rounded full (pill shape). On hover, it gets more opaque.

`onRetry` is `() => fetchImages(activeMood)` — call the fetch function again with the same mood.

---

## 🔁 The full flow (story mode)

1. You open the app. The screen is dark. A message says **"Choose a mood to explore."**

2. You click **"Calm"** (a blue button).

3. React calls `handleSelect("calm")` → `fetchImages("calm")`.

4. `fetchImages` checks the secret notepad: is "calm" already being fetched? No. Writes "calm" on the notepad. Sets `loading = true`.

5. The screen shows **5 shimmer ghosts** while the images download.

6. 5 images download in parallel. When they're all ready, `fetchImages` checks the notepad: "is 'calm' still the current request?" Yes. Clears the notepad. Sets the 5 images on the sticky note.

7. The ghosts disappear. **5 pictures** appear in a grid. Hover over one — it zooms, darkens, and a label slides up saying "calm 1."

8. You spam-click **"Loud"** 20 times. Only the **first click** matters. Click 2-20 see "already fetching 'loud'" and bail out. The secret notepad guards against duplicate work.

9. While "Loud" is loading, you click **"Warm."** The notepad now says "warm." When the "Loud" images finish, they check the notepad: "is 'loud' the current request?" No (it's "warm"). **Discarded.** No flickering, no stale images.

10. The "Warm" fetch finishes. Its images appear.

11. Something breaks (e.g., the image CDN is down). The `.catch` runs. It checks the notepad (still "warm"), clears it, and sets an error. The **error state** shows with a "Try again" button.

12. You click **"Try again."** It calls `fetchImages("warm")` again. The notepad is null, so the dedup check passes. A new fetch starts. This time it works.

---

## 🔍 Key design decisions

| Decision | Why |
|---|---|
| **No `useEffect`** | Avoids dependency array mistakes and extra render. The ref-based pattern is simpler and more explicit. |
| **`useRef` for dedup** | Ref changes don't trigger re-renders. We can check it inside `.then`/`.catch` without worrying about stale closures. |
| **Empty `[]` deps on `useCallback`** | `fetchImages` is stable forever. No re-creations, no downstream re-renders. |
| **`loadingRef.current !== mood` guard** | Manual cleanup that handles race conditions. If a newer request has overwritten the ref, the older result is silently dropped. |
| **Keep images during retry** | `images: prev.activeMood === mood ? prev.images : []` prevents the grid from flashing blank during a retry of the same mood. |
| **Disable only OTHER buttons during loading** | The active button stays clickable (though dedup ignores it). This feels responsive — you can always press what you want. |
| **Picsum.photos seed URLs** | No API key needed. Same mood + same index = same image every time. Consistent and fast. |

---

## 🧪 What if there were bugs?

| Bug | What would break | How to fix |
|---|---|---|
| Missing `loadingRef.current !== mood` check | Stale images could overwrite fresh ones. "Calm" loads after "Loud" was clicked → "Calm" images replace "Loud." | The check is there — this bug is prevented. |
| `loadingRef.current` not reset on error | The button would stay disabled forever. No more fetches possible. | The `.catch` sets `loadingRef.current = null` — prevented. |
| `images` always cleared on new fetch | Grid flashes blank every time you switch moods. Ugly. | We keep images if same mood — prevented. |
| `useCallback` missing dependency | If `fetchImages` changed and `handleSelect` didn't know, it would call the old function. | `[fetchImages]` is in the deps — safe. But `fetchImages` has `[]` deps, so it never changes anyway. |
| Forgot `StrictMode` doubles effects | In development, effects run twice. But we don't use effects — no problem. | Not applicable. Ref-based approach is immune to StrictMode double-invocation. |
