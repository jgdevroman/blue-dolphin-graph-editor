import type { AppLink, AppNode } from "../types/graph";

export interface GeneratedGraph {
  nodes: AppNode[];
  links: AppLink[];
}

export function generateGraph(n: number): GeneratedGraph {
  const nodes: AppNode[] = [];
  const links: AppLink[] = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < n; i++) {
    nodes.push({ id: `n${i}`, name: `Node ${i}`, type: "Node" });
  }

  const addEdge = (a: number, b: number): boolean => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (edgeSet.has(key)) {
      return false;
    }
    edgeSet.add(key);
    links.push({ id: `l${links.length}`, from: `n${a}`, to: `n${b}` });
    return true;
  };

  // Random spanning tree: each node i connects to a random node j < i.
  // Guarantees full connectivity and no hub nodes.
  for (let i = 1; i < n; i++) {
    addEdge(i, Math.floor(Math.random() * i));
  }

  // Add extra random edges to introduce cycles.
  const extraEdgeTarget = Math.floor(n * 0.25);
  let attempts = 0;
  let added = 0;
  while (added < extraEdgeTarget && attempts < extraEdgeTarget * 20) {
    const a = Math.floor(Math.random() * n);
    const b = Math.floor(Math.random() * n);
    if (a !== b && addEdge(a, b)) {
      added++;
    }
    attempts++;
  }

  return { nodes, links };
}

// Pre-computed at module load — not inside any component — so React strict-mode
// double-invocation cannot cause a second expensive run.
export const GENERATED_GRAPH = generateGraph(1000);
