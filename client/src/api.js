// all fetch calls live here
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function fetchVersions(fileKey) {
  const res = await fetch(`${BASE}/api/test-versions/${fileKey}`);
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function fetchDiff(fileKey, from, to) {
  const res = await fetch(`${BASE}/api/diff/${fileKey}?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("Failed to fetch diff");
  return res.json();
}
