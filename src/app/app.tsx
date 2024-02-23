import { createRoot } from "react-dom/client";
import { JSONWeatherEntry } from "../lib/weather";
import React, { useState, useEffect } from "react";
import { Main } from "./main";

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  // Check if the response is ok (status in the range 200-299)
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json(); // Parse the response body as JSON
}

const App: React.FC<{}> = (props) => {
  const [weatherData, setWeatherData] = useState<JSONWeatherEntry[] | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const ottawaData2023 = await fetchJSON<JSONWeatherEntry[]>(
        "/data/weather/2023-ottawa-era5.json"
      );
      setWeatherData(ottawaData2023);
    })();
  }, []);

  if (!weatherData) {
    return null;
  }
  return <Main jsonWeatherData={weatherData} />;
};

function main() {
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);
  root.render(<App />);
}

main();
