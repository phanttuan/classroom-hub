import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduLearn | Học sinh",
  description: "Không gian học tập của học sinh: lớp học, bài tập, kiểm tra, điểm số và lịch học.",
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
