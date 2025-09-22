// src/lib/apiClient.ts

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiRequestOptions {
  method?: ApiMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
}

export async function apiClient<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  let fullUrl = url;
  if (options.params) {
    const query = new URLSearchParams(
      Object.entries(options.params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    fullUrl += (url.includes('?') ? '&' : '?') + query;
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };

  const res = await fetch(fullUrl, fetchOptions);
  if (!res.ok) {
    let errorMsg = `API error: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg += ` - ${errorData.message || JSON.stringify(errorData)}`;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  // Try to parse JSON, fallback to text
  try {
    return (await res.json()) as T;
  } catch {
    return (await res.text()) as unknown as T;
  }
} 