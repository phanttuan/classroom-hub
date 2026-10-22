"use client";

import { useParams } from "next/navigation";
import QuizAttemptRunner from "@/app/components/course-view/QuizAttemptRunner";

export default function StudentQuizAttemptPage() {
  const params = useParams();
  return <QuizAttemptRunner courseId={String(params.id)} quizId={String(params.quizId)} attemptId={String(params.attemptId)} />;
}
