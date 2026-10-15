"use client";

import { useParams } from "next/navigation";
import SubmissionEditor from "@/app/components/course-view/SubmissionEditor";

export default function StudentSubmitAssignmentPage() {
  const params = useParams();
  return <SubmissionEditor courseId={String(params.id)} assignmentId={String(params.assignmentId)} />;
}
