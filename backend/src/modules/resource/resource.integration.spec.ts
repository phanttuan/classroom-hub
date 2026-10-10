import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service.js';
import { ResourceService } from './resource.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import {
  UserRole,
  UserStatus,
  LessonStatus,
  EnrollmentStatus,
  ResourceParent,
} from '../../generated/prisma/enums.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ResourceService Real DB Integration Test', () => {
  let prisma: PrismaService;
  let service: ResourceService;
  let cloudinaryService: CloudinaryService;

  let teacherId: bigint;
  let studentId: bigint;
  let otherStudentId: bigint;
  let courseId: bigint;
  let moduleId: bigint;
  let publishedLessonId: bigint;
  let draftLessonId: bigint;
  let publishedResourceId: bigint;
  let draftResourceId: bigint;

  const timestamp = Date.now();
  const teacherEmail = `res_teacher_${timestamp}@eduhub.com`;
  const studentEmail = `res_student_${timestamp}@eduhub.com`;
  const otherStudentEmail = `res_other_${timestamp}@eduhub.com`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    const mockConfigService: any = {
      get: (key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return undefined;
      },
    };
    cloudinaryService = new CloudinaryService(mockConfigService);
    service = new ResourceService(prisma, cloudinaryService);

    const hash = await bcrypt.hash('testpass123', 10);

    // 1. Tạo giáo viên
    const teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        fullName: 'GV Resource Test',
        passwordHash: hash,
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
      },
    });
    teacherId = teacher.id;

    // 2. Tạo sinh viên 1 (sẽ enroll)
    const student = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: 'SV Resource Test 1',
        passwordHash: hash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentId = student.id;

    // 3. Tạo sinh viên 2 (không enroll)
    const otherStudent = await prisma.user.create({
      data: {
        email: otherStudentEmail,
        fullName: 'SV Resource Test 2 (Unenrolled)',
        passwordHash: hash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    otherStudentId = otherStudent.id;

    // 4. Tạo môn học (Course)
    const course = await prisma.course.create({
      data: {
        name: 'Khóa học Kiến trúc Phần mềm',
        courseCode: `RSC${timestamp.toString().slice(-5)}`,
        ownerId: teacherId,
      },
    });
    courseId = course.id;

    // 5. Tạo Module
    const module = await prisma.module.create({
      data: {
        courseId,
        title: 'Chương 1: Tổng quan',
        orderIndex: 1,
      },
    });
    moduleId = module.id;

    // 6. Tạo 1 Lesson PUBLISHED và 1 Lesson DRAFT
    const pubLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Bài 1: Giới thiệu (Published)',
        content: 'Nội dung bài học 1',
        orderIndex: 1,
        status: LessonStatus.PUBLISHED,
      },
    });
    publishedLessonId = pubLesson.id;

    const drfLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: 'Bài 2: Kiến trúc microservices (Draft)',
        content: 'Nội dung bài học 2',
        orderIndex: 2,
        status: LessonStatus.DRAFT,
      },
    });
    draftLessonId = drfLesson.id;

    // 7. Tạo Resource cho từng bài học
    const pubResource = await prisma.resource.create({
      data: {
        parentType: ResourceParent.LESSON,
        lessonId: publishedLessonId,
        uploadedBy: teacherId,
        fileName: 'slide-chuong-1.pdf',
        storageKey: 'raw:classroom-hub/lessons/pub/slide-chuong-1.pdf',
        fileSizeBytes: 1048576n,
        mimeType: 'application/pdf',
      },
    });
    publishedResourceId = pubResource.id;

    const drfResource = await prisma.resource.create({
      data: {
        parentType: ResourceParent.LESSON,
        lessonId: draftLessonId,
        uploadedBy: teacherId,
        fileName: 'de-cuong-nhap.docx',
        storageKey:
          'raw:classroom-hub/lessons/drf/de-cuong-nhap.docx',
        fileSizeBytes: 524288n,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
    draftResourceId = drfResource.id;
  });

  afterAll(async () => {
    if (courseId) {
      await prisma.resource.deleteMany({
        where: { id: { in: [publishedResourceId, draftResourceId] } },
      });
      await prisma.lesson.deleteMany({
        where: { id: { in: [publishedLessonId, draftLessonId] } },
      });
      await prisma.module.deleteMany({ where: { id: moduleId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (teacherId || studentId || otherStudentId) {
      await prisma.user.deleteMany({
        where: { id: { in: [teacherId, studentId, otherStudentId] } },
      });
    }
    await prisma.$disconnect();
  });

  it('1. Sinh viên chưa enroll truy cập tài nguyên bị chặn 403', async () => {
    await expect(
      service.getPreviewUrl(
        { id: otherStudentId, role: UserRole.STUDENT },
        publishedResourceId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('2. Sinh viên tham gia khóa học thành công (Enrollment ACTIVE)', async () => {
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId,
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    expect(enrollment.id).toBeDefined();
  });

  it('3. Sinh viên đã enroll xem được danh sách tài liệu của bài học PUBLISHED', async () => {
    const list = await service.getLessonResources(
      { id: studentId, role: UserRole.STUDENT },
      publishedLessonId,
    );
    expect(list).toHaveLength(1);
    expect(list[0].fileName).toBe('slide-chuong-1.pdf');
  });

  it('4. Sinh viên đã enroll bị chặn 403 khi xem tài liệu của bài học DRAFT', async () => {
    await expect(
      service.getLessonResources(
        { id: studentId, role: UserRole.STUDENT },
        draftLessonId,
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.getPreviewUrl(
        { id: studentId, role: UserRole.STUDENT },
        draftResourceId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. Giáo viên xem được cả tài liệu của bài học DRAFT', async () => {
    const list = await service.getLessonResources(
      { id: teacherId, role: UserRole.TEACHER },
      draftLessonId,
    );
    expect(list).toHaveLength(1);
    expect(list[0].fileName).toBe('de-cuong-nhap.docx');

    const preview = await service.getPreviewUrl(
      { id: teacherId, role: UserRole.TEACHER },
      draftResourceId,
    );
    expect(preview.fileName).toBe('de-cuong-nhap.docx');
    expect(preview.expiresIn).toBe(600);
  });

  it('6. Sinh viên lấy preview URL và download URL của bài học PUBLISHED', async () => {
    const preview = await service.getPreviewUrl(
      { id: studentId, role: UserRole.STUDENT },
      publishedResourceId,
    );
    expect(preview.expiresIn).toBe(600);
    expect(preview.mimeType).toBe('application/pdf');
    expect(preview.url).not.toContain('attachment=true');
    expect(preview.url).toMatch(/(?:exp|expires_at)=(\d+)/);

    const download = await service.getDownloadUrl(
      { id: studentId, role: UserRole.STUDENT },
      publishedResourceId,
    );
    expect(download.expiresIn).toBe(600);
    expect(download.url).toContain('attachment=true');
    expect(download.url).toMatch(/(?:exp|expires_at)=(\d+)/);
  });

  it('7. Sinh viên bị gỡ (REMOVED) khỏi khóa học lập tức bị chặn 403', async () => {
    await prisma.enrollment.update({
      where: {
        uk_enrollments_course_student: {
          courseId,
          studentId,
        },
      },
      data: {
        status: EnrollmentStatus.REMOVED,
        removedAt: new Date(),
      },
    });

    await expect(
      service.getPreviewUrl(
        { id: studentId, role: UserRole.STUDENT },
        publishedResourceId,
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.getDownloadUrl(
        { id: studentId, role: UserRole.STUDENT },
        publishedResourceId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('8. Mã resourceId không tồn tại trả về 404', async () => {
    await expect(
      service.getPreviewUrl(
        { id: teacherId, role: UserRole.TEACHER },
        99999999n,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

