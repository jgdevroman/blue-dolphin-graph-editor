# Plan: BlueDolphin Senior Frontend Assignment

## Context
Build a diagram editor for visualizing and managing large node networks. The assignment requires React + TypeScript + GoJS + MUI + Jest. This must be production-quality.

**Deliverables**:
1. **PRD.md** — Product Requirements Document showing requirements elicitation skill
2. **Working app** — diagram editor meeting all functional requirements
3. **Tests** — Jest test suite covering core logic
4. **README.md** — approach, structure, decisions, and AI disclosure

**Decisions confirmed with user**:
- GoJS trial version is acceptable (watermark visible, no license needed)
- Layout: **`ForceDirectedLayout` with `maxIterations=200`** — organic initial render, zero layout cost on later edits
- Add node: **canvas-only**, double-click empty area
- Create link: **canvas-only**, drag-to-link with the entire node body linkable (`fromLinkable`/`toLinkable`)
- Properties panel: null state with placeholder; node list and canvas remain interactive when nothing is selected
- Empty or whitespace-only node names are accepted and saved as-is
- AI disclosure: **transparent**, emphasizing manual review, modification, and verification

---

## Requirements Summary

**Data Model**
```ts
type AppNode = { id: string; name: string; type: 'Node' }
type AppLink = { id: string; from: string; to: string }
```

**Diagram (GoJS)**
- Render 1000 connected nodes
- Support selection
- Add nodes, create links
- No unnecessary re-renders, no re-initialization per render (use `useRef`)

**Side Panel (MUI)**
- List of all 1000 nodes with efficient rendering (NO external virtualization libs)
- Bidirectional selection sync with diagram
- Properties panel: editable name, read-only type
- Responsive: hidden by default on `md` and smaller; always visible on `lg` and larger; toggle button shown on `md` and smaller

**Sync**
- Diagram ↔ React state ↔ Diagram
- Single source of truth, no duplicated state
- Edits (add node, draw link, rename) reflected in both canvas and side panel within one render cycle

**State**
- React `useState` only (no Redux, Zustand, Jotai, etc.)

**Tests (Jest)**
- Node generation, adding a node, linking nodes, updating a node name
- Include non-happy-path scenarios

---

## Architecture

```
repo-root/
├── docs/
│   ├── PRD.md                               # Product Requirements Document
│   ├── plan.md                              # This file
│   └── testing-plan.md                      # Test strategy
├── README.md                                # Approach, structure, AI disclosure
└── src/
    ├── types/
    │   ├── graph.ts                         # AppNode, AppLink interfaces
    │   ├── graph-editor.ts                  # NamePatch type
    │   └── graph-guards.ts                  # isAppNode, isAppLink type guards
    ├── utils/
    │   ├── graph-utils.ts                   # generateGraph, GENERATED_GRAPH constant
    │   └── graph-utils.test.ts              # Graph generation tests
    ├── components/
    │   ├── graph-editor/
    │   │   ├── index.tsx                    # Root state container; orchestrates all children
    │   │   └── hooks/
    │   │       └── use-graph-index-refs.ts  # O(1) index maps for node/link lookups
    │   ├── diagram-canvas/
    │   │   ├── index.tsx                    # GoJS sync logic: selection, name patch, model changes
    │   │   └── index.test.tsx
    │   ├── diagram-wrapper/
    │   │   ├── index.tsx                    # GoJS diagram initialisation (once); node/link templates
    │   │   └── index.test.tsx
    │   ├── side-panel/
    │   │   ├── index.tsx                    # Composes NodeList + PropertiesPanel
    │   │   └── index.test.tsx
    │   ├── node-list/
    │   │   └── index.tsx                    # MUI list with React.memo rows + content-visibility CSS
    │   ├── node-row/
    │   │   ├── index.tsx                    # Memoised row; props are primitives only
    │   │   └── index.test.tsx
    │   ├── properties-panel/
    │   │   └── index.tsx                    # Editable name, read-only type, placeholder when null
    │   └── drawer/
    │       ├── index.tsx                    # Responsive MUI Drawer (persistent on md, permanent on lg+)
    │       └── index.test.tsx
    ├── App.tsx                              # ThemeProvider + GraphEditor root
    ├── app.integration.test.tsx             # End-to-end interaction tests
    └── setupTests.ts                        # jest-canvas-mock, scroll mock, jest-dom matchers
```

---

## Project Setup

- **Bun** as package manager (`bun add` / `bun add -d`)
- **Vite** + React + TypeScript (fast dev, easy Jest config)
- **Dependencies**: `gojs`, `gojs-react`, `@mui/material`, `@emotion/react`, `@emotion/styled`
- **Dev dependencies**: `jest`, `ts-jest`, `jest-canvas-mock`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@types/jest`

---

## Key Implementation Decisions

### 1. GoJS Diagram (DiagramWrapper + DiagramCanvas)

Separated into two components:
- **`DiagramWrapper`** owns GoJS initialisation: builds the `go.Diagram` instance, defines node/link templates, and wires listeners. Initialised once via `useEffect([], [])`.
- **`DiagramCanvas`** owns sync logic: three `useEffect` hooks patch the GoJS model when React state changes (selection, name patch, node/link arrays).

Key configuration:
- `ForceDirectedLayout` with `maxIterations=200`
- `allowDelete: false`, undo manager disabled
- `clickCreatingTool.archetypeNodeData` handles double-click node creation
- `linkValidation` rejects self-loops and duplicate edges in either direction (undirected graph)
- `nodeKeyProperty: "id"`, `linkKeyProperty: "id"`, `makeUniqueKeyFunction` uses `crypto.randomUUID()`
- `skipsDiagramUpdate` on `ReactDiagram` prevents GoJS re-ingesting state it just emitted
- `suppressNextSelectionEventRef` guards against selection feedback loops

### 2. Efficient List Rendering (NodeList + NodeRow)

The bottleneck at 1000 items is React reconciliation, not browser scroll. Solved at the React layer without external virtualization libs:

- **`React.memo` on `NodeRow`** — re-renders only when `node` or `isSelected` changes
- **All callbacks wrapped in `useCallback` with stable deps** — unstable prop references silently defeat `memo`
- **Row props are primitives only** (`id`, `name`, `isSelected`) — reference equality works
- **`content-visibility: auto; contain-intrinsic-size: 0 48px`** on each row — browser skips paint/layout for off-screen items

### 3. State Shape (GraphEditor)

```ts
const [nodes, setNodes] = useState<AppNode[]>()         // initialised from GENERATED_GRAPH
const [links, setLinks] = useState<AppLink[]>()         // initialised from GENERATED_GRAPH
const [selectedId, setSelectedId] = useState<string | null>(null)
const [namePatch, setNamePatch] = useState<NamePatch | null>(null)
const [open, setOpen] = useState(false)                 // drawer open state (md and smaller)
```

`GENERATED_GRAPH` is pre-computed at module load outside any component, so React strict-mode double-invocation cannot trigger a second expensive run.

### 4. Sync Pattern

- React state is the single source of truth for all node/link data
- GoJS model is patched via `diagram.model.commit()` — never the whole model replaced after init
- `namePatch` carries targeted name updates so only `diagram.model.setDataProperty()` is called, not a full node array re-sync
- `suppressNextSelectionEventRef` prevents diagram-initiated selections from bouncing back as a second update

### 5. Graph Generation (graph-utils.ts)

Random spanning tree: each node `i` connects to a uniformly random node `j < i`. Guarantees full connectivity with no hub nodes or isolated components. Pre-computed as `GENERATED_GRAPH` at module load.

Node positions are not part of the data model — GoJS `ForceDirectedLayout` computes them on initial mount, then the layout is frozen so subsequent edits incur no layout cost.

### 6. Responsive Side Panel (Drawer)

- **`lg` and larger**: `variant="permanent"` — always visible, no toggle
- **`md` and smaller**: `variant="persistent"` — hidden by default, toggled via a toolbar button in the main area; `open` state lives in `GraphEditor`

### 7. Edit Responsiveness (NFR-10)

All three edit operations (add node, draw link, rename) are routed through `onModelChange` or direct state setters that update React state synchronously. GoJS is patched in the same commit, so both canvas and side panel reflect the change within one render cycle with no intermediate inconsistent state.

---

## Testing Plan (Jest + ts-jest)

### `graph-utils.test.ts`
- `generateGraph(1000)` returns exactly 1000 nodes with unique IDs and `type === 'Node'`
- `generateGraph(0)` returns `{ nodes: [], links: [] }`
- All link `from`/`to` values reference valid node IDs
- No self-loops in generated links
- No duplicate edges (undirected dedup)
- Graph is connected — BFS from `n0` reaches all nodes (verified for n=20)

### Component and integration tests
- `NodeRow`: click calls `onSelect` and `setSelectedFromList`; renders name and type
- `SidePanel`: placeholder when no selection; name field shows current name; typing calls `setNamePatch`; empty string accepted (not rejected)
- `Drawer`: renders `persistent` variant below `md`, `permanent` variant at `md` and above
- `DiagramCanvas`: renders all nodes; double-click adds node; self-loop rejected; duplicate link rejected; valid link accepted; selection syncs and calls `centerRect`; feedback loop guard
- `app.integration.test.tsx`: drawer toggle; canvas select syncs list; add node syncs list; name edit syncs canvas; draw link syncs React state

---

## Implementation Phases (all complete)

### Phase 1 — Scaffolding
- Vite + React + TypeScript project with Bun
- Runtime deps: `gojs`, `gojs-react`, `@mui/material`, `@emotion/react`, `@emotion/styled`
- Dev deps: Jest, ts-jest, testing-library, jest-canvas-mock

### Phase 2 — Empty UI shell
- Flex layout: diagram area + side panel
- `SidePanel` with empty list and placeholder properties area
- MUI `Drawer` with responsive breakpoints

### Phase 3 — Small graph, side-panel editing
- React state wired: `nodes`, `links`, `selectedId`, `namePatch`
- GoJS mounted in `DiagramWrapper` with simple init
- `NodeList` and `PropertiesPanel` rendering and editing
- Bidirectional selection sync

### Phase 4 — Canvas-driven node and link creation
- Double-click background creates node at click position
- Drag between nodes creates link
- `linkValidation` rejects self-loops and duplicate edges
- `onModelChange` syncs insertedNodeKeys and insertedLinkKeys to React state

### Phase 5 — Scale to 1000 nodes
- `generateGraph(1000)` with random spanning tree
- `GENERATED_GRAPH` pre-computed at module load
- `ForceDirectedLayout` with `maxIterations=200`
- `React.memo` on `NodeRow`; all callbacks stable via `useCallback`
- `content-visibility: auto` CSS on rows

### Phase 6 — Tests
- Jest + ts-jest configured with `tsconfig.test.json` (CommonJS, node resolution)
- `jest.config.cjs` (`.cjs` required because `"type": "module"` in package.json)
- `jest-canvas-mock` in `setupTests.ts`
- 80% coverage threshold enforced; achieved ~98% statements

### Phase 7 — Polish and docs
- Manual walk-through of FR/NFR list from PRD
- README with AI disclosure

---

## Verification

- `bun install && bun run dev` — app opens; 1000 nodes render after ForceDirectedLayout completes
- Click a canvas node → side panel row highlights, list scrolls to row, properties panel populates
- Click a list row → canvas node selected, canvas scrolls to bring it into view
- Edit name in properties panel → canvas label and list row update immediately, no delay
- Type an empty name → accepted and saved (not rejected)
- Double-click empty canvas area → new node appears at click point, visible in list with unique ID
- Draw a link between two nodes on canvas → reflected in React state immediately
- Try to draw a self-loop → rejected
- Try to draw a duplicate link → rejected
- No selection → properties panel shows "Select a node to view properties" placeholder
- Resize to `md` viewport → side panel is hidden; toolbar toggle button opens and closes it
- Resize to `lg` viewport → side panel is always visible; no toggle button shown
- `bunx jest` — all tests pass
- React DevTools Profiler: a single name edit re-renders only the affected row, not the list
