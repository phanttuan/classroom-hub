"use client";

import { useParams } from "next/navigation";
import AssignmentView from "@/app/components/course-view/AssignmentView";

export default function TeacherAssignmentPage() {
  const params = useParams();
  return (
    <AssignmentView
      courseId={String(params.id)}
      assignmentId={String(params.assignmentId)}
      role="TEACHER"
      backHref="/teacher/content/courses"
    />
  );
}
