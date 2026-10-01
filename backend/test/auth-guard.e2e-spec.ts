import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  UseGuards,
  Req,
  INestApplication,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { Roles } from '../src/common/decorators/roles.decorator.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import type { RequestWithUser } from '../src/common/interfaces/request-with-user.interface.js';

const TEST_SECRET = 'super-secret-test-jwt-key-minimum-32-chars';

@Controller('test-protected')
class TestProtectedController {
  @Get('public')
  getPublic() {
    return { status: 'public_ok' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: RequestWithUser) {
    return { status: 'authenticated', user: req.user };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminOnly(@Req() req: RequestWithUser) {
    return { status: 'admin_granted', email: req.user?.email };
  }

  @Get('teacher-or-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getTeacherOrAdmin(@Req() req: RequestWithUser) {
    return { status: 'teacher_or_admin_granted', role: req.user?.role };
  }
}

describe('Auth & Roles Guards Integration (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: TEST_SECRET })],
        }),
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [TestProtectedController],
      providers: [JwtAuthGuard, RolesGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows access to public route without any token', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-protected/public')
      .expect(200);

    expect(res.body.status).toBe('public_ok');
  });

  it('rejects protected route with 401 when Authorization header is missing', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-protected/profile')
      .expect(401);

    expect(res.body.message).toBe('Vui lòng đăng nhập để tiếp tục');
  });

  it('rejects protected route with 401 when token is invalid or expired', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-protected/profile')
      .set('Authorization', 'Bearer invalid-token-string')
      .expect(401);

    expect(res.body.message).toBe('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  });

  it('rejects protected route with 401 when token payload structure is invalid', async () => {
    // Missing sub and invalid role
    const invalidToken = jwtService.sign({ email: 'test@eduhub.vn' });
    const res = await request(app.getHttpServer())
      .get('/test-protected/profile')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);

    expect(res.body.message).toBe('Dữ liệu xác thực trong token không hợp lệ');
  });

  it('allows access to protected route with valid token and attaches user', async () => {
    const validStudentToken = jwtService.sign({
      sub: '55',
      email: 'student@eduhub.vn',
      role: UserRole.STUDENT,
      fullName: 'Trần Học Sinh',
    });

    const res = await request(app.getHttpServer())
      .get('/test-protected/profile')
      .set('Authorization', `Bearer ${validStudentToken}`)
      .expect(200);

    expect(res.body.status).toBe('authenticated');
    expect(res.body.user).toEqual({
      id: '55',
      email: 'student@eduhub.vn',
      role: UserRole.STUDENT,
      fullName: 'Trần Học Sinh',
    });
  });

  it('returns 403 Forbidden when STUDENT attempts to access admin-only endpoint', async () => {
    const studentToken = jwtService.sign({
      sub: '55',
      email: 'student@eduhub.vn',
      role: UserRole.STUDENT,
    });

    const res = await request(app.getHttpServer())
      .get('/test-protected/admin-only')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    expect(res.body.message).toBe('Bạn không có quyền truy cập vào tài nguyên này');
  });

  it('returns 200 OK when ADMIN accesses admin-only endpoint', async () => {
    const adminToken = jwtService.sign({
      sub: '1',
      email: 'admin@eduhub.vn',
      role: UserRole.ADMIN,
    });

    const res = await request(app.getHttpServer())
      .get('/test-protected/admin-only')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe('admin_granted');
    expect(res.body.email).toBe('admin@eduhub.vn');
  });

  it('allows TEACHER and ADMIN on multi-role endpoint, rejects STUDENT', async () => {
    const teacherToken = jwtService.sign({
      sub: '10',
      email: 'teacher@eduhub.vn',
      role: UserRole.TEACHER,
    });

    const teacherRes = await request(app.getHttpServer())
      .get('/test-protected/teacher-or-admin')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(teacherRes.body.status).toBe('teacher_or_admin_granted');
    expect(teacherRes.body.role).toBe(UserRole.TEACHER);

    const studentToken = jwtService.sign({
      sub: '55',
      email: 'student@eduhub.vn',
      role: UserRole.STUDENT,
    });

    await request(app.getHttpServer())
      .get('/test-protected/teacher-or-admin')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});
