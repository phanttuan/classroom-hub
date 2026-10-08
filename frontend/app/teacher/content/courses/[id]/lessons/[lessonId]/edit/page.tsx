"use client";

import { useParams } from "next/navigation";
import LessonEditor from "@/app/components/course-view/LessonEditor";

export default function EditLessonPage() {
  const params = useParams();
  return <LessonEditor courseId={String(params.id)} lessonId={String(params.lessonId)} />;
}
