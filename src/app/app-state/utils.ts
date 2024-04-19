import { Atom, atom, type WritableAtom } from "jotai";
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

// Creates a derived atom which can have its value overwritten.  If the derived
// value changes, its value will dominate the previous override value.
//
// This is last "writer" wins, where a change in derived values constitutes a
// "write".
export function overridableDerivedAtom<T>(
  read: (get: Getter) => T
): WritableAtom<T, [T], void> {
  const timestampedDerivedAtom = atom((get) => {
    const value = read(get);
    return { value, timestamp: performance.now() };
  });

  const overrideAtom = atom<{ value: T } | null>(null);

  const timestampedWriteableAtom = atom((get) => {
    const override = get(overrideAtom);
    if (override == null) return null;
    return { value: override.value, timestamp: performance.now() };
  });

  return atom<T, [T], void>(
    (get) => {
      const a = get(timestampedDerivedAtom);
      const b = get(timestampedWriteableAtom);

      if (b == null || b.timestamp < a.timestamp) {
        return a.value;
      } else {
        return b.value;
      }
    },
    (get, set, value: T) => {
      set(overrideAtom, { value });
    }
  );
}
