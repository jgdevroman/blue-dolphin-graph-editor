import * as go from "gojs";

/**
 * A class for simulating mouse and keyboard input.
 * Ported from the official GoJS Robot extension (extensionsTS/Robot.ts).
 * All x/y coordinates are in DOCUMENT space, not view space.
 */
export class Robot {
  private _diagram: go.Diagram;

  constructor(dia?: go.Diagram) {
    if (dia instanceof go.Diagram) {
      this._diagram = dia;
    } else {
      this._diagram = new go.Diagram();
    }
  }

  get diagram(): go.Diagram {
    return this._diagram;
  }
  set diagram(val: go.Diagram) {
    if (!(val instanceof go.Diagram)) {
      throw new Error("Robot.diagram must be a Diagram");
    }
    this._diagram = val;
  }

  initializeEvent(e: go.InputEvent, props?: go.ObjectData): void {
    if (!props) {
      return;
    }
    for (const p in props) {
      if (p !== "sourceDiagram") {
        (e as go.ObjectData)[p] = (props as go.ObjectData)[p];
      }
    }
  }

  mouseDown(
    x: number,
    y: number,
    time: number = 0,
    eventprops?: go.ObjectData,
  ): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const n = new go.InputEvent();
    n.diagram = diagram;
    n.documentPoint = new go.Point(x, y);
    n.viewPoint = diagram.transformDocToView(n.documentPoint);
    n.timestamp = time;
    n.down = true;
    this.initializeEvent(n, eventprops);
    diagram.lastInput = n;
    diagram.firstInput = n.copy();
    diagram.currentTool.doMouseDown();
  }

  mouseMove(
    x: number,
    y: number,
    time: number = 0,
    eventprops?: go.ObjectData,
  ): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const n = new go.InputEvent();
    n.diagram = diagram;
    n.documentPoint = new go.Point(x, y);
    n.viewPoint = diagram.transformDocToView(n.documentPoint);
    n.timestamp = time;
    this.initializeEvent(n, eventprops);
    diagram.lastInput = n;
    diagram.currentTool.doMouseMove();
  }

  mouseUp(
    x: number,
    y: number,
    time: number = 0,
    eventprops?: go.ObjectData,
  ): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const n = new go.InputEvent();
    n.diagram = diagram;
    n.documentPoint = new go.Point(x, y);
    n.viewPoint = diagram.transformDocToView(n.documentPoint);
    n.timestamp = time;
    n.up = true;
    if (diagram.firstInput.documentPoint.equals(n.documentPoint)) {
      n.clickCount = 1;
    }
    this.initializeEvent(n, eventprops);
    diagram.lastInput = n;
    diagram.currentTool.doMouseUp();
  }

  doubleClick(
    x: number,
    y: number,
    time: number = 0,
    eventprops?: go.ObjectData,
  ): void {
    this.mouseDown(x, y, time, eventprops);
    this.mouseUp(x, y, time + 10, eventprops);
    this.mouseDown(x, y, time + 20, eventprops);
    this.mouseUp(x, y, time + 30, { ...eventprops, clickCount: 2 });
  }
}
