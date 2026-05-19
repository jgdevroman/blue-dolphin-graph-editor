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

> "These are integration tests against the GoJS programmatic API, not user flows. They validate the sync wiring — model change → React state → DOM — which was the highest-risk area. They wouldn't catch a regression where double-click on the canvas stops creating a node, or drag-from-port stops drawing a link, because no real pointer event ever fires."

**What real user-flow tests would need:**

- **GoJS Robot** for canvas (the PRD-mentioned extension at `node_modules/gojs/extensions/Robot.ts`). It dispatches synthetic `mousedown`/`mousemove`/`mouseup` at canvas coordinates. That's how you'd test "user double-clicks background → node appears."
- **Playwright or Cypress component tests** for the truth. jsdom has no canvas, no real layout, no real hit testing. The integration test for "drag from node A's port to node B's port creates a link" is fundamentally a browser test — you need real coordinates, real pointer capture, and real GoJS hit-testing against laid-out geometry.
- **Testing pyramid argument:** Jest stays for pure logic (graph utils, reducers, the model-change handler in isolation). Browser-level E2E covers the canvas interactions GoJS owns. Don't try to make jsdom do something it can't.

**Bonus credibility:** "There's also a coverage gap on failure paths — `linkValidation` rejecting self-links and duplicate edges in `diagram-wrapper/index.tsx:82` has no test. The review said 'not only happy paths' — that's the obvious one I'd add first, and it can be a Jest test because it's a pure predicate."

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
