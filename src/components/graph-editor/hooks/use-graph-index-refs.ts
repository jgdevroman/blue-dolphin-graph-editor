import { useRef } from "react";
import type { AppLink, AppNode } from "../../../types/graph";

const buildIndexMap = <T extends { id: string }>(items: T[]) => {
  const indexMap = new Map<string, number>();
  items.forEach((item, index) => {
    indexMap.set(item.id, index);
  });
  return indexMap;
};

export const useGraphIndexRefs = (nodes: AppNode[], links: AppLink[]) => {
  const nodeIndexRef = useRef<Map<string, number>>(new Map());
  const linkIndexRef = useRef<Map<string, number>>(new Map());
  const isInitialized = useRef(false);

  // Synchronous lazy initialization: must run during the render phase, before any effects.
  // gojs-react (a class component) fires onModelChange from componentDidMount, which runs
  // before useEffect hooks. Initializing in useEffect leaves nodeIndexRef empty during that
  // window, causing handleModelChange to bypass the has() guard and duplicate all initial nodes.
  if (!isInitialized.current) {
    isInitialized.current = true;
    nodeIndexRef.current = buildIndexMap(nodes);
    linkIndexRef.current = buildIndexMap(links);
  }

  return { nodeIndexRef, linkIndexRef };
};
