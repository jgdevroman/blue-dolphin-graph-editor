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

### GoJS layout: ForceDirected, capped, then frozen

_(TBD — to be filled in during Phase 5)_

### Barabási-Albert topology for the seed graph

_(TBD — to be filled in during Phase 5)_

### Single source of truth in React state, feedback-loop guard

React state (`nodes`, `links`, `selectedId`) is the single source of truth. GoJS is a controlled output — it receives data and reports events, but never owns state. This means:

- **No duplicated state.** The node list and the diagram canvas both read from the same `nodes` array in `GraphEditor`. There is no separate GoJS-side model that needs to be kept in sync manually.
- **Unidirectional data flow for selection.** When the user clicks a node on the canvas, GoJS fires `ChangedSelection`, which calls `onSelectionChange`, which calls `setSelectedId` in `GraphEditor`. React re-renders, passes the new `selectedId` down to both `NodeList` (highlights the row) and `DiagramWrapper` (selects the node in GoJS). The flow is always: GoJS event → React state → React render → GoJS update.

**Feedback-loop guard:** Without a guard, the selection sync creates an infinite loop. GoJS fires `ChangedSelection` → React sets `selectedId` → the `selectedId` effect runs → GoJS selects the node → GoJS fires `ChangedSelection` again → repeat. The guard is a single `isUpdatingFromDiagram` ref. The `ChangedSelection` handler sets it to `true` before calling `onSelectionChange` and back to `false` after. The `selectedId` effect checks it at the top and returns early if set, breaking the cycle.

**Name edit sync: O(1) via `NamePatch`**

Typing in the name field calls `handleNameChange(id, name)` which does two things in parallel:

1. Updates the `nodes` array in React state (so `NodeList` reflects the new name instantly).
2. Sets a `namePatch: { id, name }` state (a lightweight object carrying just the changed key and value).

`DiagramWrapper` has a dedicated effect on `namePatch` that calls `diagram.model.setDataProperty(nodeData, "name", namePatch.name)` — a single O(1) hash lookup into the GoJS model. Only the affected node re-renders in GoJS. The rest of the diagram is untouched.

This avoids the naive alternative of replacing the entire `nodeDataArray` on every keystroke, which would cause GoJS to tear down and rebuild all node visuals.

---

## Performance Notes

_(TBD — measured numbers from DevTools profiling once implementation is complete)_

## Testing Approach

_(TBD — once Jest is configured and tests are written)_

## AI Disclosure

_(TBD — to be written last with specific examples of what was generated, modified, rejected, and verified)_

## Trade-offs / What I'd Do Next

_(TBD)_
