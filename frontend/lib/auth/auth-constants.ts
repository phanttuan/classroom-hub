export const ROLE_ROUTE_PERMISSIONS = {
  ADMIN: ['/admin', '/teacher', '/student'],
  TEACHER: ['/teacher'],
  STUDENT: ['/student'],
} as const;

export const AUTH_COOKIE_NAME = 'auth_token';
export const ROLE_COOKIE_NAME = 'user_role';
