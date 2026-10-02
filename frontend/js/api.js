const SESSION_KEY = 'spendwise-session-token';

export function getToken() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage may be disabled by the browser.
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}

export const getCurrentUser = () => request('/api/me');
export const loadWorkspace = () => request('/api/state');
export const saveWorkspace = state => request('/api/state', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(state)
});
export const signOut = () => request('/api/logout', { method: 'POST' }).finally(clearToken);
