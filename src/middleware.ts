import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PAGES = ['/', '/login', '/signup'];
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow static files, Next internals, and images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // favicon.ico, images, fonts
  ) {
    return NextResponse.next();
  }

  // 2. Check for session token from cookie or Authorization header
  const token =
    request.cookies.get('ner_token')?.value ||
    request.cookies.get('sb-access-token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/, '');

  const isAuthenticated = Boolean(token);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // 3. API Route Protection
  if (pathname.startsWith('/api/')) {
    if (isPublicApi) {
      return NextResponse.next();
    }
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Page Redirections
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isAuthenticated && !isPublicPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
