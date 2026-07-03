// all fetch calls live here
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const SESSION_KEY = "mdt_session";

export function getSessionId() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionId(sessionId) {
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

function authHeaders() {
  const sessionId = getSessionId();
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export async function fetchVersions(fileKey) {
  const res = await fetch(`${API_BASE}/api/versions/${fileKey}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}

export async function fetchDiff(fileKey, from, to) {
  const res = await fetch(
    `${API_BASE}/api/diff/${fileKey}?from=${from}&to=${to}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error("Failed to fetch diff");
  return res.json();
}

export async function fetchFrameImage(fileKey, nodeId, version) {
  const res = await fetch(
    `${API_BASE}/api/frame-image/${fileKey}/${nodeId}?version=${version}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error("failed to fetch frame image");
  const data = await res.json();
  return data.imageUrl;
}

export async function fetchFileInfo(fileKey) {
  const res = await fetch(`${API_BASE}/api/file-info/${fileKey}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch file info");
  return res.json();
}
