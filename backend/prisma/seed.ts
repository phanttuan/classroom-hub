import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole, UserStatus, ClassStatus, MembershipStatus, LessonStatus } from '../src/generated/prisma/enums.js';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/classroom_hub?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seeding data)...');

  // 1. Mật khẩu mặc định: Password123@
  const passwordHash = await bcrypt.hash('Password123@', 10);

  // 2. Tạo Tài khoản Giáo viên
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@classroomhub.edu.vn' },
    update: {
      fullName: 'ThS. Nguyễn Văn A (Giảng viên)',
      passwordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'teacher@classroomhub.edu.vn',
      fullName: 'ThS. Nguyễn Văn A (Giảng viên)',
      passwordHash,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      avatarUrl: '/images/teacher.webp',
    },
  });
  console.log(`✅ Giáo viên: ${teacher.email} (ID: ${teacher.id.toString()})`);

  // 3. Tạo Tài khoản Học sinh 1
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@classroomhub.edu.vn' },
    update: {
      fullName: 'Trần Thị Mai (Sinh viên)',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'student1@classroomhub.edu.vn',
      fullName: 'Trần Thị Mai (Sinh viên)',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      avatarUrl: '/images/student.webp',
    },
  });
  console.log(`✅ Học sinh 1: ${student1.email} (ID: ${student1.id.toString()})`);

  // 4. Tạo Tài khoản Học sinh 2
  const student2 = await prisma.user.upsert({
    where: { email: 'student2@classroomhub.edu.vn' },
    update: {
      fullName: 'Lê Hoàng Nam (Sinh viên)',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'student2@classroomhub.edu.vn',
      fullName: 'Lê Hoàng Nam (Sinh viên)',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      avatarUrl: '/images/student.webp',
    },
  });
  console.log(`✅ Học sinh 2: ${student2.email} (ID: ${student2.id.toString()})`);

  // 5. Tạo Lớp học 1 (CDDN-N02)
  const class1 = await prisma.classroom.upsert({
    where: { classCode: 'CDDN-N02' },
    update: {
      ownerId: teacher.id,
      name: '2026-2027 HỌC KỲ 1 - ĐẠI HỌC CHÍNH QUY',
      description: 'Lớp Chuyên đề Doanh nghiệp ngành Công nghệ thông tin',
      status: ClassStatus.ACTIVE,
    },
    create: {
      ownerId: teacher.id,
      classCode: 'CDDN-N02',
      name: '2026-2027 HỌC KỲ 1 - ĐẠI HỌC CHÍNH QUY',
      description: 'Lớp Chuyên đề Doanh nghiệp ngành Công nghệ thông tin',
      status: ClassStatus.ACTIVE,
    },
  });
  console.log(`✅ Lớp học 1: ${class1.name} (Code: ${class1.classCode})`);

  // 6. Tạo Lớp học 2 (WEB301)
  const class2 = await prisma.classroom.upsert({
    where: { classCode: 'WEB301' },
    update: {
      ownerId: teacher.id,
      name: 'HK1 2026-2027 - LẬP TRÌNH WEB NÂNG CAO',
      description: 'Lớp học phần Lập trình Web Fullstack hiện đại',
      status: ClassStatus.ACTIVE,
    },
    create: {
      ownerId: teacher.id,
      classCode: 'WEB301',
      name: 'HK1 2026-2027 - LẬP TRÌNH WEB NÂNG CAO',
      description: 'Lớp học phần Lập trình Web Fullstack hiện đại',
      status: ClassStatus.ACTIVE,
    },
  });
  console.log(`✅ Lớp học 2: ${class2.name} (Code: ${class2.classCode})`);

  // 7. Gán sinh viên vào Lớp học (ClassMembership)
  for (const st of [student1, student2]) {
    await prisma.classMembership.upsert({
      where: {
        uk_class_memberships_class_student: {
          classId: class1.id,
          studentId: st.id,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        classId: class1.id,
        studentId: st.id,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.classMembership.upsert({
      where: {
        uk_class_memberships_class_student: {
          classId: class2.id,
          studentId: st.id,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        classId: class2.id,
        studentId: st.id,
        status: MembershipStatus.ACTIVE,
      },
    });
  }
  console.log('✅ Đã thêm sinh viên vào các lớp học (ClassMemberships active)');

  // 8. Tạo Khóa học (Course) cho Lớp 1
  let course1 = await prisma.course.findFirst({
    where: { classId: class1.id, title: 'Chuyên đề Doanh nghiệp_ Nhóm 02' },
  });
  if (!course1) {
    course1 = await prisma.course.create({
      data: {
        classId: class1.id,
        title: 'Chuyên đề Doanh nghiệp_ Nhóm 02',
        orderIndex: 1,
      },
    });
  }
  console.log(`✅ Khóa học 1: ${course1.title} (ID: ${course1.id.toString()})`);

  // Tạo các Module & Lesson cho Khóa học 1
  // Module 1: Chung
  let mod1 = await prisma.module.findFirst({
    where: { courseId: course1.id, title: 'Chung' },
  });
  if (!mod1) {
    mod1 = await prisma.module.create({
      data: {
        courseId: course1.id,
        title: 'Chung',
        orderIndex: 1,
      },
    });
  }

  const les1 = await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod1.id,
        orderIndex: 1,
      },
    },
    update: {
      title: 'Tham gia group zalo chung',
      content: 'Sinh viên tham gia nhóm Zalo chung để cập nhật thông báo giảng viên: https://zalo.me/g/edu-group-2026',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod1.id,
      title: 'Tham gia group zalo chung',
      content: 'Sinh viên tham gia nhóm Zalo chung để cập nhật thông báo giảng viên: https://zalo.me/g/edu-group-2026',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod1.id,
        orderIndex: 2,
      },
    },
    update: {
      title: 'Thông báo về kế hoạch thực tập doanh nghiệp',
      content: 'Kế hoạch tiếp nhận thực tập bắt đầu từ tuần thứ 4. Đề nghị các nhóm liên hệ với doanh nghiệp tiếp nhận.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod1.id,
      title: 'Thông báo về kế hoạch thực tập doanh nghiệp',
      content: 'Kế hoạch tiếp nhận thực tập bắt đầu từ tuần thứ 4. Đề nghị các nhóm liên hệ với doanh nghiệp tiếp nhận.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  // Module 2: Chương trình sinh hoạt công dân
  let mod2 = await prisma.module.findFirst({
    where: { courseId: course1.id, title: 'Chương trình sinh hoạt công dân đầu năm học đối với sinh viên hệ đại chính quy' },
  });
  if (!mod2) {
    mod2 = await prisma.module.create({
      data: {
        courseId: course1.id,
        title: 'Chương trình sinh hoạt công dân đầu năm học đối với sinh viên hệ đại chính quy',
        orderIndex: 2,
      },
    });
  }

  const les3 = await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod2.id,
        orderIndex: 1,
      },
    },
    update: {
      title: 'Chương trình sinh hoạt công dân đầu năm học 2026-2027',
      content: 'Quy chế đào tạo học chế tín chỉ, quy định chuẩn đầu ra ngoại ngữ TOEIC/IELTS và tin học MOS.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2.id,
      title: 'Chương trình sinh hoạt công dân đầu năm học 2026-2027',
      content: 'Quy chế đào tạo học chế tín chỉ, quy định chuẩn đầu ra ngoại ngữ TOEIC/IELTS và tin học MOS.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod2.id,
        orderIndex: 2,
      },
    },
    update: {
      title: 'Các thông báo và quy định khen thưởng kỷ luật',
      content: 'Quy chế công tác sinh viên, đánh giá điểm rèn luyện và xét học bổng khuyến khích học tập.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2.id,
      title: 'Các thông báo và quy định khen thưởng kỷ luật',
      content: 'Quy chế công tác sinh viên, đánh giá điểm rèn luyện và xét học bổng khuyến khích học tập.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  // Module 3: Chuyên đề tư tưởng Hồ Chí Minh
  let mod3 = await prisma.module.findFirst({
    where: { courseId: course1.id, title: 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh năm 2026' },
  });
  if (!mod3) {
    mod3 = await prisma.module.create({
      data: {
        courseId: course1.id,
        title: 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh năm 2026',
        orderIndex: 3,
      },
    });
  }

  const les5 = await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod3.id,
        orderIndex: 1,
      },
    },
    update: {
      title: 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh',
      content: 'Chuyên đề học tập lý luận chính trị và vận dụng thực tiễn trong đổi mới sáng tạo số.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod3.id,
      title: 'Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh',
      content: 'Chuyên đề học tập lý luận chính trị và vận dụng thực tiễn trong đổi mới sáng tạo số.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod3.id,
        orderIndex: 2,
      },
    },
    update: {
      title: 'Tài liệu PDF liên quan chuyên đề',
      content: 'Tài liệu học tập đính kèm dạng file PDF phục vụ nghiên cứu và viết bài thu hoạch cá nhân.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod3.id,
      title: 'Tài liệu PDF liên quan chuyên đề',
      content: 'Tài liệu học tập đính kèm dạng file PDF phục vụ nghiên cứu và viết bài thu hoạch cá nhân.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  // Thêm một bài nháp (DRAFT) để test phân quyền Giáo viên thấy - Học sinh ẩn
  await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod3.id,
        orderIndex: 3,
      },
    },
    update: {
      title: 'Đề bài bài tập thu hoạch chuyên đề (Bản nháp)',
      content: 'Đề bài đang được giảng viên soạn thảo, học sinh chưa nhìn thấy bài học này.',
      status: LessonStatus.DRAFT,
      publishedAt: null,
    },
    create: {
      moduleId: mod3.id,
      title: 'Đề bài bài tập thu hoạch chuyên đề (Bản nháp)',
      content: 'Đề bài đang được giảng viên soạn thảo, học sinh chưa nhìn thấy bài học này.',
      status: LessonStatus.DRAFT,
      publishedAt: null,
      orderIndex: 3,
    },
  });

  // Thêm một bài học LINK Google Meet vào Module 1 của Khóa 1
  const les1_3 = await prisma.lesson.upsert({
    where: {
      uk_lessons_module_order: {
        moduleId: mod1.id,
        orderIndex: 3,
      },
    },
    update: {
      title: 'Phòng học trực tuyến Google Meet hướng dẫn học phần',
      content: 'Đường dẫn phòng học Meet: https://meet.google.com/cddn-group2',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod1.id,
      title: 'Phòng học trực tuyến Google Meet hướng dẫn học phần',
      content: 'Đường dẫn phòng học Meet: https://meet.google.com/cddn-group2',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 3,
    },
  });

  // =========================================================================
  // 8.2 TẠO KHÓA HỌC 2 CHO LỚP HỌC 2 (WEB301 - LẬP TRÌNH WEB NÂNG CAO)
  // =========================================================================
  let course2 = await prisma.course.findFirst({
    where: { classId: class2.id, title: 'Lập trình ứng dụng Web Fullstack hiện đại' },
  });
  if (!course2) {
    course2 = await prisma.course.create({
      data: {
        classId: class2.id,
        title: 'Lập trình ứng dụng Web Fullstack hiện đại',
        orderIndex: 1,
      },
    });
  }
  console.log(`✅ Khóa học 2: ${course2.title} (ID: ${course2.id.toString()})`);

  // Module 2.1: Tổng quan & Chuẩn bị môi trường
  let mod2_1 = await prisma.module.findFirst({
    where: { courseId: course2.id, title: 'Tổng quan môn học & Chuẩn bị môi trường' },
  });
  if (!mod2_1) {
    mod2_1 = await prisma.module.create({
      data: {
        courseId: course2.id,
        title: 'Tổng quan môn học & Chuẩn bị môi trường',
        orderIndex: 1,
      },
    });
  }

  const c2_les1 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_1.id, orderIndex: 1 } },
    update: {
      title: 'Tham gia nhóm Zalo lớp WEB301',
      content: 'Link nhóm Zalo chính thức của học phần: https://zalo.me/g/web301-fullstack',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_1.id,
      title: 'Tham gia nhóm Zalo lớp WEB301',
      content: 'Link nhóm Zalo chính thức của học phần: https://zalo.me/g/web301-fullstack',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  const c2_les2 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_1.id, orderIndex: 2 } },
    update: {
      title: 'Đường dẫn phòng học trực tuyến Google Meet',
      content: 'Phòng học lý thuyết online: https://meet.google.com/web301-lecture',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_1.id,
      title: 'Đường dẫn phòng học trực tuyến Google Meet',
      content: 'Phòng học lý thuyết online: https://meet.google.com/web301-lecture',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  const c2_les3 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_1.id, orderIndex: 3 } },
    update: {
      title: 'Tài liệu hướng dẫn cài đặt Node.js LTS, PostgreSQL & Docker (PDF)',
      content: 'Tài liệu hướng dẫn cấu hình môi trường phát triển: https://cdn.eduhub.vn/docs/setup-environment.pdf',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_1.id,
      title: 'Tài liệu hướng dẫn cài đặt Node.js LTS, PostgreSQL & Docker (PDF)',
      content: 'Tài liệu hướng dẫn cấu hình môi trường phát triển: https://cdn.eduhub.vn/docs/setup-environment.pdf',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 3,
    },
  });

  // Module 2.2: Kiến trúc Backend với NestJS & RESTful API
  let mod2_2 = await prisma.module.findFirst({
    where: { courseId: course2.id, title: 'Kiến trúc Backend với NestJS & RESTful API' },
  });
  if (!mod2_2) {
    mod2_2 = await prisma.module.create({
      data: {
        courseId: course2.id,
        title: 'Kiến trúc Backend với NestJS & RESTful API',
        orderIndex: 2,
      },
    });
  }

  const c2_les4 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_2.id, orderIndex: 1 } },
    update: {
      title: 'Bài 1: Giới thiệu Dependency Injection & Cấu trúc Modular trong NestJS',
      content: 'Kiến trúc Module, Controller, Service và nguyên lý Inversion of Control trong NestJS framework hiện đại.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_2.id,
      title: 'Bài 1: Giới thiệu Dependency Injection & Cấu trúc Modular trong NestJS',
      content: 'Kiến trúc Module, Controller, Service và nguyên lý Inversion of Control trong NestJS framework hiện đại.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  const c2_les5 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_2.id, orderIndex: 2 } },
    update: {
      title: 'Slide bài giảng Thiết kế Database & Prisma ORM (PDF)',
      content: 'Slide bài giảng thiết kế lược đồ quan hệ và tối ưu truy vấn: https://cdn.eduhub.vn/slides/prisma-database-design.pdf',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_2.id,
      title: 'Slide bài giảng Thiết kế Database & Prisma ORM (PDF)',
      content: 'Slide bài giảng thiết kế lược đồ quan hệ và tối ưu truy vấn: https://cdn.eduhub.vn/slides/prisma-database-design.pdf',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_2.id, orderIndex: 3 } },
    update: {
      title: 'Thông báo yêu cầu bài tập lớn giữa kỳ (Đồ án nhóm 3-4 bạn)',
      content: 'Yêu cầu các nhóm sinh viên đăng ký đề tài trước tuần 5. Hạn nộp báo cáo tiến độ và code repository là tuần 8.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_2.id,
      title: 'Thông báo yêu cầu bài tập lớn giữa kỳ (Đồ án nhóm 3-4 bạn)',
      content: 'Yêu cầu các nhóm sinh viên đăng ký đề tài trước tuần 5. Hạn nộp báo cáo tiến độ và code repository là tuần 8.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 3,
    },
  });

  await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_2.id, orderIndex: 4 } },
    update: {
      title: 'Tiêu chí chấm điểm đồ án kết thúc học phần (Bản nháp)',
      content: 'Rubric đánh giá tính năng, giao diện UI/UX, bảo mật và báo cáo phản biện (Đang được giảng viên hoàn thiện).',
      status: LessonStatus.DRAFT,
      publishedAt: null,
    },
    create: {
      moduleId: mod2_2.id,
      title: 'Tiêu chí chấm điểm đồ án kết thúc học phần (Bản nháp)',
      content: 'Rubric đánh giá tính năng, giao diện UI/UX, bảo mật và báo cáo phản biện (Đang được giảng viên hoàn thiện).',
      status: LessonStatus.DRAFT,
      publishedAt: null,
      orderIndex: 4,
    },
  });

  // Module 2.3: Phát triển giao diện người dùng với Next.js 15 App Router
  let mod2_3 = await prisma.module.findFirst({
    where: { courseId: course2.id, title: 'Phát triển giao diện người dùng với Next.js 15 App Router' },
  });
  if (!mod2_3) {
    mod2_3 = await prisma.module.create({
      data: {
        courseId: course2.id,
        title: 'Phát triển giao diện người dùng với Next.js 15 App Router',
        orderIndex: 3,
      },
    });
  }

  const c2_les8 = await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_3.id, orderIndex: 1 } },
    update: {
      title: 'Bài 2: Phân biệt Server Components và Client Components trong Next.js',
      content: 'Cơ chế Rendering tối ưu trong Next.js App Router, Hydration, Streaming SSR và quản lý state trên Client.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_3.id,
      title: 'Bài 2: Phân biệt Server Components và Client Components trong Next.js',
      content: 'Cơ chế Rendering tối ưu trong Next.js App Router, Hydration, Streaming SSR và quản lý state trên Client.',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { uk_lessons_module_order: { moduleId: mod2_3.id, orderIndex: 2 } },
    update: {
      title: 'Tài liệu API Swagger và Postman Collection',
      content: 'Đường dẫn tài liệu API tương tác để tích hợp Frontend: http://localhost:5000/api/docs',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      moduleId: mod2_3.id,
      title: 'Tài liệu API Swagger và Postman Collection',
      content: 'Đường dẫn tài liệu API tương tác để tích hợp Frontend: http://localhost:5000/api/docs',
      status: LessonStatus.PUBLISHED,
      publishedAt: new Date(),
      orderIndex: 2,
    },
  });

  // =========================================================================
  // 9. TẠO TIẾN ĐỘ HỌC TẬP MẪU (LessonProgress) CHO SINH VIÊN
  // =========================================================================
  // Student 1: Hoàn thành bài 1, 3, và bài Meet ở Course 1; Hoàn thành bài 1, 4 ở Course 2
  for (const les of [les1, les3, les1_3]) {
    await prisma.lessonProgress.upsert({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId: les.id,
          studentId: student1.id,
        },
      },
      update: { isCompleted: true, completedAt: new Date() },
      create: {
        lessonId: les.id,
        studentId: student1.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  for (const les of [c2_les1, c2_les4]) {
    await prisma.lessonProgress.upsert({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId: les.id,
          studentId: student1.id,
        },
      },
      update: { isCompleted: true, completedAt: new Date() },
      create: {
        lessonId: les.id,
        studentId: student1.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  // Student 2: Hoàn thành bài 1, 5 ở Course 1; Hoàn thành bài 1, 2, 3 ở Course 2
  for (const les of [les1, les5]) {
    await prisma.lessonProgress.upsert({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId: les.id,
          studentId: student2.id,
        },
      },
      update: { isCompleted: true, completedAt: new Date() },
      create: {
        lessonId: les.id,
        studentId: student2.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  for (const les of [c2_les1, c2_les2, c2_les3, c2_les8]) {
    await prisma.lessonProgress.upsert({
      where: {
        uk_lesson_progress_lesson_student: {
          lessonId: les.id,
          studentId: student2.id,
        },
      },
      update: { isCompleted: true, completedAt: new Date() },
      create: {
        lessonId: les.id,
        studentId: student2.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  console.log('✅ Đã tạo tiến độ học tập mẫu (LessonProgress) cho các sinh viên');
  console.log('🎉 Hoàn thành seed dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
