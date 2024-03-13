import { createRoot } from "react-dom/client";
import { JSONWeatherEntry } from "../lib/weather";
import React, { useState, useEffect } from "react";
import { Main } from "./main";
import { ChakraProvider } from "@chakra-ui/react";

const App: React.FC<{}> = (props) => {
  return (
    <ChakraProvider>
      <Main />
    </ChakraProvider>
  );
};

function main() {
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  root.render(<App />);
}

main();
