// A top-level redirect works in both full browsers and embedded tabs.
import { getSafeReturnTo } from './returnNavigation';

// Google OAuth should bypass the Next.js backend proxy so ASP.NET owns the full
// external-auth handshake and callback path end-to-end.
export function getGoogleAuthUrl(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const directApiBase = process.env.NEXT_PUBLIC_OAUTH_API_URL
    || (apiBase?.startsWith('/api/backend') ? 'http://localhost:5248/api' : apiBase)
    || 'http://localhost:5248/api';

  return `${directApiBase.replace(/\/$/, '')}/authentication/google`;
}

export function startGoogleAuth(returnTo?: string | null): void {
  sessionStorage.setItem('authRedirect', getSafeReturnTo(returnTo) || '/tourbillon');
  window.location.assign(getGoogleAuthUrl());
}
