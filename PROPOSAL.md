# 3D Personal Website — Proposal

> **Status (2026-10-01):** the first version is built, and it departs from the
> stack below. After inspecting the inspiration site (acrokat.me), the scene is
> generated entirely in code with plain Three.js: no React Three Fiber, no
> `.glb` models. The concept, interaction design and phases still apply.
> Content lives in `src/data.ts`; buildings are drawn in `src/scene/buildings.ts`.

## Concept

A small low-poly island city you can orbit around. Each building is one chapter of
your academic or career history; clicking it flies the camera in and opens a panel
with title, dates, and achievements. A ladder rises from the island through a cloud
layer; above the clouds, floating cloud-islands hold personal projects and product
ideas.

## Feasibility

Fully doable with Three.js. Every piece is a well-trodden pattern:

| Feature | How it's done | Difficulty |
|---|---|---|
| Island + buildings | glTF models loaded with `GLTFLoader` | Easy (code) / Medium (art) |
| Click / hover on buildings | Raycasting (built into R3F as `onClick` / `onPointerOver`) | Easy |
| Info panel on click | Normal HTML/CSS overlay driven by app state | Easy |
| Camera fly-to building | `camera-controls` `setLookAt(..., true)` transitions | Easy |
| Ladder climb to the sky | Camera animated along a vertical path, triggered by clicking the ladder or scrolling | Medium |
| Clouds | drei `<Clouds>` (instanced sprites) or low-poly cloud meshes | Easy–Medium |
| Mobile performance | Low-poly assets, capped pixel ratio, few draw calls | Medium |

The engineering risk is low. The real risk is **art**: the site is only as good as
the models and lighting, so the plan gets something on screen with free assets
first and upgrades the art later.

## Recommended stack

- **Vite + React + TypeScript**
- **React Three Fiber** (React renderer for Three.js) + **drei** helpers
  (`CameraControls`, `useGLTF`, `Clouds`, `Html`, `Environment`)
- **zustand** for the small amount of shared state (selected building, ground/sky level)
- **Standard WebGL renderer** — WebGPU is available in Three.js now, but the drei /
  postprocessing ecosystem is most mature on WebGL and this scene doesn't need it
- **GitHub Pages** deploy via a GitHub Action (repo is already on GitHub; free)

Why R3F rather than vanilla Three.js: half of this site is UI (panels, nav, a
fallback list view), and R3F gives pointer events on meshes and declarative scene
structure for free. It is still Three.js underneath, and anything can drop to raw
Three.js when needed.

## Architecture

```
src/
  data/
    experiences.ts     # academic + career entries  -> buildings
    projects.ts        # personal projects / ideas  -> cloud islands
  scene/
    Island.tsx         # terrain, water, props
    Building.tsx       # one clickable building (model, hover glow, label)
    Ladder.tsx         # the ladder + click target
    Sky.tsx            # cloud layer + floating project islands
    CameraRig.tsx      # all camera moves (overview, focus, climb)
  ui/
    DetailPanel.tsx    # title / role / dates / achievements / links
    Nav.tsx            # Ground <-> Sky toggle, list-view toggle
    ListView.tsx       # plain HTML version of all content
  store.ts
public/models/*.glb
```

**Content is data, not scene code.** Adding a job is one entry:

```ts
{
  id: "acme-pm",
  kind: "career",            // or "academic"
  title: "Product Manager",
  org: "Acme",
  period: "2023 – 2025",
  achievements: ["…", "…"],
  model: "office-tower",     // which building model
  position: [4, 0, -2],      // plot on the island
}
```

## Interaction design

1. **Arrive** — short intro, camera settles on an overview of the island. Name and
   one-line tagline overlaid.
2. **Explore** — drag to orbit, scroll to zoom (limits so users can't get lost).
   Buildings lift/glow on hover and show a floating name label.
3. **Click a building** — camera flies to it, the detail panel slides in. Close or
   click elsewhere to return to the overview.
4. **Climb** — click the ladder (or the "Sky" nav button): camera travels up the
   ladder, passes through the cloud layer, and arrives at the sky level.
5. **Sky level** — floating cloud-islands, one per project/idea, same
   click-to-focus behaviour. "Ground" button climbs back down.

Layout idea: arrange buildings along a path in chronological order, so the walk
from the shore to the ladder reads as school → early career → now → "what's next"
in the sky. Academic buildings share one visual style (campus), career another
(offices).

## Things that are easy to forget

- **List view / fallback.** Recruiters skimming on a phone need the content in 10
  seconds. A plain HTML view of the same data also covers SEO, screen readers,
  and devices without WebGL.
- **Deep links.** `/#/acme-pm` opens that building directly, so entries are shareable.
- **Loading.** Compress models (Draco/meshopt via `gltf-transform`), keep the
  whole scene to a few MB, show a real progress indicator.
- **Performance budget.** ~100 draw calls on mobile, pixel ratio capped at 2,
  render on demand when nothing is moving.
- **Reduced motion.** Respect `prefers-reduced-motion` by cutting camera flights
  to quick fades.

## Art plan

- **Phase 1:** CC0 low-poly kits — Kenney City Kit, Quaternius, KayKit City
  Builder (all ship glTF, no attribution required). Island terrain is a simple
  sculpted mesh or generated procedurally.
- **Later:** replace individual buildings with custom Blender models that resemble
  the real places (your university, specific offices) without touching code,
  since each entry just names its model.

## Build phases

| Phase | Deliverable |
|---|---|
| 0. Scaffold | Vite + R3F project, GitHub Pages deploy, empty scene with lighting |
| 1. Greybox | Island + placeholder box buildings from data, orbit controls, click → panel |
| 2. Camera | Fly-to-building, overview return, ladder climb, ground/sky levels |
| 3. Art pass | Real models, water, clouds, lighting, hover effects, labels |
| 4. Content | Your real experiences and projects, copy, links |
| 5. Polish | List view, deep links, loading screen, mobile tuning, reduced motion |

Phases 0–2 produce a working, ugly-but-complete version; that is the point to
judge whether the concept feels right before investing in art.

## Decisions needed from you

1. **Art style** — bright low-poly/toy-like (recommended; cheapest to make look
   good and fastest to render) vs. something more realistic or stylised.
2. **Navigation** — orbit camera (recommended) vs. a walking character you steer.
   The character is charming but roughly doubles the work and is worse on mobile.
3. **Content** — the list of experiences and projects (a résumé/LinkedIn export is enough).
4. **Hosting** — GitHub Pages (default) or a custom domain / Vercel.
