// A top-level redirect works in both full browsers and embedded tabs.
import { getSafeReturnTo } from './returnNavigation';

// Google OAuth stays on the public frontend origin so the proxy can preserve
// the correlation and Identity cookies through the full external-auth flow.
export function getGoogleAuthUrl(): string {
  // Keep the OAuth handshake on the same public origin as the frontend. This
  // preserves the correlation and Identity cookies through the server proxy.
  return '/api/backend/authentication/google';
}

export function startGoogleAuth(returnTo?: string | null): void {
  sessionStorage.setItem('authRedirect', getSafeReturnTo(returnTo) || '/tourbillon');
  window.location.assign(getGoogleAuthUrl());
}
