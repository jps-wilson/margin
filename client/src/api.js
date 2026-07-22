// all fetch calls live here
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const fetchOpts = { credentials: "include" };

function handleUnauthorized(res) {
  if (res.status === 401) {
    window.location.href = "/";
    return true;
  }
  return false;
}

export async function fetchVersions(fileKey) {
  const res = await fetch(`${API_BASE}/api/versions/${fileKey}`, fetchOpts);
  if (handleUnauthorized(res)) return;
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function fetchDiff(fileKey, from, to) {
  const res = await fetch(
    `${API_BASE}/api/diff/${fileKey}?from=${from}&to=${to}`,
    fetchOpts,
  );
  if (handleUnauthorized(res)) return;
  if (!res.ok) throw new Error("Failed to fetch diff");
  return res.json();
}

export async function fetchFrameImage(fileKey, nodeId, version) {
  const res = await fetch(
    `${API_BASE}/api/frame-image/${fileKey}/${nodeId}?version=${version}`,
    fetchOpts,
  );
  if (handleUnauthorized(res)) return;
  if (!res.ok) throw new Error("failed to fetch frame image");
  const data = await res.json();
  return data.imageUrl;
}

export async function fetchFileInfo(fileKey) {
  const res = await fetch(`${API_BASE}/api/file-info/${fileKey}`, fetchOpts);
  if (handleUnauthorized(res)) return;
  if (!res.ok) throw new Error("Failed to fetch file info");
  return res.json();
}

export async function checkAuth() {
  const res = await fetch(`${API_BASE}/auth/me`, fetchOpts);
  if (!res.ok) return false;
  const data = await res.json();
  return data.authenticated;
}