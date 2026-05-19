# Interview Prep — Blue Dolphin Senior Frontend

## Overall framing

The interviewer said it explicitly: "we're not looking for you to have fixed the code — we want to understand how you reason about the tradeoffs." Strong candidates do three things:

- Own the gap before they prosecute it. "You're right, content-visibility isn't virtualization — here's why I shipped it anyway, here's when it breaks, here's what I'd do next." Don't get defensive.
- Quantify. Numbers beat adjectives. "1000 rows × ~48px = 48k DOM nodes, ~X MB of layout state, first paint cost Y ms on my MacBook." If you don't have measurements, say so and propose how you'd get them.
- Show you know the failure modes of the "correct" answer too. Anyone can say "use react-window." A senior engineer says "windowing breaks Ctrl+F, screen-reader row counts, anchor scrolling, and complicates the scrollIntoView I already wrote."

---

## 1. Side panel virtualization

**What you actually did:** all 1000 `<ListItem>`s mount on render in `node-list/index.tsx`, each with `content-visibility: auto` + `contain-intrinsic-size: 0 48px` in `node-row/index.tsx`. Memoized rows with `React.memo` keep re-renders cheap.

**Own it honestly:**

- `content-visibility` skips paint and layout for off-screen rows, but the DOM nodes, React fibers, MUI style objects, and event-listener bindings all exist. At 1000 it's fine. At 50k it dies.
- Selection updates still walk every row (each `NodeRow` gets a new `isSelected` boolean), so React's reconciler does O(n) work on every select. `memo` saves the render, not the diff.

**True virtualization tradeoffs:**

| Approach | Wins | Costs |
|---|---|---|
| Fixed-height windowing (what `react-window` does) | O(viewport) DOM, O(viewport) reconciliation | Ctrl+F finds nothing, screen-reader row count lies, anchor links break, scrollbar UX off if heights vary |
| Variable-height + measured cache | Handles real content | Need a measurement pass, layout thrash on resize, eviction policy |
| `content-visibility: auto` (yours) | Zero JS, native browser, Ctrl+F still works for visible-after-scroll | Doesn't help reconciliation, doesn't help initial mount cost, Safari support |
| Hybrid: paginate/chunk + `content-visibility` inside chunks | Best of both | More code |

**If asked about implementation approaches — scroll event vs IntersectionObserver:**

### Option A: Scroll event listener (recommended for this case)

How it works:

```
onScroll fires
  → read container.scrollTop
  → startIndex = floor(scrollTop / ROW_HEIGHT) - OVERSCAN
  → endIndex   = ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
  → render nodes.slice(startIndex, endIndex)
  → top spacer div: height = startIndex * ROW_HEIGHT
  → bot spacer div: height = (nodes.length - endIndex) * ROW_HEIGHT
```

The spacer divs preserve scrollbar geometry so the browser thinks all rows exist. The rendered DOM stays constant at roughly `(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN` nodes regardless of total count.

Key implementation details:

- Attach scroll listener once on mount. Use a `ref` to store latest `scrollTop` — reading from state on every scroll event causes stale closures.
- Skip `requestAnimationFrame` throttling. The window compute is O(1) — two divisions and a slice range. rAF adds the stale-read bug (rAF fires with the position from the first event, not the last) for no measurable gain. Only add it if profiling shows actual jank.
- `ResizeObserver` on the container captures the initial `clientHeight` and updates it if the panel is resized (mobile, browser resize). Recompute the window on each resize.
- Scroll-to-selected becomes one assignment: `container.scrollTop = index * ROW_HEIGHT - containerHeight / 2 + ROW_HEIGHT / 2`. Update `windowStart` state immediately after so the target row is mounted before the browser paints — no flash.

Failure modes to name:

- Ctrl+F / browser find won't match off-screen text — rows aren't in the DOM.
- Screen readers will report the slice count, not the total. Fix: `aria-rowcount={nodes.length}` on the list, `aria-rowindex={startIndex + i + 1}` on each rendered row.
- If `ROW_HEIGHT` ever varies (name wraps to two lines), spacer math breaks and rows misalign. Keep rows at a fixed height or move to measured caching.

### Option B: IntersectionObserver sentinels

How it works:

```
render:
  <div ref={topSentinelRef} />         ← IO watches this
  {nodes.slice(start, end).map(NodeRow)}
  <div ref={bottomSentinelRef} />      ← IO watches this

onIntersect(entry):
  if entry.target === bottomSentinel → shift window down by OVERSCAN
  if entry.target === topSentinel    → shift window up by OVERSCAN
```

Wins:

- No scroll event listener. The observer runs off the main thread and notifies only when a boundary is crossed, so there's no per-frame compute cost.
- Naturally accommodates variable-height rows — no `ROW_HEIGHT` constant needed because the sentinel position is driven by actual layout, not arithmetic.

Costs:

- Async by design. The observer fires after the browser has already painted. On fast scrolls there is a visible blank gap between the old window edge and the new one. This is why react-window does not use IntersectionObserver.
- Scroll-to-selected is two async steps: shift the window to include the target index, wait for React to re-render, then set `scrollTop`. You can't do it in one synchronous assignment.
- Edge cases: when the list is shorter than the viewport both sentinels are always visible, causing the window to continuously shift. Requires a guard on total vs visible count.
- More moving parts: two sentinel refs, observer lifecycle, re-observe after each window shift, cleanup on unmount.

**Comparison table:**

| | Scroll event | IntersectionObserver |
|---|---|---|
| Update timing | Synchronous with scroll | Async, fires after paint |
| Blank flash on fast scroll | None | Yes |
| Fixed-height rows | Perfect fit | Overkill |
| Variable-height rows | Breaks without measurement | Natural fit |
| Scroll-to-selected | One line | Two async steps |
| Main-thread cost | Per-frame compute (throttled) | Only on boundary cross |
| Recommendation | Yes, for this case | No |

**The senior move:** "I'd build it myself per the PRD constraint. Scroll-event windowing with `requestAnimationFrame` throttling, `paddingTop`/`paddingBottom` spacers for scrollbar geometry, and a `ResizeObserver` for panel resizes. Fixed-height first because `ListItemText` with name + type is bounded. The interesting integration point is `node-list/index.tsx:25` — my `scrollIntoView` for selected nodes has to become a `scrollTo(index * rowHeight)` that also updates `windowStart` state immediately so the target row is mounted before the browser paints."

**Accessibility angle that buys real credit:** "Virtualized lists need `aria-rowcount` on the container and `aria-rowindex` on each row, otherwise screen readers report the wrong total. That's a thing most candidates won't bring up."

---

## 2. TypeScript strict mode

This one is awkward because the README claim is wrong. Front-foot it:

> "Yeah, that's a real miss in the README. `tsconfig.app.json` has the strict-adjacent flags (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`) but not `"strict": true`. I should have either turned it on or corrected the README — shipping a doc that overstates what the config does is worse than the missing flag."

Then pivot to the substance:

- **What `strict` actually enables:** `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`, `useUnknownInCatchVariables`, `noImplicitThis`.
- **The two that bite in this codebase specifically:**
  - `strictNullChecks` would catch the `nodes[nodeIndexRef.current.get(id) ?? -1]` pattern in `side-panel/index.tsx:33` — `nodes[-1]` is `undefined` at runtime but TS without strict won't flag it.
  - `noImplicitAny` would force typing the GoJS callbacks instead of relying on inference from `go.ObjectData`.
- **Production stance:** "Strict on from day one, full stop. The cost is paid once at setup, the benefit compounds. The only place I'd negotiate is `exactOptionalPropertyTypes` because it's noisy with React prop spreads."
- **Migration playbook if asked:** Turn on `strict` → fix `--noEmit` errors file-by-file → add `// @ts-expect-error` with a ticket reference for legitimate deferrals → CI blocks new strict errors via `tsc --noEmit` in pre-commit.

---

## 3. Test coverage of real user flows

The integration tests call `diagram.select(node)`, `tool.insertPart(...)`, `linkingTool.insertLink(...)` — they test the GoJS API contract, not user behavior. A user never clicks `tool.doActivate()`.

**Own it cleanly:**

> "The core integration tests drive GoJS directly — `tool.insertPart`, `model.addLinkData` — which validates the sync wiring between GoJS and React state. That was the highest-risk area. On top of that we have Robot tests: the double-click test is fully faithful because `ClickCreatingTool` activates through the real ToolManager path with no stubs. The drag test exercises the LinkingTool wiring but has to stub `findPartAt` because jsdom has no real canvas geometry — so a regression in port hit-detection wouldn't be caught. For that last gap you need jest-puppeteer or Playwright against a real browser."

**Why the main test suite doesn't use Robot:**

Three concrete reasons, not a gap we missed:

1. **The GoJS npm package doesn't ship extensions.** `node_modules/gojs/release/` contains only the compiled library. There is no `extensions/Robot.ts` to copy — we had to write it from scratch against the type definitions. That's non-trivial vendored code that needs to be maintained across GoJS upgrades.

2. **Robot doesn't close the drag coverage gap.** For the double-click case, `tool.insertPart()` in the existing tests exercises the exact same code path (`ClickCreatingTool` inserting a node into the model) with no extra setup. Robot adds nothing there. For the drag case, Robot in jsdom still requires three manual workarounds because `findPartAt` always returns null — the test ends up being a wiring test with stubs, not a user-flow test. The workarounds are in `robot.demo.test.tsx` as a demonstration.

3. **The highest-risk area was always the sync wiring, not the input path.** The real danger was GoJS model changes not propagating to React state, or React state re-renders corrupting the GoJS model. The programmatic API tests cover that precisely and deterministically. A Robot-driven test would exercise the same wiring through more machinery, adding noise without adding signal for that specific risk.

**What real user-flow tests would need:**

- **GoJS Robot** for canvas (the PRD-mentioned extension at `node_modules/gojs/extensions/Robot.ts`). It dispatches synthetic `mousedown`/`mousemove`/`mouseup` at canvas coordinates. That's how you'd test "user double-clicks background → node appears."
- **Playwright or Cypress component tests** for the truth. jsdom has no canvas, no real layout, no real hit testing. The integration test for "drag from node A's port to node B's port creates a link" is fundamentally a browser test — you need real coordinates, real pointer capture, and real GoJS hit-testing against laid-out geometry.
- **Testing pyramid argument:** Jest stays for pure logic (graph utils, reducers, the model-change handler in isolation). Browser-level E2E covers the canvas interactions GoJS owns. Don't try to make jsdom do something it can't.

**GoJS Robot in Jest vs real browser — concrete tradeoffs (from actually building it):**

| | Robot in Jest (jsdom) | Robot in real browser (Playwright/Cypress) |
|---|---|---|
| `dblClick` → node created | Works. `ClickCreatingTool` activates correctly through `ToolManager.doMouseDown` without hit-testing. | Works, and also validates real double-click timing and canvas focus. |
| Drag port → link created | Requires three manual workarounds (see below). | Works end-to-end with zero workarounds. |
| CI speed | ~1 s per suite, no browser binary | 5–30 s per suite, needs browser installed |
| Flakiness | Deterministic | Possible timing flakes on slow CI |
| Catches real regressions | Tool-activation logic only | Full stack: layout, hit-testing, event capture |

The three workarounds needed to make Robot + drag work in jsdom:

1. **`doActivate` must be bypassed.** `LinkingTool.doActivate()` calls `findFromPort` internally, which uses `diagram.findPartAt()`. In jsdom there is no real canvas so `findPartAt` always returns null and the tool deactivates silently. Fix: set `linkingTool.isActive = true` directly and seed `originalFromNode`/`originalFromPort` manually.

2. **`findTargetPort` must be overridden.** `doMouseUp` calls `findTargetPort` to resolve the destination, which again uses `findPartAt`. Fix: override the method on the instance — `linkingTool.findTargetPort = () => portB` — so it returns the target port directly.

3. **Event dispatch must target the active tool directly.** `ToolManager.doMouseMove/Up` iterate the tool-start lists looking for a new tool to activate. They do not forward to an already-active tool. Once `LinkingTool` is the `diagram.currentTool`, Robot must call `diagram.currentTool.doMouseMove/Up()` instead of going through the ToolManager. This is a fundamental difference from how the GoJS Robot extension is often naively implemented.

**Does the Robot simulate real browser interactions?**

No. Even the official Robot implementation does not simulate real browser interactions. It simulates GoJS-level interactions. The distinction matters for understanding what these tests actually cover.

What Robot does:

- Constructs `go.InputEvent` objects in memory
- Calls `diagram.currentTool.doMouseDown/Move/Up()` directly
- Bypasses the entire DOM event pipeline — no `MouseEvent`, no pointer capture, no canvas hit-testing

What a real browser does on a drag:

1. DOM fires `mousedown` on the `<canvas>` element
2. Browser performs pointer capture
3. GoJS's canvas event listener receives it and calls `diagram.doMouseDown()`
4. GoJS calls `diagram.findPartAt(viewPoint)` using real canvas geometry to find which node/port is under the cursor
5. ToolManager decides which tool to activate based on what was hit
6. Steps 3-5 repeat for `mousemove` and `mouseup`

Steps 4 and 5 are the wall. `findPartAt` requires real rendered canvas geometry. jsdom cannot provide it. The drag test's three workarounds skip steps 4 and 5 entirely — we manually inject their results rather than exercising them.

| What it covers | Robot in Jest | Real browser |
|---|---|---|
| Tool activation logic | Yes | Yes |
| GoJS model mutations | Yes | Yes |
| React state sync | Yes | Yes |
| Canvas hit-testing (`findPartAt`) | No — stubbed out | Yes |
| Real DOM event dispatch | No | Yes |
| Port detection on drag start | No — manually seeded | Yes |
| Port detection on drag end | No — instance override | Yes |
| Layout-dependent coordinates | No | Yes |

The double-click test is genuinely useful — `ClickCreatingTool` activates through the real ToolManager path with no stubs. The drag test is a wiring test dressed up as a user-flow test: it proves the `LinkingTool` creates a link when handed a valid target port, not that a user can actually drag between two nodes.

**The honest framing for the interview:** "We did implement the Robot tests and they pass. The double-click test is faithful — ToolManager.doMouseDown runs exactly as it would in a browser. The drag test is 90% faithful but the hit-testing layer is stubbed. A regression in `findFromPort` or `findTargetPort` would not be caught. For that, you need a real browser."

**Browser testing options — jest-puppeteer vs Playwright:**

If NFR-7 ("Jest — hard requirement") is interpreted strictly, jest-puppeteer is the right escape hatch: it runs Chromium under Jest, satisfies the constraint, and eliminates all three jsdom workarounds because `findPartAt` works against a real canvas.

| | jest-puppeteer | Playwright |
|---|---|---|
| Test runner | Jest (NFR-7 compliant) | Separate runner, separate config |
| Canvas hit-testing | Real Chromium, works | Real browser, works |
| Robot drag test workarounds | None needed | None needed |
| Dev server required | Yes — `globalSetup` must start `bun run dev` | Yes, or use component testing mode |
| Test authoring | `page.evaluate(() => ...)` serialization boundary — can't import TS modules directly | Full TS imports, `page.locator`, component mount API |
| Diagram access in tests | `go.Diagram.fromDiv(document.querySelector('.diagram-canvas'))` inside `evaluate` | Same, or via exposed handles |
| Type safety | Needs `@types/puppeteer`; version conflicts are common | First-class TS support out of the box |
| Mouse input | `page.mouse.down/move/up` (real DOM events) or GoJS Robot via `evaluate` | `page.mouse.down/move/up` (real DOM events) |
| Ecosystem momentum | Maintenance mode | Actively developed, wider adoption |

The `page.evaluate()` serialization wall is the main friction point with jest-puppeteer. Any code that touches the diagram must be expressed as a self-contained function string executed in browser context — you cannot pass TypeScript class instances or import project modules across the boundary. For simple assertions (`diagram.nodes.count`) this is fine. For complex setup (seeding nodes, pinning positions, accessing React state) it becomes verbose.

**The recommended split for this codebase:**

- Jest (jsdom) for all unit and tool-activation tests — fast, deterministic, no browser binary.
- jest-puppeteer if the team interprets NFR-7 as "Jest only" — adds real browser for the two canvas interaction tests with minimal runner change.
- Playwright if NFR-7 allows a second runner — better ergonomics for complex setup, better long-term maintainability.

**Interview line:** "jest-puppeteer is the pragmatic middle ground if we're locked into Jest. The serialization boundary is annoying but manageable for the two tests we actually need a browser for. If we have flexibility on the runner, Playwright's component testing mode is cleaner — you get full TypeScript and can mount the React component directly rather than navigating to a served URL."

---

## 4. Discoverability of node/link interactions

**What a user has to know with no prompting:**

- Double-click empty canvas → creates a node (driven by `clickCreatingTool.archetypeNodeData`).
- Hover near a node edge → port appears → drag to another node → link.
- Click node → select. Click side panel row → select.

Three of those require GoJS tribal knowledge. A first-time user will stare at the canvas.

**The UX framework (Norman's signifiers / Krug's "Don't Make Me Think"):**

1. **Affordances** — make the action look possible. An "Add Node" button in the side panel header is one line of code and removes the entire "how do I create a node" problem.
2. **Discoverable defaults** — empty state. When the canvas is empty (or on first load) show "Double-click anywhere to add a node · Drag from a node's edge to link." Dismissible.
3. **Hover hints** — on node hover, brighten the port stroke or show a connector handle (think Miro/Figma). That converts the invisible affordance into a visible one.
4. **Contextual toolbar** — `go.Adornment` on selection: "+" handle to create a linked node, trash icon (out of scope here, but mention it).
5. **Keyboard** — `N` to add a node at viewport center, `L` to start linking from selection. Power-user path.

**Implementation tradeoffs to volunteer:**

- Built-in GoJS adornments are the cheapest path — no React state involved, lives entirely in `nodeTemplate`.
- A React-rendered toolbar overlay positioned by the GoJS viewport is more flexible but reintroduces the sync problem you already solved.
- The empty-state and "Add Node" button are 5-minute wins with disproportionate UX payoff. Lead with those.

**Senior framing line:** "Discoverability isn't a feature — it's a quality bar. The fastest fix is the side-panel 'Add Node' button because it removes the failure mode entirely. The richer fix is hover-revealed link handles on nodes, which is where products like Miro have converged."

---

## Meta-tips for the room

- **When they push, push back with a question.** "Would you ship windowing if it broke Cmd+F for your users?" Senior signal is treating tradeoffs as live, not academic.
- **Have a "what I'd do in the next sprint" answer ready for each topic.** Concrete, sized, ordered. That's the conversation they're actually trying to have.
