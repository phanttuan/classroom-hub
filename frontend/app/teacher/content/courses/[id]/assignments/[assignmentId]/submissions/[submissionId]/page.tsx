"use client";

import { useParams } from "next/navigation";
import GradingView from "@/app/components/course-view/GradingView";

export default function TeacherGradeSubmissionPage() {
  const params = useParams();
  return (
    <GradingView
      courseId={String(params.id)}
      assignmentId={String(params.assignmentId)}
      submissionId={String(params.submissionId)}
    />
  );
}
