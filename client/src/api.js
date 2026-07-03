// all fetch calls live here
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * credentials "include" -> required on every call so the browser sends the mdt_sid
 * session cookie cross-site (frontend on Vercel, backend on Render are different origins).
 * Without this, the server can never tell who's asking and every request looks
 * logged out.
 */

export async function fetchVersions(fileKey) {
  const res = await fetch(`${API_BASE}/api/versions/${fileKey}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function fetchDiff(fileKey, from, to) {
  const res = await fetch(
    `${API_BASE}/api/diff/${fileKey}?from=${from}&to=${to}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to fetch diff");
  return res.json();
}

export async function fetchFrameImage(fileKey, nodeId, version) {
  const res = await fetch(
    `${API_BASE}/api/frame-image/${fileKey}/${nodeId}?version=${version}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("failed to fetch frame image");
  const data = await res.json();
  return data.imageUrl;
}

export async function fetchFileInfo(fileKey) {
  const res = await fetch(`${API_BASE}/api/file-info/${fileKey}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch file info");
  return res.json();
}
