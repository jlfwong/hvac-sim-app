import { useAtom, type Atom, type WritableAtom } from "jotai";
import { useRef } from "react";
import posthog from "posthog-js";

export function trackEvent(
  name: string,
  args: { [key: string]: any } = {}
): void {
  if (process.env.NODE_ENV === "production") {
    posthog.capture(name, args);
  } else {
    console.log("trackEvent", name, args);
  }
}

export function useAtomAndTrack<
  AtomType extends WritableAtom<any, [any], void>,
  T extends AtomType extends Atom<infer Value> ? Value : never
>(atom: AtomType, name: string): [Awaited<T>, (t: T) => void, () => void] {
  const [atomValue, setAtomValue] = useAtom(atom);

  const lastValueRef = useRef(atomValue);

  function track() {
    if (lastValueRef.current == atomValue) return;
    trackEvent(`${name}__changed`, { value: atomValue });
    lastValueRef.current = atomValue;
  }

  return [atomValue, setAtomValue, track];
}
