/*
 * Adapted from the official GoJS Robot extension.
 * Copyright (C) 1998-2022 by Northwoods Software Corporation. All Rights Reserved.
 * Source: https://github.com/NorthwoodsSoftware/GoJS/blob/master/extensionsJSM/Robot.ts
 *
 * Changes from the original:
 * - TypeScript strict-mode compatible (no implicit any, explicit return types)
 * - Added dblClick convenience method
 * - Modifiers applied via boolean properties instead of generic property copy
 *   to satisfy Biome's noExplicitAny rule
 *
 * Coordinates are in DOCUMENT space (same as go.Part.position / go.Node.location),
 * NOT view/pixel space. Use diagram.transformDocToView / transformViewToDoc to convert.
 */

import * as go from "gojs";

type EventProps = {
  clickCount?: number;
  button?: number;
  buttons?: number;
  shift?: boolean;
  control?: boolean;
  alt?: boolean;
  meta?: boolean;
  targetDiagram?: go.Diagram;
};

/**
 * Simulates mouse and keyboard input on a GoJS Diagram by constructing
 * InputEvents and calling the active tool's handler methods directly,
 * bypassing the real DOM event pipeline.
 *
 * All x/y coordinates are in DOCUMENT space, matching go.Part.position.
 *
 * Works in jsdom (Jest) for tool-activation interactions (ClickCreatingTool,
 * ClickSelectingTool, LinkingTool). Canvas hit-testing (findPartAt, port
 * detection) still requires a real browser — see robot.demo.test.tsx for
 * the jsdom workarounds needed for drag-to-link.
 */
export class Robot {
  private _diagram: go.Diagram;

  constructor(diagram: go.Diagram) {
    this._diagram = diagram;
  }

  get diagram(): go.Diagram {
    return this._diagram;
  }

  set diagram(val: go.Diagram) {
    this._diagram = val;
  }

  private applyProps(e: go.InputEvent, props?: EventProps): void {
    if (!props) {
      return;
    }
    if (props.clickCount !== undefined) {
      e.clickCount = props.clickCount;
    }
    if (props.button !== undefined) {
      e.button = props.button;
    }
    if (props.buttons !== undefined) {
      e.buttons = props.buttons;
    }
    if (props.shift) {
      e.shift = true;
    }
    if (props.control) {
      e.control = true;
    }
    if (props.alt) {
      e.alt = true;
    }
    if (props.meta) {
      e.meta = true;
    }
    if (props.targetDiagram !== undefined) {
      e.targetDiagram = props.targetDiagram;
    }
  }

  mouseDown(x: number, y: number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = new go.InputEvent();
    e.diagram = diagram;
    e.documentPoint = new go.Point(x, y);
    e.viewPoint = diagram.transformDocToView(e.documentPoint);
    e.timestamp = time;
    e.down = true;
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.firstInput = e.copy();
    diagram.currentTool.doMouseDown();
  }

  mouseMove(x: number, y: number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = new go.InputEvent();
    e.diagram = diagram;
    e.documentPoint = new go.Point(x, y);
    e.viewPoint = diagram.transformDocToView(e.documentPoint);
    e.timestamp = time;
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.currentTool.doMouseMove();
  }

  mouseUp(x: number, y: number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = new go.InputEvent();
    e.diagram = diagram;
    e.documentPoint = new go.Point(x, y);
    e.viewPoint = diagram.transformDocToView(e.documentPoint);
    e.timestamp = time;
    e.up = true;
    if (diagram.firstInput.documentPoint.equals(e.documentPoint)) {
      e.clickCount = 1;
    }
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.currentTool.doMouseUp();
  }

  mouseWheel(delta: number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = diagram.lastInput.copy();
    e.diagram = diagram;
    e.delta = delta;
    e.timestamp = time;
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.currentTool.doMouseWheel();
  }

  keyDown(keyOrCode: string | number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = diagram.lastInput.copy();
    e.diagram = diagram;
    e.key =
      typeof keyOrCode === "string" ? keyOrCode : String.fromCharCode(keyOrCode);
    e.timestamp = time;
    e.down = true;
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.currentTool.doKeyDown();
  }

  keyUp(keyOrCode: string | number, time = 0, props?: EventProps): void {
    const diagram = this._diagram;
    if (!diagram.isEnabled) {
      return;
    }
    const e = diagram.lastInput.copy();
    e.diagram = diagram;
    e.key =
      typeof keyOrCode === "string" ? keyOrCode : String.fromCharCode(keyOrCode);
    e.timestamp = time;
    e.up = true;
    this.applyProps(e, props);
    diagram.lastInput = e;
    diagram.currentTool.doKeyUp();
  }

  dblClick(x: number, y: number, time = 0, props?: EventProps): void {
    this.mouseDown(x, y, time, props);
    this.mouseUp(x, y, time, props);
    this.mouseDown(x, y, time, props);
    this.mouseUp(x, y, time, { ...props, clickCount: 2 });
  }
}
