# Project Rules — Blue Dolphin Diagram Editor

## Stack

- **Framework**: React 19 + TypeScript 6 (strict mode)
- **Diagram**: GoJS 3 + gojs-react
- **UI**: MUI (Material UI) v9
- **Build**: Vite 8
- **Linter/Formatter**: Biome
- **Package manager**: Bun — always use `bun add` / `bun add -d`, never `npm install`
- **Test runner**: Jest (hard requirement, NFR-7) — run via `bunx jest`

## Commands

```bash
bun run dev          # start dev server
bun run build        # type-check + Vite build
bun run lint         # Biome check
bun run lint:fix     # Biome check --write
bunx jest            # run tests
bunx jest --coverage # run tests with coverage
```

## Architecture Constraints (from PRD)

- **No external state management** — React `useState` only. No Redux, Zustand, Jotai, or similar.
- **No external virtualization libraries** — no `react-window`, `react-virtual`, etc. Custom implementation only.
- **Single source of truth** — React state owns node/link data. GoJS is kept in sync via `useEffect`, never the reverse.
- **GoJS initialized once** — hold the instance in `useRef`, initialize in a `useEffect` with empty deps. Never re-create on re-render.
- **No persistence** — no backend, no localStorage, no undo/redo.

## Data Model

```ts
type AppNode = { id: string; name: string; type: 'Node' }
type AppLink = { id: string; from: string; to: string }
```

- Node positions are managed internally by GoJS and are not part of the canonical data model.
- `type` is always `'Node'` — no custom node types in this iteration.

## TypeScript

- Strict mode is on (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`).
- Use `import type` for type-only imports.
- No `any` — Biome flags `noExplicitAny` as a warning; treat it as an error in new code.
- No non-null assertions (`!`) — Biome flags `noNonNullAssertion`; use proper null checks instead.

## Code Style (Biome-enforced)

- **Double quotes** for strings in JavaScript/TypeScript.
- **Spaces** for indentation (not tabs).
- **Block statements required** — `useBlockStatements: error` — always use curly braces for `if`/`else`/`for`/`while`, even for single-line bodies.
- **Shorthand array types** — use `T[]` not `Array<T>`.
- **Template literals** over string concatenation where interpolation is involved.
- **Imports organized** automatically by Biome assist on save.
- **Cognitive complexity cap** — max 15 per function.

## React Patterns

- **`React.memo` on list rows** — `NodeRow` is memoized; keep its props as primitives (`id`, `name`, `isSelected`) so reference equality works.
- **Stable callbacks** — all callbacks passed to memoized children must be wrapped in `useCallback` with correct deps. An unstable prop reference defeats `memo`.
- **`content-visibility: auto`** on each `NodeRow` for off-screen paint skipping.

## GoJS Sync Pattern

- React state is the source of truth for node/link data.
- GoJS model is patched via `diagram.model.commit()` — never replace the whole model after init.
- Guard against feedback loops with a `suppressNextSelectionEventRef` ref so diagram-initiated changes do not re-trigger diagram updates.
- `skipsDiagramUpdate` flag on `ReactDiagram` prevents GoJS from re-ingesting state it just emitted.

## Testing Rules

- **Jest + ts-jest** — hard requirement. Do not switch to Vitest or `bun test`.
- **`tsconfig.test.json`** — separate tsconfig with `module: "CommonJS"` and `moduleResolution: "node"` for ts-jest compatibility. The app tsconfig uses `moduleResolution: "bundler"` which is Vite-specific and breaks Node/Jest.
- **`jest.config.cjs`** — `.cjs` extension required because `"type": "module"` in package.json makes Node treat `.js` as ESM.
- **`jest-canvas-mock`** — required in `setupTests.ts` because GoJS uses `<canvas>` internally and jsdom has no canvas implementation.
- **GoJS Robot** — use for diagram integration tests (add node, add link, selection). Copy from `node_modules/gojs/extensions/Robot.ts` into `src/test/Robot.ts`.
- **Never paper over failing tests** — if a test fails because of a real bug, fix the implementation. Never use `expect(true).toBe(true)` or similar to silence a failing assertion.

## Out of Scope (do not implement)

- Persistence (no save/load, no localStorage)
- Multi-user collaboration
- Undo/redo
- Node or link deletion
- Custom node types beyond `'Node'`
- Side-panel UI for creating links (canvas-only)
- Mobile/touch optimization
- Internationalization
