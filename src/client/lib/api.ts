const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('smartgov_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('smartgov_token', token);
  } else {
    localStorage.removeItem('smartgov_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new ApiError(
      networkErr.message || 'Unable to connect to the server. Please check your internet connection.',
      0
    );
  }

  if (response.status === 401) {
    // Session expired or invalid
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      setAuthToken(null);
      // Dispatch custom event for auth provider
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  // Handle CSV / binary responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const text = await response.text();
    return text as unknown as T;
  }

  const rawText = await response.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = {
      error: rawText.length < 200 && rawText.trim() ? rawText.trim() : (response.statusText || `Request failed (${response.status})`),
    };
  }

  if (!response.ok) {
    const errorMsg = data.error || data.message || `A server error occurred (${response.status}).`;
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
