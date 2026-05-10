import type { ObjectData } from "gojs";

export interface AppNode extends ObjectData {
  id: string;
  name: string;
  type: "Node";
}

export interface AppLink extends ObjectData {
  id: string;
  from: string;
  to: string;
}
