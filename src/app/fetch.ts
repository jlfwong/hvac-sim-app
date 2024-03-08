export async function fetchJSON<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  // Check if the response is ok (status in the range 200-299)
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json(); // Parse the response body as JSON
}
