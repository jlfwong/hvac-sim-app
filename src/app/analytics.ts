import {
  useAtom,
  type Atom,
  type PrimitiveAtom,
  type WritableAtom,
} from "jotai";
import { useMemo } from "react";

export function trackEvent(name: string, args: { [key: string]: any }): void {
  // TODO(jlfwong): Dev & prod difference
  console.log("trackEvent", name, args);
}

function debounce<T extends any[]>(
  func: (...args: T) => void,
  wait: number
): { delayed: (...args: T) => void; now: (...args: T) => void } {
  let timeoutId: number | null = null;

  return {
    delayed(...args: T): void {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        func(...args);
      }, wait);
    },

    now(...args: T): void {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      func(...args);
    },
  };
}

export const debouncedTracker = (name: string, delayInMs: number = 1000) => {
  return debounce((args: { [key: string]: any }) => {
    trackEvent(name, args);
  }, delayInMs);
};

export function useAtomAndTrack<
  AtomType extends WritableAtom<any, [any], void>,
  T extends AtomType extends Atom<infer Value> ? Value : never
>(atom: AtomType, name: string): [Awaited<T>, (t: T) => void, () => void] {
  const [atomValue, setAtomValue] = useAtom(atom);

  const eventName = `${name}__changed`;
  const tracker = useMemo(() => debouncedTracker(eventName), [name]);

  const trackNow = () => {
    tracker.now({ value: atomValue });
  };

  function setValue(value: T) {
    tracker.delayed({ value });
    setAtomValue(value);
  }

  return [atomValue, setValue, trackNow];
}
