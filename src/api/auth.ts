import { AuthState } from '../types';

// TODO: Replace with your WCL OAuth client ID
const CLIENT_ID = 'a0ddc261-9f01-4c37-a305-aff564796bb7';
const REDIRECT_URI = import.meta.env.PROD
  ? 'https://snieking.github.io/gdkp-cuts/'
  : 'http://localhost:5173/gdkp-cuts/';

const AUTH_URL = 'https://www.warcraftlogs.com/oauth/authorize';
const TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';

const STORAGE_KEYS = {
  accessToken: 'wcl_access_token',
  refreshToken: 'wcl_refresh_token',
  expiresAt: 'wcl_expires_at',
  codeVerifier: 'wcl_code_verifier',
};

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64urlEncode(hash);
}

export function getStoredAuth(): AuthState {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
    refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
    expiresAt: localStorage.getItem(STORAGE_KEYS.expiresAt)
      ? parseInt(localStorage.getItem(STORAGE_KEYS.expiresAt)!, 10)
      : null,
  };
}

export function storeAuth(accessToken: string, refreshToken: string, expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  localStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt.toString());
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
  localStorage.removeItem(STORAGE_KEYS.codeVerifier);
}

export function isAuthenticated(): boolean {
  const auth = getStoredAuth();
  if (!auth.accessToken || !auth.expiresAt) return false;
  return Date.now() < auth.expiresAt - 60000; // 1 minute buffer
}

export async function initiateLogin(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return false;
  }

  if (!code) return false;

  const codeVerifier = localStorage.getItem(STORAGE_KEYS.codeVerifier);
  if (!codeVerifier) {
    console.error('No code verifier found');
    return false;
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    storeAuth(data.access_token, data.refresh_token, data.expires_in);

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);

    return true;
  } catch (err) {
    console.error('Token exchange error:', err);
    return false;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const auth = getStoredAuth();
  if (!auth.refreshToken) return false;

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: auth.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    storeAuth(data.access_token, data.refresh_token, data.expires_in);
    return true;
  } catch (err) {
    console.error('Token refresh error:', err);
    clearAuth();
    return false;
  }
}

export async function getValidToken(): Promise<string | null> {
  const auth = getStoredAuth();

  if (!auth.accessToken) return null;

  // Check if token needs refresh (within 5 minutes of expiry)
  if (auth.expiresAt && Date.now() > auth.expiresAt - 300000) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  }

  return auth.accessToken;
}
