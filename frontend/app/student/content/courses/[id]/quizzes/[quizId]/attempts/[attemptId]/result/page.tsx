"use client";

import { useParams } from "next/navigation";
import QuizAttemptResult from "@/app/components/course-view/QuizAttemptResult";

export default function StudentQuizResultPage() {
  const params = useParams();
  return (
    <QuizAttemptResult
      courseId={String(params.id)}
      quizId={String(params.quizId)}
      attemptId={String(params.attemptId)}
      role="STUDENT"
      backHref="/student/content"
    />
  );
}
