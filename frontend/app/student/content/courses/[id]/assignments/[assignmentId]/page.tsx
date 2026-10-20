"use client";

import { useParams } from "next/navigation";
import AssignmentView from "@/app/components/course-view/AssignmentView";

export default function StudentAssignmentPage() {
  const params = useParams();
  return (
    <AssignmentView
      courseId={String(params.id)}
      assignmentId={String(params.assignmentId)}
      role="STUDENT"
      backHref="/student/content"
    />
  );
}
