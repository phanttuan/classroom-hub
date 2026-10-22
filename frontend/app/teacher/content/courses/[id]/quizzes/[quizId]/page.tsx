"use client";

import { useParams } from "next/navigation";
import QuizView from "@/app/components/course-view/QuizView";

export default function TeacherQuizPage() {
  const params = useParams();
  return <QuizView courseId={String(params.id)} quizId={String(params.quizId)} role="TEACHER" backHref="/teacher/content/courses" />;
}
