import { StyleSheet, css, CSSProperties, StyleDeclarationMap } from "aphrodite";
import React from "react";

// This is a very basic implementation of a styled-component-esque API stacked
// on aphrodite. It would have been fine to use goober or emotion or something,
// but I wanted...
// - No build-system integration
// - Autocomplete for CSS field types
// - Understandable CSS names in the devtools inspector to tie things
//   back to code easily.
export function styled<T>(
  name: string,
  tagName: keyof React.ReactHTML,
  style: CSSProperties | StyleDeclarationMap
): React.FC<{ children?: React.ReactNode[] }> {
  const sheet = StyleSheet.create({ [name]: style });

  const Component: React.FC<{ children?: React.ReactNode[] }> = (props) => {
    return React.createElement(
      tagName,
      { className: css(sheet[name]) },
      props.children
    );
  };
  Component.displayName = name;

  return Component;
}
