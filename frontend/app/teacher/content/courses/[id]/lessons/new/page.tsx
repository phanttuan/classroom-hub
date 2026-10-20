"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import LessonEditor, { type EditorActivityType } from "@/app/components/course-view/LessonEditor";

const TYPES: EditorActivityType[] = ["PAGE", "FILE", "FOLDER", "URL", "LABEL", "ASSIGNMENT", "QUIZ"];

function NewLessonContent() {
  const params = useParams();
  const search = useSearchParams();
  const rawType = search.get("type")?.toUpperCase() as EditorActivityType | undefined;
  const assignmentId = search.get("assignmentId") ?? undefined;
  const quizId = search.get("quizId") ?? undefined;
  const sectionId = search.get("section") ?? undefined;

  return (
    <LessonEditor
      key={`${sectionId}-${rawType}-${assignmentId ?? "new"}-${quizId ?? "new"}`}
      courseId={String(params.id)}
      sectionId={sectionId}
      type={rawType && TYPES.includes(rawType) ? rawType : undefined}
      assignmentId={assignmentId}
      quizId={quizId}
    />
  );
}

/** Thêm hoặc chỉnh sửa hoạt động / tài nguyên / bài tập / đề kiểm tra: ?section=<topicId>&type=<PAGE|FILE|FOLDER|URL|LABEL|ASSIGNMENT|QUIZ>&assignmentId=...&quizId=... */
export default function NewLessonPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-[#0f6cbf]" />
        </div>
      }
    >
      <NewLessonContent />
    </Suspense>
  );
}
