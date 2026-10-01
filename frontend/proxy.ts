import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME } from './lib/auth/auth-constants';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua các file static, hình ảnh, API nội bộ, và trang công khai
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forbidden'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();

  // Kiểm tra route theo role
  const isAdminRoute = pathname.startsWith('/admin');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isStudentRoute = pathname.startsWith('/student');

  if (isAdminRoute || isTeacherRoute || isStudentRoute) {
    // 1. Chưa đăng nhập -> chuyển hướng về /login (401)
    if (!token || !role) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Phân quyền theo role (403)
    if (isAdminRoute && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }

    if (isTeacherRoute && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }

    if (isStudentRoute && role !== 'STUDENT' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
