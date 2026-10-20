"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileQuestion,
  FolderOpen,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import {
  createQuestionBankQuestion,
  createQuestionSet,
  deleteQuestionBankQuestion,
  deleteQuestionSet,
  fetchQuestionBank,
  fetchQuestionSets,
  renameQuestionSet,
  updateQuestionBankQuestion,
} from "@/lib/api/quiz-api";
import type {
  QuestionBankQuestionDto,
  QuestionSetDto,
  QuestionTypeKey,
} from "@/lib/types/quiz";

type FilterKey = "all" | "unfiled" | string;

interface ChoiceDraft {
  content: string;
  isCorrect: boolean;
}

function bankErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message.trim() : "";
  if (!raw) return fallback;
  if (raw.includes("401")) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (raw.includes("403")) return "Bạn không có quyền thực hiện thao tác này.";
  if (raw.includes("404")) return "Không tìm thấy dữ liệu cần thao tác.";
  return raw;
}

function typeLabel(type: QuestionTypeKey) {
  return type === "MULTIPLE" ? "Nhiều đáp án" : "Một đáp án";
}

export default function QuestionBankPage() {
  const [sets, setSets] = useState<QuestionSetDto[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [questions, setQuestions] = useState<QuestionBankQuestionDto[]>([]);
  const [selectedKey, setSelectedKey] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | QuestionTypeKey>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [editor, setEditor] = useState<{
    question: QuestionBankQuestionDto | null;
  } | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] =
    useState<QuestionBankQuestionDto | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  const [setModal, setSetModal] = useState<{
    mode: "create" | "rename";
    set?: QuestionSetDto;
  } | null>(null);
  const [setName, setSetName] = useState("");
  const [setSaving, setSetSaving] = useState(false);
  const [setModalError, setSetModalError] = useState("");
  const [deleteSetTarget, setDeleteSetTarget] = useState<QuestionSetDto | null>(
    null,
  );
  const [deletingSet, setDeletingSet] = useState(false);

  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  };
  useEffect(
    () => () => window.clearTimeout(toastTimer.current),
    [],
  );

  const loadSets = useCallback(async () => {
    const [setsData, unfiled] = await Promise.all([
      fetchQuestionSets(),
      fetchQuestionBank(undefined, undefined, { unfiled: true }),
    ]);
    setSets(setsData);
    setUnfiledCount(unfiled.length);
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchQuestionBank(
        search,
        typeFilter === "ALL" ? undefined : typeFilter,
        selectedKey === "all"
          ? undefined
          : selectedKey === "unfiled"
            ? { unfiled: true }
            : { setId: selectedKey },
      );
      setQuestions(data);
    } catch (err) {
      setError(
        bankErrorMessage(err, "Không tải được ngân hàng câu hỏi. Vui lòng thử lại."),
      );
    } finally {
      setLoading(false);
    }
  }, [search, selectedKey, typeFilter]);

  useEffect(() => {
    loadSets().catch((err) =>
      setError(bankErrorMessage(err, "Không tải được bộ câu hỏi.")),
    );
  }, [loadSets]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadQuestions(), 250);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const totalCount = useMemo(
    () =>
      unfiledCount +
      sets.reduce((sum, set) => sum + set.questionCount, 0),
    [sets, unfiledCount],
  );

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedKey) ?? null,
    [sets, selectedKey],
  );

  const defaultSetId =
    selectedKey !== "all" && selectedKey !== "unfiled" ? selectedKey : null;

  const refreshAll = async () => {
    await Promise.all([loadSets(), loadQuestions()]);
  };

  const openCreateSet = () => {
    setSetModal({ mode: "create" });
    setSetName("");
    setSetModalError("");
  };

  const openRenameSet = (set: QuestionSetDto) => {
    setSetModal({ mode: "rename", set });
    setSetName(set.name);
    setSetModalError("");
  };

  const saveSet = async () => {
    if (!setModal) return;
    const name = setName.trim();
    if (!name) {
      setSetModalError("Tên bộ câu hỏi không được để trống.");
      return;
    }

    setSetSaving(true);
    setSetModalError("");
    try {
      if (setModal.mode === "create") {
        const created = await createQuestionSet(name);
        await loadSets();
        setSelectedKey(created.id);
        showToast(`Đã tạo bộ “${created.name}”.`);
      } else if (setModal.set) {
        const updated = await renameQuestionSet(setModal.set.id, name);
        await loadSets();
        showToast(`Đã đổi tên bộ thành “${updated.name}”.`);
      }
      setSetModal(null);
    } catch (err) {
      setSetModalError(bankErrorMessage(err, "Không lưu được bộ câu hỏi."));
    } finally {
      setSetSaving(false);
    }
  };

  const confirmDeleteSet = async () => {
    if (!deleteSetTarget) return;
    setDeletingSet(true);
    try {
      await deleteQuestionSet(deleteSetTarget.id);
      if (selectedKey === deleteSetTarget.id) setSelectedKey("all");
      await refreshAll();
      showToast(
        `Đã xóa bộ “${deleteSetTarget.name}”. Câu hỏi bên trong đã chuyển về Chưa phân bộ.`,
      );
      setDeleteSetTarget(null);
    } catch (err) {
      setError(bankErrorMessage(err, "Không xóa được bộ câu hỏi."));
    } finally {
      setDeletingSet(false);
    }
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return;
    setDeletingQuestion(true);
    try {
      await deleteQuestionBankQuestion(deleteQuestionTarget.id);
      await refreshAll();
      showToast("Đã ẩn câu hỏi khỏi ngân hàng.");
      setDeleteQuestionTarget(null);
    } catch (err) {
      setError(bankErrorMessage(err, "Không xóa được câu hỏi."));
    } finally {
      setDeletingQuestion(false);
    }
  };

  const handleQuestionSaved = async (message: string) => {
    setEditor(null);
    await refreshAll();
    showToast(message);
  };

  return (
    <TeacherShell
      activeId="question-bank"
      activeHref="/teacher/question-bank"
      searchPlaceholder="Tìm câu hỏi trong ngân hàng..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">
            Ngân hàng câu hỏi
          </h1>
          <p className="mt-1 text-[14px] text-slate-500">
            Tạo, phân loại và tái sử dụng câu hỏi cho bài kiểm tra trong mọi khóa học.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ question: null })}
          className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-4 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-[#0c599e]"
        >
          <Plus className="h-4 w-4" /> Tạo câu hỏi
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Đóng thông báo"
            className="rounded p-0.5 text-red-500 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ================= BỘ CÂU HỎI ================= */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-slate-900">Bộ câu hỏi</h2>
            <button
              type="button"
              onClick={openCreateSet}
              title="Tạo bộ câu hỏi"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0f6cbf]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            <FilterButton
              active={selectedKey === "all"}
              icon={<Layers className="h-4 w-4" />}
              label="Tất cả"
              count={totalCount}
              onClick={() => setSelectedKey("all")}
            />
            {sets.map((set) => (
              <div
                key={set.id}
                className={`group flex items-center rounded-lg transition ${
                  selectedKey === set.id
                    ? "bg-blue-50 text-[#0f6cbf]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedKey(set.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-[13.5px] font-medium"
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate" title={set.name}>
                    {set.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                      selectedKey === set.id
                        ? "bg-white/80 text-[#0f6cbf]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {set.questionCount}
                  </span>
                </button>
                <div className="flex shrink-0 items-center pr-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openRenameSet(set)}
                    title="Đổi tên bộ"
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteSetTarget(set)}
                    title="Xóa bộ"
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <FilterButton
              active={selectedKey === "unfiled"}
              icon={<FileQuestion className="h-4 w-4" />}
              label="Chưa phân bộ"
              count={unfiledCount}
              onClick={() => setSelectedKey("unfiled")}
            />
          </div>

          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] leading-relaxed text-slate-500">
            Xóa bộ chỉ bỏ phân loại, không xóa câu hỏi. Câu hỏi đã dùng trong quiz luôn
            giữ snapshot tại thời điểm thêm vào đề.
          </p>
        </aside>

        {/* ================= DANH SÁCH CÂU HỎI ================= */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">
                  {selectedKey === "all"
                    ? "Tất cả câu hỏi"
                    : selectedKey === "unfiled"
                      ? "Câu hỏi chưa phân bộ"
                      : selectedSet?.name || "Câu hỏi"}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-slate-500">
                  {questions.length} câu hỏi đang hoạt động
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm nội dung câu hỏi..."
                    className="h-9 w-full min-w-[220px] rounded-lg border border-slate-300 pl-9 pr-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as "ALL" | QuestionTypeKey)
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#0f6cbf]"
                >
                  <option value="ALL">Mọi loại</option>
                  <option value="SINGLE">Một đáp án</option>
                  <option value="MULTIPLE">Nhiều đáp án</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-14 text-[13.5px] text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#0f6cbf]" />
                Đang tải câu hỏi...
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-14 text-center">
                <FileQuestion className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 text-[14px] font-semibold text-slate-700">
                  Chưa có câu hỏi nào
                </p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {search.trim() || typeFilter !== "ALL"
                    ? "Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại."
                    : "Tạo câu hỏi đầu tiên để bắt đầu xây dựng ngân hàng."}
                </p>
                <button
                  type="button"
                  onClick={() => setEditor({ question: null })}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0c599e]"
                >
                  <Plus className="h-4 w-4" /> Tạo câu hỏi
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {questions.map((question) => (
                  <li
                    key={question.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold leading-relaxed text-slate-900">
                          {question.content}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11.5px] font-semibold text-[#0f6cbf]">
                            {typeLabel(question.questionType)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
                            {question.defaultScore} điểm
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
                            v{question.version}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
                            {question.choices.length} lựa chọn
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                              question.usageCount > 0
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {question.usageCount > 0
                              ? `${question.usageCount} quiz đang dùng`
                              : "Chưa dùng trong quiz"}
                          </span>
                          {question.setName && (
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11.5px] font-semibold text-purple-700">
                              {question.setName}
                            </span>
                          )}
                        </div>
                        {question.usageCount > 0 && (
                          <p className="mt-2 text-[12px] text-slate-500">
                            Sửa nội dung sẽ tạo phiên bản mới; quiz cũ vẫn giữ câu hỏi
                            và đáp án tại thời điểm đã thêm.
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditor({ question })}
                          title="Sửa câu hỏi"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0f6cbf]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteQuestionTarget(question)}
                          title="Xóa câu hỏi"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {editor && (
        <QuestionFormModal
          key={editor.question?.id ?? "new-question"}
          question={editor.question}
          sets={sets}
          defaultSetId={defaultSetId}
          onClose={() => setEditor(null)}
          onSaved={handleQuestionSaved}
        />
      )}

      <Modal
        open={!!setModal}
        onClose={() => !setSaving && setSetModal(null)}
        title={setModal?.mode === "create" ? "Tạo bộ câu hỏi" : "Đổi tên bộ câu hỏi"}
        widthClass="max-w-[440px]"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSet();
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Tên bộ câu hỏi
            </span>
            <input
              autoFocus
              value={setName}
              onChange={(event) => setSetName(event.target.value)}
              maxLength={255}
              placeholder="VD: Chương 1 – Giới thiệu"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
            />
          </label>
          {setModalError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
              {setModalError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={setSaving}
              onClick={() => setSetModal(null)}
              className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={setSaving}
              className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
            >
              {setSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {setModal?.mode === "create" ? "Tạo bộ" : "Lưu tên"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteSetTarget}
        onClose={() => !deletingSet && setDeleteSetTarget(null)}
        title="Xóa bộ câu hỏi?"
        widthClass="max-w-[440px]"
      >
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            Bộ <b className="text-slate-900">{deleteSetTarget?.name}</b> sẽ bị xóa.
            Các câu hỏi bên trong không bị xóa mà chuyển về{" "}
            <b className="text-slate-900">Chưa phân bộ</b>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={deletingSet}
              onClick={() => setDeleteSetTarget(null)}
              className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deletingSet}
              onClick={() => void confirmDeleteSet()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deletingSet && <Loader2 className="h-4 w-4 animate-spin" />}
              Xóa bộ
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteQuestionTarget}
        onClose={() => !deletingQuestion && setDeleteQuestionTarget(null)}
        title="Xóa câu hỏi?"
        widthClass="max-w-[480px]"
      >
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-slate-600">
            Câu hỏi sẽ bị ẩn khỏi ngân hàng và không thể chọn cho quiz mới. Quiz đã
            dùng câu hỏi này vẫn giữ nguyên nội dung snapshot.
          </p>
          {deleteQuestionTarget && (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
              {deleteQuestionTarget.content}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={deletingQuestion}
              onClick={() => setDeleteQuestionTarget(null)}
              className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deletingQuestion}
              onClick={() => void confirmDeleteQuestion()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deletingQuestion && <Loader2 className="h-4 w-4 animate-spin" />}
              Xóa câu hỏi
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}

function FilterButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition ${
        active
          ? "bg-blue-50 text-[#0f6cbf]"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
          active ? "bg-white/80 text-[#0f6cbf]" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function QuestionFormModal({
  question,
  sets,
  defaultSetId,
  onClose,
  onSaved,
}: {
  question: QuestionBankQuestionDto | null;
  sets: QuestionSetDto[];
  defaultSetId: string | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [content, setContent] = useState(question?.content ?? "");
  const [questionType, setQuestionType] = useState<QuestionTypeKey>(
    question?.questionType ?? "SINGLE",
  );
  const [defaultScore, setDefaultScore] = useState(
    question?.defaultScore ?? "1",
  );
  const [setId, setSetId] = useState(
    question ? (question.setId ?? "") : (defaultSetId ?? ""),
  );
  const [choices, setChoices] = useState<ChoiceDraft[]>(
    question
      ? question.choices.map((choice) => ({
          content: choice.content,
          isCorrect: choice.isCorrect,
        }))
      : [
          { content: "", isCorrect: true },
          { content: "", isCorrect: false },
        ],
  );
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isUsed = (question?.usageCount ?? 0) > 0;

  const changeType = (next: QuestionTypeKey) => {
    setQuestionType(next);
    if (next === "SINGLE") {
      setChoices((prev) => {
        const firstCorrect = prev.findIndex((choice) => choice.isCorrect);
        const keep = firstCorrect >= 0 ? firstCorrect : 0;
        return prev.map((choice, index) => ({
          ...choice,
          isCorrect: index === keep,
        }));
      });
    }
  };

  const toggleCorrect = (index: number) => {
    setChoices((prev) =>
      prev.map((choice, choiceIndex) => {
        if (questionType === "SINGLE") {
          return { ...choice, isCorrect: choiceIndex === index };
        }
        return choiceIndex === index
          ? { ...choice, isCorrect: !choice.isCorrect }
          : choice;
      }),
    );
  };

  const submit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setFormError("Nội dung câu hỏi không được để trống.");
      return;
    }
    if (choices.length < 2) {
      setFormError("Câu hỏi phải có ít nhất 2 lựa chọn.");
      return;
    }
    const normalizedChoices = choices.map((choice) => ({
      content: choice.content.trim(),
      isCorrect: choice.isCorrect,
    }));
    if (normalizedChoices.some((choice) => !choice.content)) {
      setFormError("Nội dung lựa chọn không được để trống.");
      return;
    }
    const correctCount = normalizedChoices.filter(
      (choice) => choice.isCorrect,
    ).length;
    if (correctCount === 0) {
      setFormError("Câu hỏi phải có ít nhất một lựa chọn đúng.");
      return;
    }
    if (questionType === "SINGLE" && correctCount !== 1) {
      setFormError("Câu hỏi một đáp án chỉ được có đúng một lựa chọn đúng.");
      return;
    }
    if (questionType === "MULTIPLE" && correctCount < 2) {
      setFormError("Câu hỏi nhiều đáp án phải có ít nhất hai lựa chọn đúng.");
      return;
    }
    const score = Number(defaultScore);
    if (!Number.isFinite(score) || score < 0.01) {
      setFormError("Điểm mặc định phải là số lớn hơn hoặc bằng 0.01.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (question) {
        const updated = await updateQuestionBankQuestion(question.id, {
          content: trimmedContent,
          questionType,
          defaultScore: score,
          setId: setId || null,
          choices: normalizedChoices,
        });
        await onSaved(
          updated.version > question.version
            ? `Đã tạo phiên bản v${updated.version}; quiz cũ vẫn giữ câu hỏi phiên bản trước.`
            : "Đã cập nhật câu hỏi.",
        );
      } else {
        await createQuestionBankQuestion({
          content: trimmedContent,
          questionType,
          defaultScore: score,
          ...(setId ? { setId } : {}),
          choices: normalizedChoices,
        });
        await onSaved("Đã thêm câu hỏi vào ngân hàng.");
      }
    } catch (err) {
      setFormError(bankErrorMessage(err, "Không lưu được câu hỏi."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={question ? "Sửa câu hỏi" : "Tạo câu hỏi mới"}
      widthClass="max-w-[760px]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="max-h-[72vh] space-y-4 overflow-y-auto pr-1"
      >
        {isUsed && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
            Câu hỏi đang được <b>{question?.usageCount} quiz</b> sử dụng. Nếu bạn sửa
            nội dung, loại câu hỏi hoặc đáp án, hệ thống sẽ tạo phiên bản mới trong
            cùng bộ câu hỏi hiện tại và giữ nguyên bản cũ cho các quiz đã tạo.
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Nội dung câu hỏi <span className="text-red-500">*</span>
          </span>
          <textarea
            autoFocus
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Nhập nội dung câu hỏi..."
            className="w-full resize-y rounded-lg border border-slate-300 px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Loại câu hỏi
            </span>
            <select
              value={questionType}
              onChange={(event) =>
                changeType(event.target.value as QuestionTypeKey)
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf]"
            >
              <option value="SINGLE">Một đáp án</option>
              <option value="MULTIPLE">Nhiều đáp án</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Điểm mặc định
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={defaultScore}
              onChange={(event) => setDefaultScore(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Bộ câu hỏi
            </span>
            <select
              value={setId}
              onChange={(event) => setSetId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf]"
            >
              <option value="">Chưa phân bộ</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-slate-700">
                Lựa chọn trả lời <span className="text-red-500">*</span>
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                {questionType === "SINGLE"
                  ? "Chọn đúng một đáp án."
                  : "Chọn ít nhất hai đáp án đúng."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setChoices((prev) => [
                  ...prev,
                  { content: "", isCorrect: false },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm lựa chọn
            </button>
          </div>

          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2"
              >
                <input
                  type={questionType === "SINGLE" ? "radio" : "checkbox"}
                  name="correct-choice"
                  checked={choice.isCorrect}
                  onChange={() => toggleCorrect(index)}
                  title="Đánh dấu đáp án đúng"
                  className="h-4 w-4 shrink-0 accent-[#0f6cbf]"
                />
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11.5px] font-bold text-slate-500">
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  value={choice.content}
                  onChange={(event) =>
                    setChoices((prev) =>
                      prev.map((item, choiceIndex) =>
                        choiceIndex === index
                          ? { ...item, content: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + index)}`}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] outline-none focus:border-[#0f6cbf] focus:ring-4 focus:ring-blue-100"
                />
                {choice.isCorrect && (
                  <span className="hidden shrink-0 items-center gap-1 text-[11.5px] font-semibold text-green-700 sm:flex">
                    <Check className="h-3.5 w-3.5" /> Đúng
                  </span>
                )}
                <button
                  type="button"
                  disabled={choices.length <= 2}
                  onClick={() =>
                    setChoices((prev) =>
                      prev.filter((_, choiceIndex) => choiceIndex !== index),
                    )
                  }
                  title="Xóa lựa chọn"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#0f6cbf] px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#0c599e] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {question ? "Lưu thay đổi" : "Tạo câu hỏi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
