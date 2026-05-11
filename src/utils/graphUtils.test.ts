import { generateGraph } from "./graphUtils";

describe("generateGraph", () => {
  it("generates 1000 nodes", () => {
    const { nodes } = generateGraph(1000);
    expect(nodes.length).toBe(1000);
  });

  it("all node IDs are unique", () => {
    const { nodes } = generateGraph(1000);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(1000);
  });

  it("all nodes have type === 'Node'", () => {
    const { nodes } = generateGraph(1000);
    expect(nodes.every((n) => n.type === "Node")).toBe(true);
  });

  it("returns empty arrays for n=0", () => {
    const { nodes, links } = generateGraph(0);
    expect(nodes).toEqual([]);
    expect(links).toEqual([]);
  });

  it("all link endpoints reference valid node IDs", () => {
    const { nodes, links } = generateGraph(50);
    const idSet = new Set(nodes.map((n) => n.id));
    expect(links.every((l) => idSet.has(l.from) && idSet.has(l.to))).toBe(true);
  });

  it("no self-loops in generated links", () => {
    const { links } = generateGraph(50);
    expect(links.every((l) => l.from !== l.to)).toBe(true);
  });

  it("generated links contain no duplicate pairs (from/to or to/from)", () => {
    const { links } = generateGraph(100);
    const seen = new Set<string>();
    for (const link of links) {
      const key =
        link.from < link.to
          ? `${link.from}|${link.to}`
          : `${link.to}|${link.from}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("graph is connected for n=20 (BFS from n0 reaches all nodes)", () => {
    const { nodes, links } = generateGraph(20);
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const link of links) {
      adjacency.get(link.from)?.push(link.to);
      adjacency.get(link.to)?.push(link.from);
    }

    const visited = new Set<string>();
    const queue = ["n0"];
    visited.add("n0");
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    expect(visited.size).toBe(20);
  });
});
