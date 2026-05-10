import type * as go from "gojs";
import type { AppLink, AppNode } from "./graph";

export function isAppNode(data: go.ObjectData): data is AppNode {
  return (
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    data.type === "Node"
  );
}

export function isAppLink(data: go.ObjectData): data is AppLink {
  return (
    typeof data.id === "string" &&
    typeof data.from === "string" &&
    typeof data.to === "string"
  );
}
