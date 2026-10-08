"use client";

import { useParams, useSearchParams } from "next/navigation";
import LessonEditor from "@/app/components/course-view/LessonEditor";
import type { LessonTypeKey } from "@/lib/types/learning-content";

const TYPES: LessonTypeKey[] = ["PAGE", "FILE", "FOLDER", "URL", "LABEL"];

/** Thêm hoạt động / tài nguyên: ?section=<topicId>&type=<PAGE|FILE|FOLDER|URL|LABEL> */
export default function NewLessonPage() {
  const params = useParams();
  const search = useSearchParams();
  const rawType = search.get("type")?.toUpperCase() as LessonTypeKey | undefined;

  return (
    <LessonEditor
      key={`${search.get("section")}-${rawType}`}
      courseId={String(params.id)}
      sectionId={search.get("section") ?? undefined}
      type={rawType && TYPES.includes(rawType) ? rawType : undefined}
    />
  );
}
