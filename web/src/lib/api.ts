export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? 'https://api.batraconnect.com' : 'http://127.0.0.1:4000')
).replace(/\/$/, '');
const TOKEN_KEY = 'batra-admin-token';
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) =>
  token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY);

/** Calls the Batra Connect API with the admin's session; an expired session signs the dashboard out. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the Batra Connect server. Check your connection.', 0, 'NETWORK_ERROR');
  }
  if (
    response.status === 204 ||
    (response.status === 202 && !response.headers.get('content-type')?.includes('json'))
  )
    return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('batra-signed-out'));
    }
    throw new ApiError(
      body?.error?.message ?? 'The request could not be completed.',
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
    );
  }
  return body as T;
}
/** Downloads an authenticated file (e.g. the CSV export). */
export async function download(path: string, filename: string) {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new ApiError('Download failed.', response.status, 'DOWNLOAD_FAILED');
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
/** Uploads one photo (multipart) and returns its media id. */
export async function uploadPhoto(file: File, purpose: 'gallery'): Promise<string> {
  const form = new FormData();
  form.append('photo', file);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/media?purpose=${purpose}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
  } catch {
    throw new ApiError('Cannot reach the Batra Connect server. Check your connection.', 0, 'NETWORK_ERROR');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      body?.error?.message ?? 'Upload failed.',
      response.status,
      body?.error?.code ?? 'UPLOAD_FAILED',
    );
  return body.media.id as string;
}
/** Object URL for a private photo (the browser cannot send the sign-in header on a plain <img>). */
export async function photoUrl(id: string) {
  const response = await fetch(`${API_URL}/api/v1/media/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new ApiError('Photo unavailable.', response.status, 'NOT_FOUND');
  return URL.createObjectURL(await response.blob());
}
