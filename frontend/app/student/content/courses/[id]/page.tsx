"use client";

import { useParams } from "next/navigation";
import CourseDetailView from "@/app/components/course-view/CourseDetailView";

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = String(params?.id || "1");

  return (
    <CourseDetailView
      courseId={courseId}
      role="STUDENT"
      backHref="/student/content"
    />
  );
}
