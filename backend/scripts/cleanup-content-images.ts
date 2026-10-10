/**
 * Quét ảnh "mồ côi" trong thư mục ảnh nội dung trên Cloudinary:
 * ảnh đã tải lên trình soạn thảo nhưng bài không được lưu (bấm Hủy, đóng tab...) nên không bài nào dùng.
 * (Ảnh bị gỡ khỏi bài / bài bị xóa đã được LearningContentService dọn ngay khi lưu.)
 *
 *   npm run cleanup:content-images            → chỉ liệt kê (chạy thử)
 *   npm run cleanup:content-images -- --apply → xóa thật
 *
 * Bỏ qua ảnh mới tải lên trong 24 giờ để không xóa ảnh của bài đang soạn dở.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CONTENT_IMAGE_PREFIX } from '../src/modules/learning-content/utils/content-images.js';

const GRACE_HOURS = 24;
const apply = process.argv.includes('--apply');

const { DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!DATABASE_URL || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Thiếu DATABASE_URL hoặc CLOUDINARY_* trong .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

interface CloudinaryImage {
  public_id: string;
  created_at: string;
  bytes: number;
}

async function listContentImages(): Promise<CloudinaryImage[]> {
  const all: CloudinaryImage[] = [];
  let cursor: string | undefined;
  do {
    const res = await cloudinary.api.resources({
      resource_type: 'image',
      type: 'upload',
      prefix: CONTENT_IMAGE_PREFIX,
      max_results: 500,
      next_cursor: cursor,
    });
    all.push(...(res.resources as CloudinaryImage[]));
    cursor = res.next_cursor;
  } while (cursor);
  return all;
}

async function main() {
  const cutoff = Date.now() - GRACE_HOURS * 60 * 60 * 1000;
  const images = (await listContentImages()).filter((img) => new Date(img.created_at).getTime() < cutoff);

  const orphans: CloudinaryImage[] = [];
  for (const img of images) {
    const used = await prisma.lesson.count({
      where: { OR: [{ content: { contains: img.public_id } }, { description: { contains: img.public_id } }] },
    });
    if (used === 0) orphans.push(img);
  }

  const totalKb = Math.round(orphans.reduce((acc, i) => acc + i.bytes, 0) / 1024);
  console.log(`🔎 ${images.length} ảnh nội dung cũ hơn ${GRACE_HOURS} giờ — ${orphans.length} ảnh không bài nào dùng (${totalKb} KB)`);
  orphans.forEach((img) => console.log(`   - ${img.public_id}`));

  if (!orphans.length) return;
  if (!apply) {
    console.log('ℹ️  Chạy thử — thêm --apply để xóa: npm run cleanup:content-images -- --apply');
    return;
  }

  for (const img of orphans) {
    await cloudinary.uploader.destroy(img.public_id, { resource_type: 'image', type: 'upload', invalidate: true });
  }
  console.log(`🧹 Đã xóa ${orphans.length} ảnh mồ côi`);
}

main()
  .catch((e) => {
    console.error('❌', e?.error?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
