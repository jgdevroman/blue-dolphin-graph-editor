# BlueDolphin Graph Editor

A graph editor for visualizing and managing large node networks. Built with React, TypeScript, GoJS, MUI, and Jest.

---
## Features

### Initial graph

- **1000-node graph on load** — a random spanning tree is pre-computed at module load and rendered via GoJS `ForceDirectedLayout`.

### Canvas interactions

- **Canvas selection** — click any node on the canvas to select it. The side-panel list scrolls to that node's row and the properties panel populates.
- **Add node** — double-click an empty area of the canvas to place a new node at that position. The node appears immediately in both the canvas and the list.
- **Draw link** — drag from one node to another on the canvas to create a link. Self-loops and duplicate edges are rejected.

### Side panel interactions

- **List selection** — click any row in the side panel to select the corresponding node. The canvas pans to bring the node into view.
- **Rename node** — edit the name field in the properties panel. The canvas label and list row update on every keystroke with no delay.
- **Read-only type** — the node `type` field is displayed in the properties panel but cannot be edited.

### Layout

- **Responsive side panel** — permanently visible on `lg`+ screens. Hidden by default on `md` and smaller, with a toggle button to open and close it.

## Quick Start

**Bun (recommended):**

```bash
bun install           # install dependencies
bun run dev           # start dev server (http://localhost:5173)
bun run build         # type-check + production build
bun run preview       # serve the production build locally
bun run test          # run Jest test suite
bun run test:coverage # run tests with coverage report
```

**npm:**

```bash
npm install           # install dependencies
npm run dev           # start dev server (http://localhost:5173)
npm run build         # type-check + production build
npm run preview       # serve the production build locally
npm test              # run Jest test suite
npm run test:coverage # run tests with coverage report
```


## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Bundler / dev server | Vite + `@vitejs/plugin-react` | Oxc-based plugin; no meaningful perf difference vs SWC at this scale |
| Language | TypeScript 6 strict mode | |
| Graph engine | GoJS 3 (trial) | Watermark visible; no license required for this assignment |
| UI components | MUI 9 + Emotion | Side panel, buttons, layout primitives |
| Package manager | Bun | Faster installs; npm-compatible |
| Linter / formatter | Biome | Replaces ESLint + Prettier; zero config, TypeScript-aware |
| Test runner | Jest + ts-jest | Hard project requirement (NFR-7) |

**React Compiler — skipped.** The compiler targets codebases that haven't manually applied `memo`/`useCallback`. This project does the opposite: explicit memoization is a deliberate architecture choice that demonstrates the optimization reasoning. Enabling the compiler would make that reasoning invisible.

## CI

GitHub Actions runs on every push to `main` and on every PR targeting `main`. Two parallel jobs:

**`check` job:**
1. Install — `bun install --frozen-lockfile`
2. Lint — `bun run lint`
3. Build — `bun run build`

**`test` job:**
1. Install — `bun install --frozen-lockfile`
2. Test with coverage — `bun run test:coverage`

## Deployment

- Hosted on Vercel as a static site.
- `vercel.json` at the repo root overrides the default install/build commands to use Bun instead of npm.
- Build: `bun install` + `bun run build` (TypeScript check + Vite bundle). Output directory: `dist/`.
- No server-side rendering, no API routes, no environment variables — Vercel serves the `dist/` folder as a static asset tree.
- Deployed URL: [<https://blue-dolphin-assignment.vercel.app>](https://blue-dolphin-graph-editor.vercel.app/)


## Architecture

### Folder structure

```
src/
├── types/
│   ├── graph.ts              # AppNode, AppLink interfaces
│   ├── graph-editor.ts       # NamePatch type
│   └── graph-guards.ts       # isAppNode, isAppLink type guards
├── utils/
│   └── graph-utils.ts        # generateGraph(), GENERATED_GRAPH constant
├── components/
│   ├── graph-editor/
│   │   ├── index.tsx         # Root state container — owns all app state
│   │   └── hooks/
│   │       └── use-graph-index-refs.ts  # O(1) node/link index maps as refs
│   ├── diagram-canvas/       # GoJS sync logic: selection, name patch, model changes
│   ├── diagram-wrapper/      # GoJS diagram initialization (runs once)
│   ├── side-panel/           # Composes NodeList + PropertiesPanel
│   ├── node-list/            # MUI list with React.memo rows
│   ├── node-row/             # Memoized row; primitive props only
│   ├── properties-panel/     # Editable name, read-only type, placeholder
│   └── drawer/               # Responsive MUI Drawer
├── App.tsx                   # MUI ThemeProvider + GraphEditor root
└── app.integration.test.tsx  # Integration tests
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| `GraphEditor` | Owns all state (`nodes`, `links`, `selectedId`, `namePatch`, `open`). Passes slices down as props. |
| `DiagramWrapper` | Initializes the GoJS `Diagram` once via `useEffect([], [])`. Defines node/link templates, tools, and listeners. Never re-created on re-render. |
| `DiagramCanvas` | Holds a ref to the `DiagramWrapper` instance. Three `useEffect` hooks patch the GoJS model when React state changes (selection, name patch, node/link arrays). |
| `SidePanel` | Thin shell composing `NodeList` and `PropertiesPanel`. |
| `NodeList` | Renders all 1000 rows. Each `NodeRow` is `React.memo`-wrapped with primitive props so unchanged rows skip reconciliation. |
| `PropertiesPanel` | Editable name field and read-only type. Shows a placeholder when nothing is selected. |
| `Drawer` | Wraps MUI `Drawer`. Switches between `persistent` (md and smaller) and `permanent` (lg+). |

### Data flow

React state is the single source of truth. GoJS is a controlled output.

**Canvas to side panel:**

```
GoJS event (node click, draw link, double-click)
  └─▶ handleModelChange / handleChangedSelection
        └─▶ setNodes / setLinks / setSelectedId
              └─▶ React re-render
                    └─▶ NodeList highlights row, scrolls to it
                    └─▶ PropertiesPanel populates
```

**Side panel to canvas:**

```
User interaction (row click, name edit)
  └─▶ setSelectedId / setNamePatch
        └─▶ React re-render
              └─▶ DiagramCanvas useEffect runs
                    └─▶ diagram.select() + diagram.centerRect()   (selection)
                    └─▶ diagram.model.setDataProperty()           (name patch)
```

GoJS never writes back after emitting an event. The `skipsDiagramUpdate` flag on `ReactDiagram` and the `suppressNextSelectionEventRef` ref guard against feedback loops.

---

## Key Decisions

### Efficient list rendering: `React.memo` + `content-visibility`

The spec forbids external virtualization libraries. The real bottleneck at 1000 items is React reconciliation: without intervention, each state change causes React to diff the entire list.

**Solution: solve it at the layer it lives.**

- `React.memo` on `NodeRow` — unchanged rows skip reconciliation entirely
- `onSelect` and `setSelectedFromList` are stable references (React state dispatchers) — no `useCallback` needed; unstable refs would silently defeat `memo`
- `node` prop is a stable object reference — the `nodes` array item is only replaced when that specific node is modified, so reference equality holds for all unaffected rows
- `isSelected` is a boolean computed per row — only the previously and newly selected rows change value and re-render
- `content-visibility: auto; contain-intrinsic-size: 0 48px` on each row — browser skips paint and layout for off-screen items (~93% global support)

**Approaches considered:**

| Approach | Why not chosen |
|---|---|
| `react-window` / `react-virtual` | Spec forbids external virtualization libraries |
| Hand-rolled windowing | Functionally equivalent to reimplementing `react-window`; more complex to maintain |
| `IntersectionObserver` lazy mount | Doesn't solve React reconciliation cost — placeholders still mount |
| Pagination | Changes UX from a continuous scrollable list |

**Trade-off of skipping windowing:**

- All 1000 DOM nodes are mounted at once. Windowing would reduce that to the visible slice (~20-30 rows), so memory and initial mount time would scale with viewport size rather than list length.
- `React.memo` eliminates the reconciliation cost on updates; `content-visibility: auto` skips paint and layout for off-screen rows. The DOM nodes still exist, but render cost is contained.
- At 1000 items the trade-off is acceptable. Hand-rolled windowing adds real complexity: scroll position tracking, visible range computation, placeholder height management for accurate scrollbar behavior. That complexity is not justified here but would become necessary at higher amount of nodes.

---

### Responsive side panel: persistent drawer for mobile view, not temporary

- **Temporary** drawer overlays the canvas — the two areas feel unrelated
- **Persistent** drawer slides in alongside the canvas — both surfaces stay visible

**Breakpoint behavior:**

| Screen | Drawer variant | Default state | Toggle button |
|---|---|---|---|
| `xs` – `md` (< 1200 px) | Persistent | Hidden | Visible |
| `lg`+ (≥ 1200 px) | Permanent | Always visible | Hidden |

- Toggle button hidden during the close transition; reappears only after `slotProps.transition.onExited` fires — prevents overlap between button and sliding panel
- Panel is `<aside>`, canvas is `<main>` — matches semantic intent

**Responsive switch: JS media query over CSS `display`**

- Initial approach rendered both drawer variants simultaneously and hid one with `display: none`. With 1000+ `NodeRow` items, this doubled the mounted DOM node count and increased memory and layout cost.
- Switched to `useMediaQuery` (MUI) so only one variant is mounted at a time. The other is unmounted entirely at the breakpoint boundary.
- **Trade-off:** `useMediaQuery` adds a JS `matchMedia` listener that re-renders on breakpoint change. The runtime cost is negligible compared to the DOM overhead of duplicating a 1000-item list.

---

### GoJS integration: hooks-first, then gojs-react

- **Phase 1 (hooks only):** `DiagramCanvas` rendered a plain `<div ref={divRef} />`. A single `useEffect` with empty deps instantiated `go.Diagram` directly, defined templates, wired `addDiagramListener("ChangedSelection", ...)`, and loaded initial data — all in one block. A single `isUpdatingFromDiagram` ref guarded both feedback-loop scenarios. Separate effects handled name patching and selection sync.
- **Phase 2 (gojs-react):** Replaced the raw `<div>` with `<ReactDiagram>`. `onModelChange` (delivers structured `IncrementalData`) and `onChangedSelection` replaced the imperative listener calls. The single loop-guard ref was split into two targeted guards: `skipsDiagramUpdate` (state prop, prevents `ReactDiagram` from re-ingesting data it just emitted) and `suppressNextSelectionEventRef` (ref, suppresses the synchronous `ChangedSelection` echo GoJS fires during `diagram.select()`).
- The core sync pattern — React state as source of truth, GoJS patched via `diagram.model.commit()` — did not change. The migration was a surface change in wiring, not architecture.

**Why gojs-react was the better fit:**

- `onModelChange` delivers structured `go.IncrementalData` (`insertedNodeKeys`, `insertedLinkKeys`) instead of raw GoJS events, which is the exact shape the sync logic needs.
- `skipsDiagramUpdate` must be state, not a ref, because `ReactDiagram` reads it as a prop. A ref mutation does not trigger a re-render, so the prop would never update and GoJS would not see the skip instruction.
- The single `isUpdatingFromDiagram` ref was too coarse to handle two distinct feedback-loop scenarios. The gojs-react version splits it into `skipsDiagramUpdate` (blocks `ReactDiagram` from re-ingesting model data) and `suppressNextSelectionEventRef` (suppresses the synchronous echo `ChangedSelection` GoJS fires during `diagram.select()`).
- Initialization and sync concerns were entangled in one large effect. The `gojs-react` component boundary made the split natural: `DiagramWrapper` owns initialization, `DiagramCanvas` owns sync.

---

### DiagramWrapper pattern: initialization separate from sync logic

Two components with distinct responsibilities:

- **`DiagramWrapper`** — owns GoJS initialization (`initDiagram`, listener setup). Runs once via `useEffect([], [])`. Never re-created on re-render.
- **`DiagramCanvas`** — owns React state and sync logic. Accesses the diagram instance via `diagramRef`. Three `useEffect` hooks patch the GoJS model when state changes (selection, name patch, node/link arrays).

---

### Canvas-driven node and link creation: GoJS built-in tools + `onModelChange`

- **Node creation** — `clickCreatingTool.archetypeNodeData` stamps a node on background double-click. No custom event listener needed.
- **Link creation** — `LinkingTool` activates on drag from a node's border. Requires `portId: ""` on the shape; without it GoJS does not recognize the shape as a port.
- `onModelChange` (via `go.IncrementalData`) fires after every model transaction. `handleModelChange` reads `insertedNodeKeys` / `insertedLinkKeys` and syncs new items into React state.
- `setSkipsDiagramUpdate(true)` set immediately after sync — prevents `ReactDiagram` from pushing the same data back into GoJS on the next render.
- Initial model load also fires `onModelChange`. Guard: if the id already exists in `prev`, return `prev` unchanged — prevents double-adding seed nodes.

---

### Undirected graph enforcement: `linkValidation`

`diagram.toolManager.linkingTool.linkValidation` calls `fromNode.findLinksBetween(toNode)`:

- Counts links in **both directions** — drawing B→A when A→B exists is rejected
- Self-links rejected in the same check
- No need to inspect link direction anywhere else in the codebase

---

### Selection sync: list scroll and canvas pan

**List scroll (canvas → list):**
- `NodeList` holds a `ref` on the MUI `<List>` and a `useEffect` on `selectedId`
- On change: queries `[data-node-id="${selectedId}"]`, calls `scrollIntoView({ block: "center" })`
- Scroll suppressed when selection originated from the list itself — `selectedFromList` state flag set in `NodeRow.onClick`, checked at the top of the effect

**Canvas pan (list → canvas):**
- `DiagramCanvas` calls `diagram.centerRect(node.actualBounds)` inside the `selectedId` effect
- Only reached when `skipsDiagramUpdate` is `false` (selection driven from React, not GoJS)

**Two-ref guard architecture** — prevents sync loops:

| Guard | Type | Set by | Read by | Purpose |
|---|---|---|---|---|
| `skipsDiagramUpdate` | state | `handleChangedSelection`, `handleModelChange` | `ReactDiagram` (prop) | Passed as prop to `ReactDiagram` to block re-applying `nodeDataArray` after GoJS-driven model mutations. |
| `suppressNextSelectionEventRef` | ref | `handleChangedSelection` (on canvas click), selection sync effect (before `diagram.select()`) | selection sync effect, `handleChangedSelection` | Prevents the selection effect from calling `diagram.select()` + `centerRect` when GoJS drove the selection, and suppresses the echo `ChangedSelection` GoJS fires synchronously during `diagram.select()`. |


---

### GoJS layout: ForceDirected, capped, then frozen

**Why ForceDirectedLayout:**

- The graph has no inherent hierarchy or flow. `ForceDirectedLayout` clusters related nodes naturally via link attraction and node repulsion — `TreeLayout`, `LayeredDigraphLayout`, and `CircularLayout` all assume structure that isn't present.
- Runs once on load, then node positions are frozen. Users can drag freely; the simulation does not re-run.

**Why `isVirtualized` was not enabled:**

- GoJS already culls off-screen nodes during canvas redraws natively. `isVirtualized` skips adding off-screen nodes to the model entirely, but requires managing explicit node bounds upfront and keeping them in sync on layout changes.
- At 1000 nodes, native culling is sufficient. `isVirtualized` is worthwhile at much larger graph sizes where even model overhead becomes a factor.

---

### Node and link state: arrays in state, index maps as refs

**Why `AppNode[]` / `AppLink[]` arrays, not `Map<string, T>` in state:**
- GoJS and `NodeList` both consume arrays — storing maps required a `useMemo` spread on every render per consumer
- Arrays in state means the data is already in the shape every consumer needs

**Why `useRef` for the index maps, not `useState` or module-level variables:**

| Option | Triggers re-render | Per-instance |
|---|---|---|
| `useState` | Yes | Yes |
| `useRef` | No | Yes |
| Module-level variable | No | No (shared across all instances) |

- Index maps are a derived lookup cache, not source-of-truth data — mutations should not trigger re-renders
- Module-level variables would be shared if `GraphEditor` is mounted more than once (tests, multi-panel layouts)

**O(1) lookups:** `nodes[nodeIndexRef.current.get(id)]` — same complexity as `Map.get`, no extra iteration.

**Trade-off: dual data structures**

- Arrays and index maps hold the same data in two forms. Every mutation (add node, rename) must update both, adding sync overhead on every write.
- The payoff is O(1) reads on every GoJS event (selection changes, model updates reference nodes by key). At 1000 nodes, `Array.find()` on each event is measurably slower.
- The alternative — arrays only with `Array.find()` — is simpler but trades read performance for write simplicity. At this scale the read cost dominates, so the dual structure is justified.

---

### Single source of truth: React state owns all data

- `nodes`, `links`, `selectedId` in `GraphEditor` are canonical — GoJS is a controlled output
- No separate GoJS-side model to sync manually; `NodeList` and `DiagramCanvas` both read from the same arrays
- Data flow is always unidirectional: GoJS event → React state setter → React render → GoJS patch

**Name edit sync: O(1) on the canvas, O(n) on the list**

Typing in the name field calls `handleNameChange(id, name)`, which:
1. Updates the `nodes` array in state — `NodeList` reflects the new name immediately
2. Sets `namePatch: { id, name }` — a dedicated `DiagramCanvas` effect calls `diagram.model.setDataProperty()`, patching only that one node in GoJS

- **Canvas update is O(1)** — `setDataProperty` touches a single node in the GoJS model
- **List update is O(n)** — React state requires an immutable array spread to update one element, producing a new array on every keystroke
- The overhead is negligible at 1000 nodes, and `React.memo` ensures only the affected row re-renders
- A state management library like Zustand could make the list update O(1) by storing nodes in a map and letting components subscribe to individual entries, but that complexity is not justified at this scale

Avoids the naive alternative (replacing the entire `nodeDataArray` on each keystroke), which would cause GoJS to rebuild all node visuals.

---

## Performance Notes

**Core Web Vitals:**

| Metric | Local | Deployed | Threshold | Notes |
|---|---|---|---|---|
| LCP | 0.58 s | 0.35 s | < 2.5 s ✓ | LCP element is a MUI `Typography` node — app shell text paints fast even though GoJS initializes after |
| CLS | 0 | 0 | < 0.1 ✓ | Diagram area has fixed dimensions in CSS, so the canvas slot is reserved before GoJS initializes and no layout shift occurs |
| INP | 120 ms | 48 ms | < 200 ms ✓ | Measured on name field keystrokes — the most demanding interaction (state update + `NodeRow` re-render + `diagram.model.setDataProperty()` on every key). |

**Runtime feel (manual + React Profiler):**

- Selection and name editing are instant with no perceptible hiccups.
- React Profiler confirms no unnecessary re-renders: on each keystroke only the single `NodeRow` being edited re-renders. All other rows are skipped by `React.memo`.

**Bundle size trade-offs:**

- Production build: ~1,424 KB minified, ~407 KB gzipped.
- Bundle visualizer shows two roughly equal halves: MUI + Emotion + React (~600 KB) and `gojs/release/go.mjs` (~800 KB).
- GoJS ships as a single monolithic file and cannot be tree-shaken. Its size is fixed regardless of how much of the API is used.
- MUI is already well tree-shaken — individual component files appear in the visualizer rather than a barrel import.
- Code-splitting GoJS via dynamic `import()` + `React.lazy` was considered. It would reduce initial parse time but not download size. For this app the diagram is the entire UI — GoJS is needed on every load — so the gain would be parse time only, not time-to-diagram. With a `modulepreload` hint the difference would be negligible. The current single-bundle approach is simpler and the trade-off is accepted.
- In a larger app where the GoJS diagram is one feature among many (e.g. behind a route), lazy-loading it would be a meaningful win — users who never visit the diagram page never pay the ~800 KB parse cost.

---

## Testing Approach

### Stack and configuration

| Concern | Choice | Reason |
|---|---|---|
| Runner | Jest 30 + ts-jest | Hard project requirement (NFR-7); Vitest and `bun test` explicitly excluded |
| Config file | `jest.config.cjs` | `"type": "module"` in `package.json` makes Node treat `.js` as ESM; `.cjs` avoids a parse error |
| TS config | `tsconfig.test.json` | Separate config with `module: "CommonJS"` and `moduleResolution: "node"` — the app tsconfig uses `"bundler"` resolution which breaks ts-jest |
| Canvas | `jest-canvas-mock` | GoJS uses `<canvas>` internally; jsdom has no canvas implementation |
| DOM matchers | `@testing-library/jest-dom` | Adds `toBeInTheDocument`, `toHaveValue`, etc. |

### Three layers of tests

**1. Unit tests** — deterministic functions and component branches

| File | Key cases |
|---|---|
| `graph-utils.test.ts` | 1000-node graph: exact count, unique IDs, valid link endpoints, no self-loops, no duplicate pairs, BFS connectivity, `n=0` edge case |
| `node-row/index.test.tsx` | Click calls `onSelect` with node ID and sets `selectedFromList` to `true` |
| `side-panel/index.test.tsx` | Placeholder when no selection; name field shows current name; typing calls `setNamePatch`; clearing field passes empty string |
| `drawer/index.test.tsx` | Responsive switch between persistent and permanent variants |
| `diagram-wrapper/index.test.tsx` | Defensive listener branch when no diagram is available |

**2. DiagramCanvas unit tests** — GoJS/React sync logic, using a scoped `DiagramWrapper` mock

| Case |
|---|
| All provided nodes rendered on load |
| `ClickCreatingTool` inserts a new node |
| Self-loop rejected by link validation |
| Duplicate link rejected |
| Valid link accepted and increments `diagram.links.count` |
| No crash when `selectedId` has no matching node |
| Selecting from React calls `diagram.select` + `diagram.centerRect`, then suppresses the echo `ChangedSelection` |
| Selection and name-patch effects return early when no diagram is mounted |

**3. Integration tests** (`app.integration.test.tsx`) — full `<App />` with a small mocked graph fixture

| Case |
|---|
| Drawer opens and closes via toggle button |
| Canvas selection highlights the correct `NodeList` row |
| Adding a canvas node appends its row to `NodeList` |
| Name edit in properties panel updates the diagram label |
| Drawing a link syncs the new link into React state |
| List row click selects the corresponding GoJS node and calls `centerRect` |
| After selecting then deselecting a node, creating a new node selects it in the list and scrolls to it |
| After creating a link, selecting a node on the canvas highlights its list row and scrolls to it |
| After creating a link, creating a new node selects it in the list and scrolls to it |

The last four cases target the `suppressNextSelectionEventRef` guard logic. The ref can silently latch into the wrong state under sequences involving model changes (link or node creation) followed by selection events. These tests verify that the guard resets correctly across those transitions so that selection sync remains accurate after each operation.

Key techniques:
- **GoJS instance access** — `go.Diagram.fromDiv()` retrieves the live diagram from the DOM
- **Timer flushing** — `jest.useFakeTimers()` + `jest.runOnlyPendingTimers()` lets GoJS finish initialization before assertions
- **Tool API** — tests drive GoJS via tool APIs and `diagram.select()`, not canvas pointer events (jsdom cannot simulate those)
- **Responsive checks** — `window.matchMedia` mocked for drawer behavior testing

### Coverage

```
Statements   : 98.43% (252/256)
Branches     : 87.50% (70/80)
Functions    : 98.00% (49/50)
Lines        : 98.74% (236/239)
```

Remaining branch gaps are defensive paths (`isAppNode`, `isAppLink`, `findNodeForKey`, `instanceof go.Diagram` checks) that are covered at the line level but not all false-branches are exercised in happy-path tests.

---

## Bug Journal

### Firefox-only node duplication on initial load (production)

**Symptoms** (Zen browser / Firefox, production only):
- Creating a new node via double-click showed "Node 0" in the properties panel instead of "New Node".
- Typing in the name field had no visible effect.
- The node list had 2001 entries instead of 1001.

**Root cause:**
- `nodeIndexRef` was initialized inside a `useEffect([], fn)` in `useGraphIndexRefs`.
- gojs-react's `ReactDiagram` is a class component. Its `componentDidMount` runs synchronously during the React commit phase, before any `useEffect` hooks fire.
- During `componentDidMount`, gojs-react calls `mergeNodeDataArray()` on the GoJS model, which fires `onModelChange`. At that point `nodeIndexRef.current` was still the empty `new Map()`, so the `has()` guard in `handleModelChange` failed for all 1000 seed nodes and each was appended to React state a second time.
- After duplication, `nodes` had 2000 entries. The `useGraphIndexRefs` effect then ran and rebuilt `nodeIndexRef` from the original 1000-node seed, giving `size === 1000`. When the user created a new node, the UUID was stored at index 1000 — but `nodes[1000]` was the duplicate of `n0` (name "Node 0"), not the new node.

**Why only Firefox:** Chrome (V8) and Firefox (SpiderMonkey) process React's scheduler `MessageChannel` messages at slightly different points in their event loops. On Chrome the timing happened to flush effects before gojs-react's initial model sync; on Firefox (SpiderMonkey) it did not. This is a scheduling race — `useEffect` only guarantees execution after the browser paints, not before `componentDidMount`.

**Why only production:** React Strict Mode (development only) double-invokes effects, re-populating `nodeIndexRef` before the second GoJS event pass and masking the race. The optimised production bundle exposed it.

**Fix:** replaced `useEffect`-based initialization with a synchronous lazy init pattern using an `isInitialized` sentinel ref, so the map is built during the render phase before `componentDidMount` can fire.

**Takeaway:** `useEffect([], fn)` is not safe for initializing data that a mounted class component's `componentDidMount` reads. Synchronous ref setup is required when mixing hook-based initialization with class-component libraries like gojs-react.

---

## AI Disclosure

- Most of the production code in this project was written with the assistance of Claude (Anthropic).
- All AI-generated code was thoroughly reviewed before being accepted. Where the output deviated from intent or best practice, it was corrected either by manual editing or by targeted follow-up prompting.
- The implementation was not generated in one shot. It was deliberately broken into phases, each planned independently before any code was written.
- The process started from the original assignment brief ([`docs/senior_frontend_assignment.pdf`](docs/senior_frontend_assignment.pdf)). A full PRD ([`docs/PRD.md`](docs/PRD.md)) was produced first to elicit and solidify all requirements before touching any code.
- From the PRD, a high-level implementation plan ([`docs/plan.md`](docs/plan.md)) was created. This divided the work into phases (scaffolding, UI shell, state wiring, canvas interactions, scale-up, tests, polish).
- Each phase was preceded by a more detailed step-by-step plan generated for that specific phase, which was then executed and reviewed incrementally.
- Deviations from the original plan that emerged during implementation were fed back into both the plan and the PRD, keeping those documents as the single source of truth throughout.

## What I'd Do Next

### Features

- **Delete and undo** — the graph deliberately prevents deletion and undo to avoid unexpected data loss during this iteration. Both are natural next additions once a confirmation or history mechanism is in place.
- **"Add node" button on selection** — double-clicking an empty canvas area is not discoverable for new users. A `+` button that appears when a node is selected would lower the learning curve significantly.
- **Node list search** — with 1000+ nodes, a filter input above the list would let users jump directly to a node by name instead of scrolling.
- **Linked nodes in properties panel** — the properties panel currently shows only the selected node's own fields. Displaying the list of directly connected nodes would give the user useful graph context without leaving the panel.
- **Minimap** — a small overview panel showing the full graph extent in a corner of the canvas. GoJS ships an `Overview` control that handles this with minimal setup. Becomes critical as the graph grows beyond what fits on a single screen.
- **Node persistence** — the current iteration has no backend by design, keeping the scope focused on the frontend problem. The natural next step would be storing the graph in a database so sessions are not lost on refresh. The data model (`AppNode`, `AppLink`) is already clean enough to serialize directly.

### Technical Improvements

- **Component folder structure** — as the app grows, a flat `components/` folder becomes hard to navigate. A better model would be a nested structure where a component's direct children live inside its own folder, or a feature-based folder structure grouping related components together.
- **Bun test** — the project uses Jest because it was a hard PRD requirement. Once the constraint is lifted, migrating to `bun test` (which is native to the Bun runtime and requires no extra configuration) would simplify the toolchain.
- **Zustand for state management** — React `useState` is sufficient for this scope, but as the app grows it introduces prop drilling and forces array spreading for targeted updates like name patches. Zustand would let components subscribe to only the slices they need.
- **Lazy-load GoJS** — GoJS is the largest dependency in the bundle. Splitting it into a dynamic import and loading it behind a `React.lazy` boundary would reduce the initial bundle size and improve time-to-interactive.
- **End-to-end tests with Playwright** — the Jest suite covers unit and integration logic well, but a Playwright test running against a real browser would catch GoJS rendering and layout issues that jsdom cannot simulate. It would also serve as a living spec for the acceptance criteria in the PRD.
- **Lighthouse CI** — adding a Lighthouse CI step to GitHub Actions would catch user-facing performance regressions (bundle size growth, slower paint) automatically on every PR. For React-specific regressions like unnecessary re-renders, this would be complemented by `why-did-you-render`, which logs unexpected component updates to the console and can be wired into tests.
- **Storybook with visual regression testing** — isolating components in Storybook makes it easier to develop and review UI states (empty list, selected row, placeholder panel, drawer open/closed). Pairing it with a visual regression tool like Chromatic would automatically flag unintended style changes on every PR.
- **Cross-browser CI** — the current CI only runs Jest in Node. Adding a Playwright job that runs the test suite against Chromium, Firefox, and WebKit would catch browser-specific GoJS rendering issues and canvas API inconsistencies before they reach production.
- **Deployment pipeline** — the project currently deploys manually. Adding a staging environment with an automated deployment triggered on every push to a `staging` branch would allow changes to be verified in a production-like environment before being promoted to the live site.
