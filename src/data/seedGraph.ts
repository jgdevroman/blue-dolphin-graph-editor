import type { AppLink, AppNode } from "../types/graph";

export const SEED_NODES: AppNode[] = [
  { id: "1", name: "Alpha", type: "Node" },
  { id: "2", name: "Beta", type: "Node" },
  { id: "3", name: "Gamma", type: "Node" },
  { id: "4", name: "Delta", type: "Node" },
  { id: "5", name: "Epsilon", type: "Node" },
];

export const SEED_LINKS: AppLink[] = [
  { id: "l1", from: "1", to: "2" },
  { id: "l2", from: "2", to: "3" },
  { id: "l3", from: "3", to: "4" },
  { id: "l4", from: "4", to: "5" },
  { id: "l5", from: "5", to: "1" },
];
