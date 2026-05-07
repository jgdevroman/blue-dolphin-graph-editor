# BlueDolphin Diagram Editor

A diagram editor for visualizing and managing large node networks. Built with React, TypeScript, GoJS, MUI, and Jest.

> **Status**: in progress. Sections marked _(TBD)_ will be filled in as the implementation progresses through the phases described in `docs/plan.md`.

---

## Quick Start

_(TBD — install / dev / test commands once the project is scaffolded)_

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

| Approach | Why I considered it | Why I didn't pick it |
| --- | --- | --- |
| **`react-window` / `react-virtual`** | Industry standard, well-tested | Spec forbids external virtualization libraries |
| **Hand-rolled windowing (custom scroll math)** | Solves both DOM size and React reconciliation | Functionally equivalent to reimplementing `react-window`. The exercise is "make React efficient at 1000 items," not "write a virtualization library." `memo` + `content-visibility` is the more idiomatic React answer. |
| **`IntersectionObserver` lazy mount** | Native browser API | Doesn't solve the React reconciliation cost — placeholders still mount |
| **Pagination** ("Load more" / page N of M) | Trivial to implement, solves perf | Changes UX from "scrollable list" the spec implies |
| **`React.memo` + `content-visibility` ✅** | Solves the actual bottleneck (reconciliation) at the right layer; lets the browser handle paint natively | — |

**Performance characteristics:**

| Operation | Cost |
|---|---|
| Initial mount of 1000 rows | ~150-300 ms (hidden behind the same loading state as the GoJS ForceDirected layout — user perceives one delay, not two) |
| Selection change | <5 ms (only the previously-selected and newly-selected rows re-render) |
| Name edit on selected row | <5 ms (only that row re-renders) |
| Adding a node | <5 ms (999 rows skip via `memo`) |
| Scroll | 60 fps (browser skips paint for off-screen rows via `content-visibility`) |

**The discipline this requires:** `React.memo` is silently defeated by any unstable prop reference. Every callback handed to a row must be wrapped in `useCallback` with stable deps, and the row component must receive primitives, not objects. This is verifiable in the React DevTools Profiler — a name edit should highlight a single row, not the whole list.

### GoJS layout: ForceDirected, capped, then frozen

_(TBD — to be filled in during Phase 5)_

### Barabási-Albert topology for the seed graph

_(TBD — to be filled in during Phase 5)_

### Single source of truth in React state, feedback-loop guard

_(TBD — to be filled in during Phase 3)_

---

## Performance Notes

_(TBD — measured numbers from DevTools profiling once implementation is complete)_

## Testing Approach

_(TBD — once Jest is configured and tests are written)_

## AI Disclosure

_(TBD — to be written last with specific examples of what was generated, modified, rejected, and verified)_

## Trade-offs / What I'd Do Next

_(TBD)_
