# BlueDolphin Diagram Editor

A diagram editor for visualizing and managing large node networks. Built with React, TypeScript, GoJS, MUI, and Jest.

> **Status**: in progress. Sections marked _(TBD)_ will be filled in as the implementation progresses through the phases described in `docs/plan.md`.

---

## Quick Start

```bash
bun install      # or: npm install
bun run dev      # or: npm run dev
bun run test     # or: npm test  (Phase 6 — not yet configured)
```

## Tech Stack

| Concern              | Choice                        | Notes                                                                                               |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Bundler / dev server | Vite + `@vitejs/plugin-react` | Oxc-based plugin; simpler default over the SWC variant, no meaningful perf difference at this scale |
| Language             | TypeScript 6 strict mode      | Enabled by default in the `react-ts` Vite template                                                  |
| Diagram engine       | GoJS 3 (trial)                | Watermark visible; no license required for this assignment                                          |
| UI components        | MUI 9 + Emotion               | Side panel, buttons, and layout primitives                                                          |
| Package manager      | Bun                           | Faster installs; fully compatible with npm (`npm install && npm run dev` also works)                |
| Linter / formatter   | Biome                         | Single tool replacing ESLint + Prettier; zero config, fast, TypeScript-aware                        |
| Test runner          | Jest + ts-jest                | Required by the assignment spec (added in Phase 6)                                                  |

**React Compiler — skipped.** The compiler is designed for codebases that haven't manually applied `memo`/`useCallback`. This project does the opposite: explicit `React.memo` and stable callbacks are a deliberate architecture choice that demonstrates the optimization reasoning. Enabling the compiler on top would make that reasoning invisible.

## CI

A GitHub Actions workflow runs on every push to `main` and on every push to a pull request targeting `main`. The pipeline must pass before merging:

1. **Install** — `bun install --frozen-lockfile`
2. **Lint** — `biome check .` (formatting + lint rules)
3. **Build** — `tsc -b && vite build` (type check + bundle)

To enforce this as a merge gate, enable branch protection on `main` in GitHub Settings and require the `check` status to pass.

## Architecture

_(TBD — folder map and sync pattern diagram once components are in place)_

---

## Key Decisions

### Efficient list rendering: `React.memo` + `content-visibility`, not custom windowing

The spec says "efficient rendering (no external virtualization libraries)." That rules out `react-window` and friends, but it doesn't require us to write our own. The interesting question is: what's the actual bottleneck at 1000 items, and where does it live?

**The actual bottleneck is React reconciliation, not browser scroll.** Every time the `nodes` array changes (selection sync from canvas, adding a node, editing a name), React walks the entire list to diff. Without intervention that's a ~30-80 ms pause per interaction. Browser paint of 1000 small `<li>` elements is comparatively cheap.

So the design solves the problem at the layer it lives:

- **React layer**: `React.memo` on the row component so unchanged rows skip reconciliation entirely. Stable callbacks (`useCallback`) so prop equality holds. Row props are primitives only (`id`, `name`, `isSelected`) — never the full `nodes` array.
- **Browser layer**: `content-visibility: auto; contain-intrinsic-size: 0 48px` on each row so the browser skips paint and layout for off-screen items. ~93% global support as of 2026.

**Approaches considered:**

| Approach                                       | Why I considered it                                                                                      | Why I didn't pick it                                                                                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`react-window` / `react-virtual`**           | Industry standard, well-tested                                                                           | Spec forbids external virtualization libraries                                                                                                                                                                          |
| **Hand-rolled windowing (custom scroll math)** | Solves both DOM size and React reconciliation                                                            | Functionally equivalent to reimplementing `react-window`. The exercise is "make React efficient at 1000 items," not "write a virtualization library." `memo` + `content-visibility` is the more idiomatic React answer. |
| **`IntersectionObserver` lazy mount**          | Native browser API                                                                                       | Doesn't solve the React reconciliation cost — placeholders still mount                                                                                                                                                  |
| **Pagination** ("Load more" / page N of M)     | Trivial to implement, solves perf                                                                        | Changes UX from "scrollable list" the spec implies                                                                                                                                                                      |
| **`React.memo` + `content-visibility` ✅**     | Solves the actual bottleneck (reconciliation) at the right layer; lets the browser handle paint natively | —                                                                                                                                                                                                                       |

**Performance characteristics:**

| Operation                  | Cost                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Initial mount of 1000 rows | ~150-300 ms (hidden behind the same loading state as the GoJS ForceDirected layout — user perceives one delay, not two) |
| Selection change           | <5 ms (only the previously-selected and newly-selected rows re-render)                                                  |
| Name edit on selected row  | <5 ms (only that row re-renders)                                                                                        |
| Adding a node              | <5 ms (999 rows skip via `memo`)                                                                                        |
| Scroll                     | 60 fps (browser skips paint for off-screen rows via `content-visibility`)                                               |

**The discipline this requires:** `React.memo` is silently defeated by any unstable prop reference. Every callback handed to a row must be wrapped in `useCallback` with stable deps, and the row component must receive primitives, not objects. This is verifiable in the React DevTools Profiler — a name edit should highlight a single row, not the whole list.

### Responsive side panel: persistent drawer, not temporary

The side panel uses MUI's persistent drawer variant on small screens rather than temporary (modal). A temporary drawer overlays the canvas; a persistent one slides in and the canvas adjusts alongside it. This keeps the canvas visible and avoids the overlay pattern that makes the two areas feel unrelated.

**Breakpoint behavior:**

| Screen | Drawer variant | Panel width | Canvas |
|--------|---------------|-------------|--------|
| `xs` (< 600 px) | Persistent | `100vw` — full screen | Hidden behind panel when open |
| `sm` – `md` (600 – 900 px) | Persistent | 320 px fixed | Remains visible |
| `md`+ (> 900 px) | Permanent | 320 px fixed | Always alongside panel |

The toggle button is hidden while the drawer is closing and only reappears once the exit transition finishes (`slotProps.transition.onExited`), avoiding a jarring overlap between the button and the sliding panel.

The panel is wrapped in `<aside>` rather than being placed inside `<main>`. It is supplementary to the canvas (not primary content), which matches the semantic intent of `<aside>`. The canvas itself lives in `<main>`.

### DiagramWrapper pattern: initialization separate from UI logic

`DiagramWrapper` follows the same component split used in the official `gojs-react-basic` example. The wrapper owns everything that only needs to run once: `initDiagram` (the GoJS diagram factory) and the `ChangedSelection` listener setup, both in effects with `[]` deps. `DiagramCanvas` sits above it and owns the React state and business logic, accessing the diagram instance through the `diagramRef` prop it passes down. This keeps GoJS initialization concerns out of the stateful layer and makes both components easier to reason about in isolation.

### Canvas-driven node and link creation: GoJS built-in tools, synced via `onModelChange`

Node and link creation is handled entirely by GoJS built-in tools, not by React event handlers:

- **Node creation** — `clickCreatingTool.archetypeNodeData` stamps a node into the GoJS model on background double-click. No custom event listener is needed.
- **Link creation** — the `LinkingTool` activates automatically when the user drags from a node's border. This requires `portId: ""` on the shape; without it, GoJS does not recognize the shape as a port and the tool never starts.

GoJS fires `onModelChange` (via `go.IncrementalData`) after every model transaction. `DiagramCanvas.handleModelChange` reads `insertedNodeKeys` / `insertedLinkKeys` and the accompanying `modifiedNodeData` / `modifiedLinkData` to sync new items into React state. `setSkipsDiagramUpdate(true)` is set immediately after so ReactDiagram does not push the same data back into GoJS on the following re-render.

The `onModelChange` also fires during the initial model load when ReactDiagram first seeds GoJS with the `nodeDataArray` prop. Without a guard this would double-add all seed nodes. The fix is an existence check in the updater: if the id is already in `prev`, return `prev` unchanged.

### Undirected graph enforcement: `linkValidation` on the `LinkingTool`

`diagram.toolManager.linkingTool.linkValidation` is set to a function that calls `fromNode.findLinksBetween(toNode)`. This method counts links in both directions, so attempting to draw B→A when A→B already exists is rejected. Self-links (same node as source and target) are also rejected in the same check. This keeps the graph undirected without needing to inspect link direction at all.

### Selection sync: scroll-to-node in list and canvas jump

Selecting a node from either the side panel list or the canvas keeps the other surface in sync. Two separate behaviors are involved: scrolling the list row into view, and panning the canvas to center on the node.

**List scroll on selection**

`NodeList` holds a `ref` on the MUI `<List>` element and a `useEffect` on `selectedId`. When `selectedId` changes the effect queries `[data-node-id="${selectedId}"]` inside the list and calls `scrollIntoView({ block: "center" })`. The `data-node-id` attribute is set on each `NodeRow`'s `<ListItem>`.

The scroll is suppressed when the selection originated from the list itself (clicking a row). A `selectedFromList` state flag is set in the row's `onClick` and checked at the top of the effect. Using state rather than a ref here means the flag read is correctly captured in the effect closure; the flag is reset on every effect run regardless of path.

**Canvas pan on panel selection**

`DiagramCanvas` calls `diagram.centerRect(node.actualBounds)` inside the `selectedId` effect when syncing React state into GoJS. This is only reached when `skipsDiagramUpdate` is `false`, meaning the selection was driven from React (the panel), not from a canvas click. Canvas-click selections set `skipsDiagramUpdate = true` in `handleChangedSelection`, which causes the effect to return early before reaching `centerRect`.

**Two-ref guard architecture**

The two-way sync between React and GoJS requires two separate guards. They serve opposite directions and have different timing constraints:

| Guard | Type | Set by | Read by | Purpose |
|---|---|---|---|---|
| `skipsDiagramUpdate` | state | `handleChangedSelection`, `handleModelChange` | selection sync effect | Prevents `centerRect` from running when GoJS drove the selection. Also passed as prop to `ReactDiagram` to prevent it from re-applying `nodeDataArray` back into GoJS after model mutations. |
| `suppressNextSelectionEventRef` | ref | selection sync effect (before `diagram.select()`) | `handleChangedSelection` | Suppresses the echo `ChangedSelection` event GoJS fires synchronously during `diagram.select()`, which would otherwise set `skipsDiagramUpdate = true` and corrupt the next panel selection. |

`suppressNextSelectionEventRef` must be a ref, not state, because GoJS fires `ChangedSelection` synchronously inside the `diagram.select()` call, before the current effect returns. Any state update set before `diagram.select()` would not be visible in the handler's closure at that moment.

`skipsDiagramUpdate` must remain state because it is passed as a prop to `ReactDiagram`. A ref change does not trigger a re-render, so `ReactDiagram` would never see the updated value and would re-apply `nodeDataArray` into GoJS after every model mutation, causing duplicate nodes and links.

**The double-fire bug and why `skipsDiagramUpdate` is not a dependency of the selection effect**

The selection sync effect depends only on `selectedId`, not on `skipsDiagramUpdate`. If `skipsDiagramUpdate` were in the dependency array, removing it from the array would cause the effect to fire twice on every canvas click: once when `selectedId` changes (sees `skipsDiagramUpdate = true`, resets it, returns early), then again when `skipsDiagramUpdate` resets to `false` (now falls through to `diagram.select()` and `centerRect`). The biome exhaustive-deps rule is suppressed with an explanation at the call site.

---

### GoJS layout: ForceDirected, capped, then frozen

_(TBD — to be filled in during Phase 5)_

### Barabási-Albert topology for the seed graph

_(TBD — to be filled in during Phase 5)_

### Node and link state: arrays in state, index maps as refs

`nodes` and `links` in `GraphEditor` are `AppNode[]` and `AppLink[]` arrays. Alongside them, two `useRef<Map<string, number>>` refs (`nodeIndexRef`, `linkIndexRef`) map each id to its position in the array.

**Why arrays in state, not `Map<string, T>`**

The initial implementation stored nodes and links as `Map<string, AppNode>` and `Map<string, AppLink>` in React state. GoJS and `NodeList` both need arrays, so every render that consumed the data ran `useMemo(() => [...nodes.values()], [nodes])` to convert — one spread per consumer per state change. With arrays in state, those conversions disappear entirely. The data is already in the shape every consumer needs.

**Why `useRef` for the index maps, not state or module-level variables**

Three options were considered:

| Option | Triggers re-render | Per-instance |
|---|---|---|
| `useState` | Yes | Yes |
| `useRef` | No | Yes |
| Module-level variable | No | No (shared across all instances) |

The index maps are a derived lookup cache, not source-of-truth data. Mutating them should not trigger re-renders. Module-level variables would be shared if `GraphEditor` were ever mounted more than once (tests, multi-panel layouts). `useRef` gives per-instance mutable storage that is invisible to React's render cycle.

**O(1) lookups**

Operations that previously needed `map.get(id)` now use `nodes[nodeIndexRef.current.get(id)]` — still O(1). For insertions, the index map is appended with the new item's position (`prev.length`) inside the state updater before returning the new array. For deletions (not yet implemented), a full index rebuild via `refreshNodeIndex`/`refreshLinkIndex` is in place.

### Single source of truth in React state, feedback-loop guard

React state (`nodes`, `links`, `selectedId`) is the single source of truth. GoJS is a controlled output — it receives data and reports events, but never owns state. This means:

- **No duplicated state.** The node list and the diagram canvas both read from the same `nodes` array in `GraphEditor`. There is no separate GoJS-side model that needs to be kept in sync manually.
- **Unidirectional data flow for selection.** When the user clicks a node on the canvas, GoJS fires `ChangedSelection`, which calls `onSelectionChange`, which calls `setSelectedId` in `GraphEditor`. React re-renders, passes the new `selectedId` down to both `NodeList` (highlights the row) and `DiagramWrapper` (selects the node in GoJS). The flow is always: GoJS event → React state → React render → GoJS update.

**Feedback-loop guard:** Without a guard, the selection sync creates an infinite loop. GoJS fires `ChangedSelection` → React sets `selectedId` → the `selectedId` effect runs → GoJS selects the node → GoJS fires `ChangedSelection` again → repeat. The guard is a single `isUpdatingFromDiagram` ref. The `ChangedSelection` handler sets it to `true` before calling `onSelectionChange` and back to `false` after. The `selectedId` effect checks it at the top and returns early if set, breaking the cycle.

**Name edit sync: O(1) via `NamePatch`**

Typing in the name field calls `handleNameChange(id, name)` which does two things in parallel:

1. Updates the `nodes` array in React state (so `NodeList` reflects the new name instantly).
2. Sets a `namePatch: { id, name }` state (a lightweight object carrying just the changed key and value).

`DiagramCanvas` has a dedicated effect on `namePatch` that calls `diagram.model.setDataProperty(nodeData, "name", namePatch.name)` — a single O(1) hash lookup into the GoJS model. Only the affected node re-renders in GoJS. The rest of the diagram is untouched.

This avoids the naive alternative of replacing the entire `nodeDataArray` on every keystroke, which would cause GoJS to tear down and rebuild all node visuals.

**Investigation: blocking ReactDiagram's `shouldComponentUpdate` during name patches**

An attempt was made to add `skipsDiagramUpdate || namePatch !== null` when passing `skipsDiagramUpdate` to `ReactDiagram`, reasoning that if a targeted patch was already handling the GoJS update, the full `mergeData` path via `shouldComponentUpdate` could be skipped. This was rejected for two reasons:

1. `namePatch !== null` is too broad — it would block ReactDiagram from updating for any reason while a patch is pending, including legitimate unrelated changes.
2. `ReactDiagram.shouldComponentUpdate` already guards against redundant syncs by comparing `nodeDataArray` and `linkDataArray` by reference. The `mergeData` call that follows is fast when GoJS's internal model already reflects the change from the targeted patch. React DevTools profiling confirmed no unnecessary re-renders were occurring without the extra guard.

Separately, clearing `namePatch` to `null` after each effect (via `setNamePatch(null)`) was also tried and rejected. It caused the namePatch effect to fire a second time with `null` as the value — an extra render and effect call with no benefit since the effect already guards with `if (!namePatch) return`.

**Selection deferral: `startTransition` on canvas-driven selection**

When the user clicks a node in the GoJS canvas, `handleChangedSelection` wraps `setSelectedId` in `startTransition`. The canvas selection highlight is handled by GoJS itself synchronously. The `selectedId` state update, which triggers `NodeList` to re-render and highlight the corresponding row, is lower priority and can be deferred. This keeps the canvas interaction feeling immediate even while 1000 list rows reconcile in the background.

---

## Performance Notes

_(TBD — measured numbers from DevTools profiling once implementation is complete)_

## Testing Approach

_(TBD — once Jest is configured and tests are written)_

## AI Disclosure

_(TBD — to be written last with specific examples of what was generated, modified, rejected, and verified)_

## Trade-offs / What I'd Do Next

_(TBD)_
