# Product Requirements Document — Diagram Editor

| Field | Value |
|---|---|
| Version | 1.1 |
| Date | 2026-05-09 |
| Author | Roman Kornig |
| Status | Approved |
| Source | BlueDolphin Senior Frontend Engineer assignment |

---

## 1. Overview

A single-page web application for visualizing and editing large node networks. The user sees a diagram canvas alongside a synchronized side panel. They can browse, select, edit, and grow the network with no perceptible lag, even at 1000+ nodes.

## 2. Goals & Non-Goals

### Goals
- Render and interact with networks at the 1000-node scale without UI jank.
- Provide a side panel that mirrors the canvas state, with bidirectional selection.
- Make common edits (rename a node, add a node, draw a link) feel instant.
- Demonstrate maintainable, idiomatic React + TypeScript with a clean state model.

### Non-Goals (this iteration)
- Persistence (no backend, no localStorage).
- Multi-user collaboration.
- Undo / redo.
- Deletion of nodes or links.
- Custom node types beyond `'Node'`.
- A side-panel UI for creating links (canvas-only in this iteration).
- Mobile / touch optimization.

## 3. Personas & Use Cases

**Primary persona: Network Analyst**
A power user who works with structural data daily. Comfortable with desktop apps, expects keyboard-class responsiveness, and judges tools by how quickly they reflect intent.

**Core jobs-to-be-done:**
1. Survey a large network at a glance.
2. Locate a specific node by scrolling a list.
3. Inspect a node's properties without losing canvas context.
4. Make a quick edit (rename, add, link) and trust that the change is reflected everywhere.

## 4. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall render an initial graph of 1000 connected nodes on load. | Must |
| FR-2 | The user shall be able to select a node by clicking it on the canvas. | Must |
| FR-3 | The user shall be able to select a node by clicking its row in the side panel list. | Must |
| FR-4 | Selection in either the canvas or the list shall update the other within one render cycle. Selecting a node on the canvas shall scroll the side-panel list to that node's row. Selecting a row in the list shall move the canvas to bring that node into view. | Must |
| FR-5 | The user shall be able to add a new node by double-clicking an empty area of the canvas. The new node is placed at the click position and appears in both the canvas and the side-panel list with a unique ID. | Must |
| FR-6 | The user shall be able to create a link between two existing nodes by dragging from one node to another on the canvas. The link is added to application state and reflected immediately. | Must |
| FR-7 | The user shall be able to edit a selected node's name in the properties panel. The change is reflected on the canvas label and in the list row immediately. | Must |
| FR-8 | The properties panel shall display the node's `type` as read-only. | Must |
| FR-9 | When no node is selected, the **properties panel** shall display a placeholder ("Select a node to view properties"). The **node list** in the side panel and the **canvas** shall remain fully interactive in this state — the user can scroll the list, click a list row, or click a canvas node to enter a selected state at any time. | Must |
| FR-10 | The side panel shall be responsive. On `lg` screens and larger it is permanently visible. On `md` screens and smaller it is hidden by default but can be toggled open and closed via a toolbar button. | Should |

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Initial render of 1000 nodes | < 5000 ms on a modern laptop |
| NFR-2 | Side-panel scroll | 60 fps with 1000 items in state |
| NFR-3 | GoJS diagram instance | Initialized exactly once; never re-created on React re-render |
| NFR-4 | State management | React `useState` only — no Redux, Zustand, Jotai, or similar |
| NFR-5 | List virtualization | Custom implementation only — no `react-window`, `react-virtual`, etc. |
| NFR-6 | Type safety | TypeScript strict mode enabled |
| NFR-7 | Test coverage | Jest tests for node generation, add node, link nodes, update name, including non-happy-path cases |
| NFR-8 | Re-render efficiency | A single node update (selection change, name edit, add) re-renders only the affected row, not the entire list. Verified via React DevTools Profiler. |
| NFR-9 | Synchronization | Single source of truth (React state); no duplicated or conflicting representations |
| NFR-10 | Edit responsiveness | Adding a node, drawing a link, and editing a name shall each be reflected in both the canvas and the side panel within one render cycle, with no visible delay or flicker. |

## 6. Technical Constraints

- **Framework**: React 19 + TypeScript 6
- **Diagram**: GoJS (trial license, watermark acceptable for evaluation)
- **UI library**: MUI (Material UI) for side-panel components
- **Test framework**: Jest with `ts-jest`
- **Build**: Vite
- **No external state management libraries**
- **No external virtualization libraries**

## 7. Data Model

```ts
type AppNode = {
  id: string
  name: string
  type: 'Node'
}

type AppLink = {
  id: string
  from: string  // AppNode.id
  to: string    // AppNode.id
}

```

Node positions are managed internally by GoJS and are not part of the canonical data model.

## 8. Out of Scope (explicit)

- Persistence layer (no save/load).
- Authentication, authorization, multi-user.
- Undo / redo history.
- Node or link deletion.
- Editing the `type` field (always `'Node'`).
- Side-panel UI for creating links (canvas-only).
- Layout algorithms beyond the pre-computed initial positions.
- Internationalization, accessibility audits beyond default MUI behavior.
- Mobile or touch-first interaction patterns.

## 9. Acceptance Criteria

A reviewer shall be able to verify the following end-to-end on a fresh clone:

1. Install dependencies and start the dev server (`npm install && npm run dev`, or the equivalent with your package manager of choice such as `bun install && bun run dev`). The app opens with 1000 nodes visible (FR-1, NFR-1).
2. Clicking a canvas node highlights its row in the list, scrolls the list to that row, and populates the properties panel (FR-2, FR-4).
3. Clicking a list row selects the corresponding canvas node and scrolls the canvas to bring it into view (FR-3, FR-4).
4. Double-clicking an empty area of the canvas places a new node at the click location with a unique ID, and it appears in the side-panel list (FR-5).
5. Dragging from one canvas node to another creates a link between them and updates application state (FR-6).
6. Editing the name field changes the canvas label and the list row text (FR-7).
7. The type field is visible but not editable (FR-8).
8. With no selection, the panel shows the placeholder (FR-9).
9. `npm test` (or `bunx jest`) reports all tests passing, including edge cases (NFR-7).
10. React DevTools Profiler shows a single row re-render (not the full list) when a name is edited (NFR-8).
11. On `md` viewports and smaller the side panel is hidden on load; the toolbar toggle button opens and closes it. On `lg` viewports and larger the side panel is always visible and no toggle button is shown (FR-10).
12. Adding a node, drawing a link, and editing a name each appear in both the canvas and the side panel immediately, with no visible delay or intermediate inconsistent state (NFR-10).

## 10. Open Questions & Assumptions

| # | Item | Resolution |
|---|---|---|
| Q1 | Is the graph directed or undirected? | **Assumption**: Visually undirected (no arrowheads). Data model uses `from`/`to` for storage convenience. |
| Q2 | What topology should the seed graph have? | **Decision**: Random spanning tree — each node `i` connects to a uniformly random node `j < i`. Guarantees full connectivity with no hub nodes or isolated components. |
| Q4 | What happens to a node's links when it's deleted? | **Out of scope** for this iteration. |
| Q5 | Should empty / whitespace-only names be allowed? | **Decision**: Yes. Empty or whitespace-only names are accepted. |
| Q6 | GoJS license? | **Assumption**: Trial / evaluation license is acceptable for this assignment. Watermark visible. |
