"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
import TeacherShell, { Toast } from "../components/TeacherShell";
import { fetchUserProfile, updateUserProfile, changeUserPassword } from "@/lib/api/user-api";
import type { UserProfile } from "@/lib/types/user";

type ProfileTab = "info" | "password";

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-4
}

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

const defaultProfileUser: UserProfile = {
  id: "gv-001",
  email: "teacher@eduhub.com",
  fullName: "Nguyễn Văn A",
  avatarUrl: "/images/teacher.webp",
  role: "TEACHER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export default function TeacherProfilePage() {
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<ProfileTab>("info");
  const [loading, setLoading] = useState(false);

  // Dữ liệu người dùng từ CSDL (khởi tạo đồng nhất giữa SSR và Client để triệt tiêu lỗi Hydration)
  const [user, setUser] = useState<UserProfile>(defaultProfileUser);

  // Form chỉnh sửa (chỉ gồm các trường thực tế trong Database)
  const [name, setName] = useState(defaultProfileUser.fullName);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Form đổi mật khẩu
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState({ cur: false, nw: false, cf: false });
  const [pwError, setPwError] = useState("");

  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    // 1. Tải ngay từ localStorage sau khi hydrate xong
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const cached = JSON.parse(raw);
        const normalized: UserProfile = {
          id: cached.id ? String(cached.id) : "gv-001",
          fullName: cached.fullName || defaultProfileUser.fullName,
          email: cached.email || defaultProfileUser.email,
          role: cached.role || defaultProfileUser.role,
          status: cached.status || defaultProfileUser.status,
          avatarUrl: cached.avatarUrl || defaultProfileUser.avatarUrl,
          createdAt: cached.createdAt || defaultProfileUser.createdAt,
        };
        setUser(normalized);
        setName(normalized.fullName);
        setAvatarUrl(cached.avatarUrl && cached.avatarUrl !== "/images/teacher.webp" ? cached.avatarUrl : "");
      }
    } catch {}

    // 2. Tải dữ liệu mới nhất từ CSDL qua API /users/me
    async function loadData() {
      try {
        const u = await fetchUserProfile();
        if (u) {
          const normalized: UserProfile = {
            id: u.id ? String(u.id) : "gv-001",
            fullName: u.fullName || "Nguyễn Văn A",
            email: u.email || "",
            role: u.role || "TEACHER",
            status: u.status || "ACTIVE",
            avatarUrl: u.avatarUrl || "/images/teacher.webp",
            createdAt: u.createdAt,
          };
          setUser(normalized);
          setName(normalized.fullName);
          setAvatarUrl(u.avatarUrl && u.avatarUrl !== "/images/teacher.webp" ? u.avatarUrl : "");
          try {
            const raw = localStorage.getItem("user");
            const existing = raw ? JSON.parse(raw) : {};
            localStorage.setItem("user", JSON.stringify({ ...existing, ...normalized }));
          } catch {}
        }
      } catch (err: unknown) {
        console.error("Failed to load user profile", err);
      }
    }
    loadData();
  }, []);

  const dirtyInfo = useMemo(
    () => name !== user.fullName || avatarUrl !== (user.avatarUrl ?? "") || avatarPreview !== null,
    [name, avatarUrl, avatarPreview, user],
  );

  const pickAvatar = (f: File | undefined) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(f.type)) {
      showToast("Chỉ chấp nhận ảnh định dạng JPG, PNG");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      showToast("Ảnh tối đa 2MB");
      return;
    }
    const previewUrl = URL.createObjectURL(f);
    setAvatarPreview(previewUrl);
    setAvatarUrl(previewUrl);
  };

  const saveInfo = async () => {
    if (name.trim().length < 2) {
      setFormError("Họ và tên phải có ít nhất 2 ký tự.");
      return;
    }
    setFormError("");
    setLoading(true);
    try {
      const updated = await updateUserProfile({
        fullName: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setUser(updated);
      setName(updated.fullName);
      setAvatarUrl(updated.avatarUrl ?? "");
      setAvatarPreview(null);
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("user");
          const existing = raw ? JSON.parse(raw) : {};
          localStorage.setItem("user", JSON.stringify({ ...existing, ...updated }));
        } catch {}
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: updated }));
      }
      showToast("Đã lưu thay đổi hồ sơ thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật hồ sơ";
      setFormError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetInfo = () => {
    setName(user.fullName || "Nguyễn Văn A");
    setAvatarUrl(user.avatarUrl && user.avatarUrl !== "/images/teacher.webp" ? user.avatarUrl : "");
    setAvatarPreview(null);
    setFormError("");
  };

  const changePassword = async () => {
    if (!cur) { setPwError("Vui lòng nhập mật khẩu hiện tại."); return; }
    if (nw.length < 8) { setPwError("Mật khẩu mới phải có tối thiểu 8 ký tự."); return; }
    if (nw !== cf) { setPwError("Xác nhận mật khẩu chưa khớp."); return; }
    if (cur === nw) { setPwError("Mật khẩu mới không được trùng với mật khẩu hiện tại."); return; }
    setPwError("");
    setLoading(true);
    try {
      const res = await changeUserPassword({ currentPassword: cur, newPassword: nw });
      setCur("");
      setNw("");
      setCf("");
      showToast(res.message || "Đã đổi mật khẩu thành công");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đổi mật khẩu thất bại";
      setPwError(msg);
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = avatarPreview || user.avatarUrl || "/images/teacher.webp";
  const strength = passwordStrength(nw);
  const strengthLabel = ["Yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][strength];
  const strengthColor = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-green-500", "bg-green-600"][strength];

  const tabs: { id: ProfileTab; label: string; Icon: typeof User }[] = [
    { id: "info", label: "Thông tin cá nhân", Icon: User },
    { id: "password", label: "Đổi mật khẩu", Icon: Lock },
  ];

  return (
    <TeacherShell
      activeId="profile"
      userProfile={user}
      searchPlaceholder="Tìm kiếm học sinh, khóa học, bài tập, kiểm tra..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <h1 className="text-[26px] font-extrabold tracking-tight">Hồ sơ cá nhân</h1>
      <p className="mt-0.5 text-[14px] text-slate-500">Quản lý thông tin tài khoản, ảnh đại diện và bảo mật của bạn</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Cột trái */}
        <div className="min-w-0 space-y-4">
          {/* Thẻ hồ sơ tổng quan */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <div className="h-full w-full overflow-hidden rounded-full bg-slate-200 ring-2 ring-slate-100">
                  {avatarSrc.startsWith("blob:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt={user.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <Image src={avatarSrc} alt={user.fullName} width={96} height={96} unoptimized className="h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Đổi ảnh đại diện"
                  title="Đổi ảnh đại diện"
                  className="absolute -bottom-1 -right-1 z-10 grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-[19px]">{user.fullName}</b>
                  <span className="whitespace-nowrap rounded-md bg-blue-100/80 px-2 py-0.5 text-[11.5px] font-medium text-blue-600">
                    {user.role === "TEACHER" ? "Giáo viên" : user.role === "ADMIN" ? "Quản trị viên" : "Học sinh"}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${user.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${user.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} />
                    {user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
                  </span>
                </span>
                <span className="mt-2 space-y-1 text-[13px] text-slate-500 block">
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {user.email}</span>
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Tham gia: {formatDate(user.createdAt)}</span>
                </span>
              </span>
              <button onClick={() => { setTab("info"); showToast("Chỉnh sửa thông tin ở biểu mẫu bên dưới"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-4 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa hồ sơ
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" aria-label="Chọn ảnh đại diện"
              onChange={(e) => pickAvatar(e.target.files?.[0])} />
          </section>

          {/* Tabs */}
          <section className="rounded-xl border border-slate-200/70 bg-white">
            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 px-3.5 pb-3 pt-3.5 text-[13.5px] font-medium ${tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  <t.Icon className="h-4 w-4" /> {t.label}
                  {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "info" && (
                <div>
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><User className="h-5 w-5 text-blue-600" /> Thông tin tài khoản</h2>
                  <p className="mt-1 text-[13px] text-slate-500">Các thông tin được lưu trữ và đồng bộ trực tiếp với hệ thống cơ sở dữ liệu.</p>
                  
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Họ và tên <span className="text-red-500">*</span></label>
                          <input value={name || ""} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Email đăng nhập <span className="text-red-500">*</span></label>
                          <span className="relative block">
                            <input value={user.email || ""} disabled className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 pr-10 text-sm text-slate-400 outline-none" />
                            <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Mã định danh (ID)</label>
                          <input value={user.id ? `#${user.id}` : "#1"} disabled className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-400 outline-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Vai trò</label>
                          <input value={user.role === "TEACHER" ? "Giáo viên" : user.role === "ADMIN" ? "Quản trị viên" : "Học sinh"} disabled className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-400 outline-none" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Trạng thái</label>
                          <input value={user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"} disabled className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-400 outline-none" />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[13px] text-slate-600">Đường dẫn ảnh đại diện (Avatar URL)</label>
                        <input value={avatarUrl || ""} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>

                      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{formError}</p>}
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={resetInfo} disabled={!dirtyInfo || loading} className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Hủy</button>
                        <button onClick={saveInfo} disabled={!dirtyInfo || loading} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                          {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-[13px] text-slate-600">Ảnh đại diện</p>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 transition hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                      >
                        <div className="relative h-20 w-20">
                          <div className="h-full w-full overflow-hidden rounded-full bg-slate-200 ring-2 ring-slate-100">
                            {avatarSrc.startsWith("blob:") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarSrc} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <Image src={avatarSrc} alt="Preview" width={80} height={80} unoptimized className="h-full w-full object-cover" />
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-white shadow ring-2 ring-white">
                            <Camera className="h-3 w-3" />
                          </span>
                        </div>
                        <span className="mt-2.5 text-[13px] font-medium text-slate-600">Chọn ảnh mới</span>
                        <span className="mt-0.5 text-[11.5px] text-slate-400">Hỗ trợ: JPG, PNG (tối đa 2MB)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "password" && (
                <div className="mx-auto max-w-[520px]">
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><Lock className="h-5 w-5 text-blue-600" /> Đổi mật khẩu</h2>
                  <p className="mt-1 text-[13px] text-slate-500">Mật khẩu mới phải có tối thiểu 8 ký tự và khác mật khẩu hiện tại.</p>

                  <div className="mt-4 space-y-3.5">
                    {([
                      ["Mật khẩu hiện tại", cur, setCur, show.cur, "cur"],
                      ["Mật khẩu mới", nw, setNw, show.nw, "nw"],
                      ["Xác nhận mật khẩu mới", cf, setCf, show.cf, "cf"],
                    ] as const).map(([label, val, set, visible, key]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-[13px] text-slate-600">{label} *</label>
                        <span className="relative block">
                          <input type={visible ? "text" : "password"} value={val} onChange={(e) => set(e.target.value)} placeholder="••••••••"
                            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                          <button onClick={() => setShow((s) => ({ ...s, [key]: !visible }))} aria-label={visible ? "Ẩn" : "Hiện"}
                            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100">
                            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      </div>
                    ))}
                    {nw && (
                      <div>
                        <span className="mb-1 block text-[12px] text-slate-500">Độ mạnh: <b>{strengthLabel}</b></span>
                        <span className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (<span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? strengthColor : "bg-slate-100"}`} />))}
                        </span>
                      </div>
                    )}
                    {pwError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{pwError}</p>}
                    <div className="flex justify-end pt-2">
                      <button onClick={changePassword} disabled={loading} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                        {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Cột phải: Thông tin hệ thống thực tế */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><ShieldCheck className="h-5 w-5 text-blue-600" /> Thông tin tài khoản</h2>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Mã người dùng</dt><dd className="font-semibold text-slate-700">#{user.id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Vai trò</dt><dd className="font-semibold text-blue-600">{user.role === "TEACHER" ? "Giáo viên" : user.role === "ADMIN" ? "Quản trị viên" : "Học sinh"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Ngày tham gia</dt><dd className="font-medium">{formatDate(user.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Trạng thái</dt><dd className={`flex items-center gap-1.5 font-medium ${user.status === "ACTIVE" ? "text-green-600" : "text-red-600"}`}><span className={`h-2 w-2 rounded-full ${user.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"}`} /> {user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><KeyRound className="h-5 w-5 text-blue-600" /> Bảo mật & Đăng nhập</h2>
            <ul className="mt-3 space-y-3 text-[13px]">
              <li className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><KeyRound className="h-4 w-4" /></span>
                <span className="flex-1"><b className="block">Mật khẩu</b><span className="tracking-widest text-slate-400">••••••••</span></span>
                <button onClick={() => setTab("password")} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Đổi mật khẩu</button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <Toast message={toast} />
    </TeacherShell>
  );
}
