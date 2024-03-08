import { Atom, atom } from "jotai";
import { unwrap } from "jotai/utils";

type Getter = <Value>(atom: Atom<Value>) => Value;

type Read<Value> = (
  get: Getter,
  options: {
    readonly signal: AbortSignal;
  }
) => Value;

// Utility function for combining unwrap & atom. This helps make the resulting
// call-sites have a less confusing call signature, and also provides the
// convenient default null value.
export function asyncAtomOrNull<T>(
  read: Read<Promise<T | null>>
): Atom<T | null> {
  return unwrap(atom(read), () => null);
}
