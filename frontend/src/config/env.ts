const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

  if (!isValidHttpUrl(value)) {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${value}". Expected an absolute http(s) URL such as ${DEFAULT_API_BASE_URL}.`,
    );
  }

  return value.replace(/\/$/, '');
}
