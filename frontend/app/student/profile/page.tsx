"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  ShieldCheck,
  User,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { fetchUserProfile, updateUserProfile, changeUserPassword } from "@/lib/api/user-api";
import type { UserProfile } from "@/lib/types/user";

function formatDate(dateStr?: string) {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function StudentProfilePage() {
  const [topSearch, setTopSearch] = useState("");
  const [user, setUser] = useState<UserProfile>({
    id: "2",
    email: "student@eduhub.com",
    fullName: "Em Trần Văn An",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300",
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  });

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.fullName);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ cur: "", nw: "", cf: "" });
  const [showPw, setShowPw] = useState({ cur: false, nw: false, cf: false });
  const [pwError, setPwError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const u = await fetchUserProfile();
        setUser(u);
        setDraftName(u.fullName);
        setDraftAvatarUrl(u.avatarUrl ?? "");
      } catch (err: unknown) {
        console.error("Failed to load user profile", err);
      }
    }
    loadData();
  }, []);

  const saveEdit = async () => {
    if (!draftName.trim()) { showToast("Họ và tên không được để trống"); return; }
    if (draftName.trim().length < 2) { showToast("Họ và tên ít nhất 2 ký tự"); return; }
    setLoading(true);
    try {
      const updated = await updateUserProfile({
        fullName: draftName.trim(),
        avatarUrl: draftAvatarUrl.trim() || undefined,
      });
      setUser(updated);
      setDraftName(updated.fullName);
      setDraftAvatarUrl(updated.avatarUrl ?? "");
      setAvatarPreview(null);
      setEditing(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: updated }));
      }
      showToast("Đã cập nhật thông tin thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu thay đổi";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveAvatarOnly = async () => {
    setLoading(true);
    try {
      const updated = await updateUserProfile({
        fullName: user.fullName,
        avatarUrl: draftAvatarUrl.trim() || undefined,
      });
      setUser(updated);
      setDraftAvatarUrl(updated.avatarUrl ?? "");
      setAvatarPreview(null);
      setAvatarModalOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: updated }));
      }
      showToast("Đã cập nhật ảnh đại diện thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu ảnh đại diện";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pw.cur) { setPwError("Vui lòng nhập mật khẩu hiện tại."); return; }
    if (pw.nw.length < 8) { setPwError("Mật khẩu mới phải có tối thiểu 8 ký tự."); return; }
    if (pw.nw !== pw.cf) { setPwError("Xác nhận mật khẩu chưa khớp."); return; }
    if (pw.cur === pw.nw) { setPwError("Mật khẩu mới không được trùng với mật khẩu hiện tại."); return; }
    setPwError("");
    setLoading(true);
    try {
      const res = await changeUserPassword({ currentPassword: pw.cur, newPassword: pw.nw });
      setPw({ cur: "", nw: "", cf: "" });
      setPwOpen(false);
      showToast(res.message || "Đã đổi mật khẩu thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đổi mật khẩu thất bại";
      setPwError(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = avatarPreview || user.avatarUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300";
  const modalAvatarSrc = avatarPreview || draftAvatarUrl || user.avatarUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300";

  return (
    <StudentShell
      activeId="profile"
      userProfile={user}
      searchPlaceholder="Tìm kiếm khóa học, bài giảng, tài liệu, bài tập..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <h1 className="text-[26px] font-extrabold tracking-tight">Hồ sơ cá nhân</h1>
      <p className="mt-0.5 text-[14px] text-slate-500">Quản lý thông tin tài khoản học viên và bảo mật</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          {/* Cover / Header */}
          <section className="relative overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-100 p-5">
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <div className="h-full w-full overflow-hidden rounded-full bg-white ring-4 ring-white/70">
                  {avatarSrc.startsWith("blob:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt={user.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <Image src={avatarSrc} alt={user.fullName} width={96} height={96} unoptimized className="h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraftAvatarUrl(user.avatarUrl ?? "");
                    setAvatarPreview(null);
                    setAvatarModalOpen(true);
                  }}
                  aria-label="Đổi ảnh đại diện"
                  title="Đổi ảnh đại diện"
                  className="absolute -bottom-1 -right-1 z-10 grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[19px] font-extrabold">{user.fullName}</p>
                  <span className="rounded-md bg-blue-600/10 px-2 py-0.5 text-[11.5px] font-medium text-blue-600">
                    {user.role === "STUDENT" ? "Học sinh" : user.role === "TEACHER" ? "Giáo viên" : "Quản trị viên"}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${user.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${user.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
                    {user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-slate-500 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" /> {user.email}
                </p>
                <p className="text-[12.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> Ngày tham gia: {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Chọn ảnh"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 2 * 1024 * 1024) { showToast("Ảnh tối đa 2MB"); return; }
                  setAvatarPreview(URL.createObjectURL(f));
                  showToast("Đã xem trước ảnh mới. Nhập URL hoặc bấm Lưu ảnh đại diện.");
                }
              }} />
          </section>

          {/* Chi tiết tài khoản */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" /> Thông tin tài khoản
                </h2>
                <p className="text-[13px] text-slate-500 mt-0.5">Dữ liệu được quản lý và bảo mật bởi hệ thống Classroom Hub</p>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-100">
                  <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700">Họ và tên *</label>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700">Đường dẫn ảnh đại diện (Avatar URL)</label>
                  <input
                    value={draftAvatarUrl}
                    onChange={(e) => {
                      setDraftAvatarUrl(e.target.value);
                      setAvatarPreview(null);
                    }}
                    placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-[11.5px] text-slate-400">Dán link ảnh trực tiếp (JPG, PNG, WebP) để lưu vào hệ thống</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setDraftName(user.fullName);
                      setDraftAvatarUrl(user.avatarUrl ?? "");
                      setAvatarPreview(null);
                      setEditing(false);
                    }}
                    disabled={loading}
                    className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <dt className="text-slate-400">Họ và tên</dt>
                  <dd className="mt-1 font-semibold text-slate-800 text-[14px]">{user.fullName}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <dt className="text-slate-400">Email đăng nhập</dt>
                  <dd className="mt-1 font-semibold text-slate-800 text-[14px] flex items-center gap-2">
                    {user.email} <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <dt className="text-slate-400">Mã định danh (ID)</dt>
                  <dd className="mt-1 font-semibold text-slate-800 text-[14px]">#{user.id}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3.5">
                  <dt className="text-slate-400">Vai trò</dt>
                  <dd className="mt-1 font-semibold text-blue-600 text-[14px]">
                    {user.role === "STUDENT" ? "Học sinh" : user.role === "TEACHER" ? "Giáo viên" : "Quản trị viên"}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3.5 sm:col-span-2">
                  <dt className="text-slate-400">Đường dẫn ảnh đại diện</dt>
                  <dd className="mt-1 font-semibold text-slate-800 text-[13px] truncate">
                    {user.avatarUrl ? (
                      <a href={user.avatarUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {user.avatarUrl}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Mặc định hệ thống</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        </div>

        {/* Cột phải */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="text-[15px] font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Bảo mật tài khoản</h2>
            <ul className="mt-3 space-y-3 text-[13px]">
              <li className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span className="flex-1"><b className="block">Mật khẩu</b><span className="text-[12px] text-slate-400 tracking-widest">••••••••</span></span>
                <button onClick={() => { setPwError(""); setPwOpen(true); }} className="rounded-lg border border-blue-200 px-3.5 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Đổi mật khẩu</button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Đổi mật khẩu tài khoản" widthClass="max-w-[420px]">
        <div className="space-y-3">
          {([
            ["Mật khẩu hiện tại", "cur"],
            ["Mật khẩu mới", "nw"],
            ["Xác nhận mật khẩu mới", "cf"],
          ] as const).map(([label, key]) => (
            <div key={key}>
              <label className="block text-[13px] font-medium text-slate-600 mb-1">{label} *</label>
              <span className="relative block">
                <input
                  type={showPw[key] ? "text" : "password"}
                  value={pw[key]}
                  onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3.5 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                  aria-label={showPw[key] ? "Ẩn" : "Hiện"}
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                >
                  {showPw[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </div>
          ))}
          {pwError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{pwError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setPwOpen(false)} disabled={loading} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40">Hủy</button>
            <button onClick={changePassword} disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} title="Cập nhật ảnh đại diện" widthClass="max-w-[440px]">
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative h-24 w-24">
              <div className="h-full w-full overflow-hidden rounded-full bg-slate-200 ring-4 ring-blue-50">
                {modalAvatarSrc.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={modalAvatarSrc} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Image src={modalAvatarSrc} alt="Preview" width={96} height={96} unoptimized className="h-full w-full object-cover" />
                )}
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500">Xem trước ảnh đại diện</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">
              Đường dẫn ảnh đại diện (Avatar URL)
            </label>
            <input
              type="url"
              value={draftAvatarUrl}
              onChange={(e) => {
                setDraftAvatarUrl(e.target.value);
                setAvatarPreview(null);
              }}
              placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <p className="mt-1 text-[11.5px] text-slate-400">
              Dán đường dẫn ảnh trực tiếp (JPG, PNG, WebP) để lưu vào cơ sở dữ liệu
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 text-center">
            <p className="text-[12px] text-slate-500 mb-2">Hoặc chọn ảnh từ máy để xem trước</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Camera className="h-3.5 w-3.5 text-slate-500" /> Chọn tệp từ máy
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setDraftAvatarUrl(user.avatarUrl ?? "");
                setAvatarPreview(null);
                setAvatarModalOpen(false);
              }}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={saveAvatarOnly}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? "Đang lưu..." : "Lưu ảnh đại diện"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
