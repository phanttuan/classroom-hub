'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Download,
  RotateCw,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  File,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  fetchResourcePreview,
  triggerResourceDownload,
} from '@/lib/api/resource-api';
import { toast } from '@/app/components/common/Toast';
import type { ResourcePreviewResponse } from '@/lib/types/resource';

interface DocumentPreviewProps {
  resourceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialFileName?: string;
  initialFileSize?: number | string;
  initialMimeType?: string;
}

function formatFileSize(bytes?: number | string): string {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeCategory(mimeType: string, filename: string): 'pdf' | 'docx' | 'sheet' | 'image' | 'video' | 'other' {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerName = (filename || '').toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerMime.includes('wordprocessingml.document') ||
    lowerName.endsWith('.docx')
  ) {
    return 'docx';
  }
  if (
    lowerMime.includes('spreadsheetml.sheet') ||
    lowerMime.includes('ms-excel') ||
    lowerMime === 'text/csv' ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.csv')
  ) {
    return 'sheet';
  }
  if (
    lowerMime.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lowerName)
  ) {
    return 'image';
  }
  if (
    lowerMime.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov|mkv)$/i.test(lowerName)
  ) {
    return 'video';
  }

  return 'other';
}

function FileTypeIcon({ category }: { category: string }) {
  switch (category) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'sheet':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-purple-500" />;
    case 'video':
      return <FileVideo className="h-5 w-5 text-amber-500" />;
    default:
      return <File className="h-5 w-5 text-slate-500" />;
  }
}

export default function DocumentPreview({
  resourceId,
  isOpen,
  onClose,
  initialFileName,
  initialFileSize,
  initialMimeType,
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ResourcePreviewResponse | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetHtml, setSheetHtml] = useState<string>('');

  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const retryCountRef = useRef<number>(0);

  const loadPreview = useCallback(async (isRetry = false) => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchResourcePreview(resourceId);
      setPreviewData(data);
      retryCountRef.current = 0;
    } catch (err: any) {
      if (!isRetry && retryCountRef.current === 0) {
        // Tự động retry 1 lần khi URL hoặc phiên gặp sự cố (401/403)
        retryCountRef.current += 1;
        await loadPreview(true);
        return;
      }
      setError(
        err?.message || 'Không thể tải đường dẫn xem trước của tài liệu này.',
      );
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    if (isOpen && resourceId) {
      retryCountRef.current = 0;
      setSheetNames([]);
      setSheetHtml('');
      loadPreview(false);
    } else {
      setPreviewData(null);
      setError(null);
    }
  }, [isOpen, resourceId, loadPreview]);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Render file DOCX
  useEffect(() => {
    if (!previewData?.url || !docxContainerRef.current) return;
    const category = getFileTypeCategory(
      previewData.mimeType || initialMimeType || '',
      previewData.fileName || initialFileName || '',
    );

    if (category !== 'docx') return;

    let isMounted = true;
    const container = docxContainerRef.current;
    container.innerHTML = '<div class="text-center py-8 text-slate-500">Đang chuẩn bị nội dung tài liệu Word...</div>';

    async function renderDocx() {
      try {
        const response = await fetch(previewData!.url);
        if (response.status === 401 || response.status === 403) {
          // Token hết hạn, tự làm mới
          if (retryCountRef.current === 0) {
            retryCountRef.current += 1;
            await loadPreview(true);
            return;
          }
          throw new Error('Liên kết tài liệu đã hết hạn.');
        }

        const blob = await response.blob();
        if (!isMounted) return;

        const docx = await import('docx-preview');
        container.innerHTML = '';
        await docx.renderAsync(blob, container);
      } catch (err: any) {
        if (!isMounted) return;
        container.innerHTML = `
          <div class="p-6 text-center text-slate-500">
            <p class="text-sm font-medium text-red-600 mb-2">Không thể hiển thị xem trước tài liệu Word trực tiếp.</p>
            <p class="text-xs text-slate-400">Bạn có thể tải tài liệu về máy tính để đọc bằng Microsoft Word.</p>
          </div>
        `;
      }
    }

    renderDocx();

    return () => {
      isMounted = false;
    };
  }, [previewData, initialMimeType, initialFileName, loadPreview]);

  // Render file Excel / CSV
  useEffect(() => {
    if (!previewData?.url) return;
    const category = getFileTypeCategory(
      previewData.mimeType || initialMimeType || '',
      previewData.fileName || initialFileName || '',
    );

    if (category !== 'sheet') return;

    let isMounted = true;

    async function renderSpreadsheet() {
      try {
        const response = await fetch(previewData!.url);
        if (response.status === 401 || response.status === 403) {
          if (retryCountRef.current === 0) {
            retryCountRef.current += 1;
            await loadPreview(true);
            return;
          }
          throw new Error('Liên kết tài liệu đã hết hạn.');
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const names = workbook.SheetNames || [];
        setSheetNames(names);

        const currentSheet = activeSheet || names[0];
        setActiveSheet(currentSheet);

        if (currentSheet && workbook.Sheets[currentSheet]) {
          const html = XLSX.utils.sheet_to_html(workbook.Sheets[currentSheet], {
            id: 'spreadsheet-table',
            editable: false,
          });
          setSheetHtml(html);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setSheetHtml('');
      }
    }

    renderSpreadsheet();

    return () => {
      isMounted = false;
    };
  }, [previewData, activeSheet, initialMimeType, initialFileName, loadPreview]);

  const handleDownload = async () => {
    if (!resourceId) return;
    try {
      setDownloading(true);
      const fileName = previewData?.fileName || initialFileName;
      await triggerResourceDownload(resourceId, fileName);
    } catch (err: any) {
      toast.error('Không tải được tài liệu', err?.message || 'Vui lòng thử lại sau');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  const fileName = previewData?.fileName || initialFileName || 'Tài liệu bài học';
  const fileSizeStr = formatFileSize(initialFileSize);
  const mimeType = previewData?.mimeType || initialMimeType || '';
  const category = getFileTypeCategory(mimeType, fileName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
              <FileTypeIcon category={category} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate max-w-md sm:max-w-xl" title={fileName}>
                {fileName}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {category}
                </span>
                {fileSizeStr && (
                  <>
                    <span>•</span>
                    <span>{fileSizeStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadPreview(false)}
              disabled={loading}
              title="Tải lại tài liệu"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-40"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-50 overflow-auto p-4 flex flex-col items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-600">Đang tạo chữ ký bảo mật và tải tài liệu...</p>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 bg-white rounded-xl border border-red-100 shadow-sm text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-800 mb-1">Không thể tải tài liệu</h4>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => loadPreview(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1.5"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Thử lại</span>
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center space-x-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải file về máy</span>
                </button>
              </div>
            </div>
          ) : previewData?.url ? (
            <>
              {/* PDF Preview */}
              {category === 'pdf' && (
                <iframe
                  src={previewData.url}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-sm"
                  title={fileName}
                />
              )}

              {/* Word DOCX Preview */}
              {category === 'docx' && (
                <div className="w-full h-full overflow-auto bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-sm">
                  <div ref={docxContainerRef} className="max-w-4xl mx-auto docx-content" />
                </div>
              )}

              {/* Excel / CSV Spreadsheet Preview */}
              {category === 'sheet' && (
                <div className="w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Sheet tabs switcher */}
                  {sheetNames.length > 1 && (
                    <div className="flex items-center space-x-1 px-4 py-2 border-b border-slate-200 bg-slate-50 overflow-x-auto">
                      {sheetNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => setActiveSheet(name)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            activeSheet === name
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div
                    className="flex-1 overflow-auto p-4 text-xs font-mono spreadsheet-container"
                    dangerouslySetInnerHTML={{ __html: sheetHtml }}
                  />
                </div>
              )}

              {/* Image Preview */}
              {category === 'image' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewData.url}
                    alt={fileName}
                    className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                </div>
              )}

              {/* Video Preview */}
              {category === 'video' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <video
                    src={previewData.url}
                    controls
                    className="max-h-[72vh] max-w-full rounded-xl shadow-lg border border-slate-900 bg-black"
                  />
                </div>
              )}

              {/* Fallback for PPT, PPTX, ZIP, or others */}
              {category === 'other' && (
                <div className="max-w-md p-8 bg-white rounded-2xl border border-slate-200 shadow-md text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4">
                    <File className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">
                    Xem trước định dạng này chưa được hỗ trợ trực tiếp
                  </h4>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Tài liệu <strong className="text-slate-700">{fileName}</strong> có định dạng đặc thù. Vui lòng tải xuống máy để mở bằng ứng dụng chuyên dụng.
                  </p>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full py-3 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>{downloading ? 'Đang chuẩn bị tải về...' : 'Tải file xuống máy'}</span>
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-400">
            {previewData?.url && (
              <a
                href={previewData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 hover:underline"
              >
                <span>Mở trong tab mới</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Đóng
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || !previewData?.url}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? 'Đang tải...' : 'Tải xuống'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

