import type { AppLink, AppNode } from "../types/graph";

export const SEED_NODES: AppNode[] = [
  { id: "1", name: "Alpha", type: "Node" },
  { id: "2", name: "Beta", type: "Node" },
  { id: "3", name: "Gamma", type: "Node" },
  { id: "4", name: "Delta", type: "Node" },
  { id: "5", name: "Epsilon", type: "Node" },
];

export const SEED_LINKS: AppLink[] = [
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "4", to: "5" },
  { from: "5", to: "1" },
];
