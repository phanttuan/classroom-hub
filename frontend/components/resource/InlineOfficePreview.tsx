"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchResourcePreview } from "@/lib/api/resource-api";

export type OfficeKind = "docx" | "sheet";

/** Word (.docx) hay bảng tính (.xlsx/.xls/.csv) — các loại trình xem nội bộ render được ngay trong trang */
export function officeKindOf(mimeType: string, fileName: string): OfficeKind | null {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  if (mime.includes("wordprocessingml.document") || name.endsWith(".docx")) return "docx";
  if (mime.includes("spreadsheetml.sheet") || mime.includes("ms-excel") || mime === "text/csv" || /\.(xlsx|xls|csv)$/.test(name))
    return "sheet";
  return null;
}

interface InlineOfficePreviewProps {
  resourceId: string;
  fileName: string;
  mimeType: string;
}

/**
 * Xem trực tiếp Word / Excel ngay trong trang (không mở modal): tải tệp qua signed URL rồi render
 * bằng docx-preview hoặc xlsx — cùng cách với DocumentPreview nhưng nhúng được vào bố cục.
 */
export default function InlineOfficePreview({ resourceId, fileName, mimeType }: InlineOfficePreviewProps) {
  const kind = officeKindOf(mimeType, fileName);
  const docxRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [sheetHtml, setSheetHtml] = useState("");
  const workbookRef = useRef<import("xlsx").WorkBook | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const preview = await fetchResourcePreview(resourceId);
        const res = await fetch(preview.url);
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Liên kết tài liệu đã hết hạn." : `HTTP ${res.status}`);
        if (kind === "docx") {
          const blob = await res.blob();
          if (!active || !docxRef.current) return;
          const docx = await import("docx-preview");
          docxRef.current.innerHTML = "";
          await docx.renderAsync(blob, docxRef.current);
        } else {
          const buffer = await res.arrayBuffer();
          if (!active) return;
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(buffer, { type: "array" });
          workbookRef.current = workbook;
          const names = workbook.SheetNames ?? [];
          setSheetNames(names);
          const first = names[0] ?? "";
          setActiveSheet(first);
          if (first) setSheetHtml(XLSX.utils.sheet_to_html(workbook.Sheets[first], { editable: false }));
        }
        if (active) setStatus("ready");
      } catch (err) {
        if (!active) return;
        setError((err as Error)?.message || "Không hiển thị được tài liệu");
        setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [resourceId, kind]);

  // Đổi sheet đang xem
  useEffect(() => {
    const wb = workbookRef.current;
    if (!wb || !activeSheet || !wb.Sheets[activeSheet]) return;
    let active = true;
    import("xlsx").then((XLSX) => {
      if (active) setSheetHtml(XLSX.utils.sheet_to_html(wb.Sheets[activeSheet], { editable: false }));
    });
    return () => {
      active = false;
    };
  }, [activeSheet]);

  if (!kind) return null;

  return (
    <div className="relative">
      {status === "loading" && (
        <div className="grid h-[40vh] place-items-center text-slate-500">
          <span className="flex items-center gap-2 text-[13px]">
            <Loader2 className="h-5 w-5 animate-spin text-[#0f6cbf]" /> Đang tải tài liệu {kind === "docx" ? "Word" : "bảng tính"}…
          </span>
        </div>
      )}
      {status === "error" && (
        <div className="m-5 rounded-xl bg-amber-50 p-4 text-[13.5px] text-amber-800">
          Không xem trực tiếp được ({error}). Hãy tải tệp xuống để chấm.
        </div>
      )}
      {kind === "docx" ? (
        <div
          ref={docxRef}
          className={`docx-inline max-h-[78vh] overflow-auto bg-slate-100 p-3 ${status === "ready" ? "" : "hidden"}`}
        />
      ) : (
        status === "ready" && (
          <div>
            {sheetNames.length > 1 && (
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                {sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveSheet(name)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                      activeSheet === name ? "bg-[#0f6cbf] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div
              className="spreadsheet-container max-h-[70vh] overflow-auto p-3 font-mono text-xs"
              dangerouslySetInnerHTML={{ __html: sheetHtml }}
            />
          </div>
        )
      )}
    </div>
  );
}
