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

  return { nodes, links };
}

// Pre-computed at module load — not inside any component — so React strict-mode
// double-invocation cannot cause a second expensive run.
export const GENERATED_GRAPH = generateGraph(1000);
