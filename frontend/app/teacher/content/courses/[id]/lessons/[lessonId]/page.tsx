"use client";

import { useParams } from "next/navigation";
import LessonView from "@/app/components/course-view/LessonView";

export default function TeacherLessonPage() {
  const params = useParams();
  return (
    <LessonView
      courseId={String(params.id)}
      lessonId={String(params.lessonId)}
      role="TEACHER"
      backHref="/teacher/content/courses"
    />
  );
}
