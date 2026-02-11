import { RuntimeError } from "@/errors/index.js";
import type { Value } from "@/runtime/values.js";
import type { SourcePosition } from "@/types/source-position.js";

interface Frame {
  readonly bindings: ReadonlyMap<string, Value>;
  readonly parent?: Frame;
}

export class Environment {
  private constructor(private readonly frame: Frame) {}

  public static empty(): Environment {
    return new Environment({ bindings: new Map() });
  }

  public extend(): Environment {
    return new Environment({ bindings: new Map(), parent: this.frame });
  }

  public define(name: string, value: Value, position?: SourcePosition): Environment {
    if (this.frame.bindings.has(name)) {
      throw new RuntimeError(`Identifier '${name}' already defined in this scope`, position);
    }

    const updatedBindings = new Map(this.frame.bindings);
    updatedBindings.set(name, value);
    return new Environment({ bindings: updatedBindings, parent: this.frame.parent });
  }

  public assignCurrent(name: string, value: Value, position?: SourcePosition): Environment {
    if (!this.frame.bindings.has(name)) {
      throw new RuntimeError(`Cannot assign undefined identifier '${name}'`, position);
    }

    const updatedBindings = new Map(this.frame.bindings);
    updatedBindings.set(name, value);
    return new Environment({ bindings: updatedBindings, parent: this.frame.parent });
  }

  public parent(): Environment | undefined {
    if (!this.frame.parent) {
      return undefined;
    }

    return new Environment(this.frame.parent);
  }

  public lookup(name: string, position?: SourcePosition): Value {
    let frame: Frame | undefined = this.frame;

    while (frame) {
      const existing = frame.bindings.get(name);
      if (existing) {
        return existing;
      }
      frame = frame.parent;
    }

    throw new RuntimeError(`Undefined identifier '${name}'`, position);
  }
}
