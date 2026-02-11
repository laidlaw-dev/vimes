import { SourcePosition } from "../types/source-position.js";

export class VimesError extends Error {
  public readonly position?: SourcePosition;

  constructor(message: string, position?: SourcePosition) {
    super(message);
    this.name = new.target.name;
    this.position = position;
  }
}

export class SyntaxError extends VimesError {}

export class TypeError extends VimesError {}

export class RuntimeError extends VimesError {}
