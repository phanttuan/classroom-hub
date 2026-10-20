import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME } from './lib/auth/auth-constants';

const VALID_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function extractRoleFromToken(token?: string): ValidRole | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonString =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf-8')
        : atob(base64);
    const payload = JSON.parse(jsonString);

    if (payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }

    if (typeof payload.role !== 'string') {
      return null;
    }

    const role = payload.role.toUpperCase();
    return VALID_ROLES.includes(role as ValidRole) ? (role as ValidRole) : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua các file static, hình ảnh, API nội bộ, và trang công khai
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname === '/' ||
    pathname === '/forbidden'
  ) {
    return NextResponse.next();
  }

  // 1. Nếu đã đăng nhập mà truy cập /login hoặc /register -> chuyển hướng vào trang quản lý tương ứng
  if (pathname === '/login' || pathname === '/register') {
    const token =
      request.cookies.get(AUTH_COOKIE_NAME)?.value ||
      request.cookies.get('access_token')?.value;
    let role = extractRoleFromToken(token);
    if (!role) {
      const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
      if (roleCookie && VALID_ROLES.includes(roleCookie as ValidRole)) {
        role = roleCookie as ValidRole;
      }
    }

    if (token && role) {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', request.url));
      if (role === 'STUDENT') return NextResponse.redirect(new URL('/student', request.url));
    }

    return NextResponse.next();
  }

  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get('access_token')?.value;
  let role = extractRoleFromToken(token);

  // Fallback an toàn: nếu token vừa hết hạn trong khoảng thời gian refresh hoặc có role cookie hợp lệ
  if (!role) {
    const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    if (roleCookie && VALID_ROLES.includes(roleCookie as ValidRole)) {
      role = roleCookie as ValidRole;
    }
  }

  // Kiểm tra route theo role
  const isAdminRoute = pathname.startsWith('/admin');
  const isTeacherRoute = pathname.startsWith('/teacher');
  const isStudentRoute = pathname.startsWith('/student');

  if (isAdminRoute || isTeacherRoute || isStudentRoute) {
    // 1. Chưa đăng nhập hoặc token đã hết hạn -> chuyển hướng về /login (401)
    if (!token || !role) {
      const loginUrl = new URL('/login', request.url);
      const search = request.nextUrl.search;
      loginUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
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
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/login',
    '/register',
  ],
};
