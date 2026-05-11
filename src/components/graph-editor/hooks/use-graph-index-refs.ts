import { useEffect, useRef } from "react";
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

  // On mount, populate the node/link index refs with the initial data.
  // biome-ignore lint/correctness/useExhaustiveDependencies: needs to run only once on mount. The refresh functions are stable and do not need to be included in the dependency array.
  useEffect(() => {
    nodeIndexRef.current = buildIndexMap(nodes);
    linkIndexRef.current = buildIndexMap(links);
  }, []);

  return { nodeIndexRef, linkIndexRef };
};
