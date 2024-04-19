import { createRoot } from "react-dom/client";
import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { CalculatorAppView } from "./views/calculator-app-view";

import { extendTheme } from "@chakra-ui/react";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

const theme = extendTheme({
  styles: {
    global: {
      html: {
        fontSize: "12px",
      },
    },
  },
});

const App: React.FC<{}> = (props) => {
  return (
    <ChakraProvider theme={theme}>
      <CalculatorAppView />
    </ChakraProvider>
  );
};

function main() {
  Sentry.init({
    dsn: "https://524c6df58e35c7a92c235c4e211debcd@o4507091991396352.ingest.us.sentry.io/4507111559397376",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/hvac-sim-app.onrender.com\//,
    ],
    // Session Replay
    replaysSessionSampleRate: 1.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
  posthog.init("phc_A1ynluy4GrHw9rVzuQ4eitMq9AqqNxHNickzt2dRNBK", {
    api_host: "https://app.posthog.com",
  });

  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  root.render(<App />);
}

main();
