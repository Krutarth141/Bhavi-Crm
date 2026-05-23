import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

type NextAuthRequest = NextRequest & { nextUrl: URL };

export default async function middleware(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;

  // Public routes only
  const publicRoutes = ['/login', '/', '/auth/error'];

  // Check session token server-side
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};