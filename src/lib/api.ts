/**
 * Authenticated fetch wrapper — automatically adds JWT Bearer token
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ner_token') || '' : '';
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  return fetch(url, { ...options, headers });
}
