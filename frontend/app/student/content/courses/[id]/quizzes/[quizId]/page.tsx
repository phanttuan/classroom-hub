"use client";

import { useParams } from "next/navigation";
import QuizView from "@/app/components/course-view/QuizView";

export default function StudentQuizPage() {
  const params = useParams();
  return <QuizView courseId={String(params.id)} quizId={String(params.quizId)} role="STUDENT" backHref="/student/content" />;
}
