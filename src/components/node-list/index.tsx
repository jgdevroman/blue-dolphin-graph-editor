import Box from "@mui/material/Box";
import List from "@mui/material/List";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { AppNode } from "../../types/graph";
import { NodeRow } from "../node-row";

const ROW_HEIGHT = 48;
const OVERSCAN = 5;

function computeWindowStart(scrollTop: number): number {
  return Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
}

type Props = {
  nodes: AppNode[];
  nodeIndexRef: RefObject<Map<string, number>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export const NodeList = ({ nodes, nodeIndexRef, selectedId, onSelect }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerHeightRef = useRef(window.innerHeight);
  const [containerHeight, setContainerHeight] = useState(window.innerHeight);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      flushSync(() => {
        setWindowStart(computeWindowStart(container.scrollTop));
      });
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeightRef.current = entry.contentRect.height;
        setContainerHeight(entry.contentRect.height);
      }
    });

    container.addEventListener("scroll", handleScroll, { passive: true });
    observer.observe(container);
    containerHeightRef.current = container.clientHeight;
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedFromList intentionally omitted — including it would cause the effect to fire twice on list-driven selection (once to skip, once after the state resets to false)
  useEffect(() => {
    if (selectedId === null || selectedFromList) {
      setSelectedFromList(false);
      return;
    }
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const targetIndex = nodeIndexRef.current.get(selectedId) ?? -1;
    if (targetIndex === -1) {
      return;
    }
    const targetScrollTop = Math.max(
      0,
      targetIndex * ROW_HEIGHT - containerHeightRef.current / 2 + ROW_HEIGHT / 2,
    );
    container.scrollTop = targetScrollTop;
    setWindowStart(computeWindowStart(targetScrollTop));
  }, [selectedId, nodeIndexRef]);

  const startIndex = windowStart;
  const endIndex = Math.min(
    nodes.length,
    startIndex + Math.ceil(containerHeight / ROW_HEIGHT) + 2 * OVERSCAN,
  );
  const topPad = startIndex * ROW_HEIGHT;
  const botPad = Math.max(0, (nodes.length - endIndex) * ROW_HEIGHT);

  return (
    <Box ref={scrollRef} sx={{ flex: "1 1 auto", overflow: "auto", minHeight: 0 }}>
      <List dense disablePadding aria-rowcount={nodes.length}>
        {topPad > 0 && (
          <li style={{ height: topPad, display: "block", overflowAnchor: "none" }} aria-hidden="true" />
        )}
        {nodes.slice(startIndex, endIndex).map((node, i) => (
          <NodeRow
            key={node.id}
            node={node}
            isSelected={node.id === selectedId}
            onSelect={onSelect}
            setSelectedFromList={setSelectedFromList}
            ariaRowIndex={startIndex + i + 1}
          />
        ))}
        {botPad > 0 && (
          <li style={{ height: botPad, display: "block", overflowAnchor: "none" }} aria-hidden="true" />
        )}
      </List>
    </Box>
  );
};
