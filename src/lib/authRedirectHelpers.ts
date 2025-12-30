/**
 * Auth Redirect Helpers
 * 
 * Utilities for managing authentication redirects with context and clear messaging.
 * Makes redirects feel intentional and understandable, not abrupt.
 */

/**
 * Gets user-friendly route name from path
 */
export function getRouteName(path: string): string {
  // Remove query params and hash
  const cleanPath = path.split('?')[0].split('#')[0];
  
  const routeNames: Record<string, string> = {
    '/': 'homepage',
    '/submit': 'submit a report',
    '/profile': 'your profile',
    '/leaderboard': 'leaderboard',
    '/results': 'results',
    '/claim': 'claim a producer profile',
    '/subscribe': 'subscribe',
    '/admin': 'admin dashboard',
    '/producer-dashboard': 'producer dashboard',
    '/escrow': 'escrow hub',
    '/fafo-generator': 'FAFO generator',
  };

  // Check for dynamic routes
  if (cleanPath.startsWith('/claim/')) {
    return 'claim a producer profile';
  }
  if (cleanPath.startsWith('/admin/')) {
    return 'admin area';
  }

  return routeNames[cleanPath] || 'this page';
}

/**
 * Gets user-friendly reason for why auth is required
 */
export function getAuthReason(path: string): string {
  const cleanPath = path.split('?')[0].split('#')[0];
  
  if (cleanPath === '/submit' || cleanPath.startsWith('/submit')) {
    return 'Submitting reports requires authentication to verify your identity and protect the integrity of our platform.';
  }
  
  if (cleanPath === '/claim' || cleanPath.startsWith('/claim/')) {
    return 'Claiming a producer profile requires authentication to verify your identity and prevent fraud.';
  }
  
  if (cleanPath === '/profile' || cleanPath.startsWith('/profile')) {
    return 'Viewing your profile requires authentication to protect your personal information.';
  }
  
  if (cleanPath.startsWith('/admin')) {
    return 'Accessing admin features requires administrator authentication.';
  }
  
  if (cleanPath === '/subscribe' || cleanPath.startsWith('/subscribe')) {
    return 'Managing subscriptions requires authentication to associate the subscription with your account.';
  }
  
  if (cleanPath === '/producer-dashboard' || cleanPath.startsWith('/producer-dashboard')) {
    return 'Viewing your producer dashboard requires authentication.';
  }

  return 'This page requires authentication to continue.';
}

/**
 * Parses redirect URL from query params
 */
export function getRedirectInfo(): {
  redirectTo: string | null;
  routeName: string;
  reason: string;
} | null {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get('redirect');
  
  if (!redirectTo) {
    return null;
  }

  // Validate redirect is relative path (security)
  if (redirectTo.startsWith('http://') || redirectTo.startsWith('https://')) {
    console.warn('[Auth] Invalid redirect URL (absolute):', redirectTo);
    return null;
  }

  // Ensure redirect starts with /
  const safeRedirect = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;

  return {
    redirectTo: safeRedirect,
    routeName: getRouteName(safeRedirect),
    reason: getAuthReason(safeRedirect),
  };
}

/**
 * Creates a redirect URL with context
 */
export function createRedirectUrl(path: string, additionalContext?: Record<string, string>): string {
  const cleanPath = path.split('?')[0].split('#')[0];
  const existingParams = new URLSearchParams(path.split('?')[1] || '');
  
  // Merge additional context
  if (additionalContext) {
    Object.entries(additionalContext).forEach(([key, value]) => {
      existingParams.set(key, value);
    });
  }

  const queryString = existingParams.toString();
  return `/auth?redirect=${encodeURIComponent(cleanPath + (queryString ? `?${queryString}` : ''))}`;
}

