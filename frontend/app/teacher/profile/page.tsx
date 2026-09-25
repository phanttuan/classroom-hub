"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckSquare,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Palette,
  Pencil,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react";
import TeacherShell, { Toast } from "../components/TeacherShell";
import Modal from "../components/Modal";
import {
  departmentOptions,
  genderOptions,
  loginSessions,
  profileFull,
  profileQuickStats,
  subjectOptions,
  titleOptions,
  workInfo,
} from "@/lib/mock/teacher-profile";
import type { LoginSession } from "@/lib/types/teacher";

type ProfileTab = "info" | "password" | "notif" | "theme";

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-blue-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-4
}

const ACCENTS = [
  { id: "blue", cls: "bg-blue-600" },
  { id: "violet", cls: "bg-violet-600" },
  { id: "green", cls: "bg-green-600" },
  { id: "orange", cls: "bg-orange-500" },
  { id: "rose", cls: "bg-rose-500" },
];

export default function TeacherProfilePage() {
  const [topSearch, setTopSearch] = useState("");
  const [profile, setProfile] = useState(profileFull);
  const [tab, setTab] = useState<ProfileTab>("info");

  // form thông tin
  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [birth, setBirth] = useState(profile.birthDate);
  const [gender, setGender] = useState(profile.gender);
  const [address, setAddress] = useState(profile.address);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // chuyên môn
  const [title, setTitle] = useState(profile.title);
  const [dept, setDept] = useState(profile.department);
  const [subjects, setSubjects] = useState<string[]>(profile.subjects);
  const [bio, setBio] = useState(profile.bio);

  // mật khẩu
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState({ cur: false, nw: false, cf: false });
  const [pwError, setPwError] = useState("");

  // thông báo + giao diện
  const [prefs, setPrefs] = useState({ email: true, push: true, assignment: true, quiz: false, system: true });
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [accent, setAccent] = useState("blue");

  // bảo mật / phiên
  const [twoFA, setTwoFA] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sessions, setSessions] = useState<LoginSession[]>(loginSessions);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);

  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 2500);
  };

  const dirtyInfo = useMemo(
    () =>
      name !== profile.fullName || phone !== profile.phone || birth !== profile.birthDate ||
      gender !== profile.gender || address !== profile.address || avatarPreview !== null,
    [name, phone, birth, gender, address, avatarPreview, profile],
  );
  const dirtyPro = useMemo(
    () => title !== profile.title || dept !== profile.department || bio !== profile.bio || JSON.stringify(subjects) !== JSON.stringify(profile.subjects),
    [title, dept, bio, subjects, profile],
  );

  const pickAvatar = (f: File | undefined) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(f.type)) {
      showToast("Chỉ chấp nhận JPG, PNG");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      showToast("Ảnh tối đa 2MB");
      return;
    }
    setAvatarPreview(URL.createObjectURL(f));
  };

  const saveInfo = () => {
    if (name.trim().length < 3) { setFormError("Họ và tên ít nhất 3 ký tự."); return; }
    if (!/^[0-9][0-9\s.]{8,13}$/.test(phone.trim())) { setFormError("Số điện thoại 9-12 chữ số."); return; }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birth.trim())) { setFormError("Ngày sinh theo định dạng dd/MM/yyyy."); return; }
    setFormError("");
    setProfile((p) => ({
      ...p,
      fullName: name.trim(),
      phone: phone.trim(),
      birthDate: birth.trim(),
      gender,
      address: address.trim(),
      avatarUrl: avatarPreview ?? p.avatarUrl,
    }));
    setAvatarPreview(null);
    showToast("Đã lưu thay đổi hồ sơ");
  };
  const resetInfo = () => {
    setName(profile.fullName);
    setPhone(profile.phone);
    setBirth(profile.birthDate);
    setGender(profile.gender);
    setAddress(profile.address);
    setAvatarPreview(null);
    setFormError("");
  };

  const savePro = () => {
    if (bio.length > 500) { showToast("Giới thiệu tối đa 500 ký tự"); return; }
    setProfile((p) => ({ ...p, title, department: dept, subjects, bio }));
    showToast("Đã lưu thông tin chuyên môn");
  };

  const changePassword = () => {
    if (cur.length < 6) { setPwError("Vui lòng nhập mật khẩu hiện tại."); return; }
    if (nw.length < 8 || !/[A-Za-z]/.test(nw) || !/\d/.test(nw)) { setPwError("Mật khẩu mới ít nhất 8 ký tự, gồm chữ và số."); return; }
    if (nw !== cf) { setPwError("Xác nhận mật khẩu chưa khớp."); return; }
    setPwError("");
    setCur("");
    setNw("");
    setCf("");
    showToast("Đã đổi mật khẩu");
  };

  const verifyOtp = () => {
    if (!/^\d{6}$/.test(otp.trim())) { setOtpError("Mã gồm đúng 6 chữ số."); return; }
    setOtpError("");
    setTwoFA(true);
    setTwoFAOpen(false);
    setOtp("");
    showToast("Đã bật xác thực 2 bước");
  };

  const logoutSession = (id: string) => {
    setSessions((p) => p.filter((s) => s.id !== id));
    showToast("Đã đăng xuất phiên");
  };

  const avatarSrc = avatarPreview ?? profile.avatarUrl;
  const strength = passwordStrength(nw);
  const strengthLabel = ["Yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][strength];
  const strengthColor = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-green-500", "bg-green-600"][strength];

  const tabs: { id: ProfileTab; label: string; Icon: typeof User }[] = [
    { id: "info", label: "Thông tin cá nhân", Icon: User },
    { id: "password", label: "Đổi mật khẩu", Icon: Lock },
    { id: "notif", label: "Cài đặt thông báo", Icon: Bell },
    { id: "theme", label: "Giao diện", Icon: Palette },
  ];

  const statIcons = [CalendarDays, BookOpen, FileText, CheckSquare];
  const statColors = ["bg-blue-50 text-blue-600", "bg-green-50 text-green-600", "bg-purple-50 text-purple-600", "bg-orange-50 text-orange-500"];

  return (
    <TeacherShell activeId="profile" searchPlaceholder="Tìm kiếm học sinh, lớp học, bài tập, kiểm tra..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <h1 className="text-[26px] font-extrabold tracking-tight">Hồ sơ cá nhân</h1>
      <p className="mt-0.5 text-[14px] text-slate-500">Quản lý thông tin cá nhân, bảo mật và tùy chỉnh trải nghiệm của bạn</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Cột trái */}
        <div className="min-w-0 space-y-4">
          {/* Thẻ hồ sơ */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200">
                {avatarSrc.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt={profile.fullName} className="h-full w-full object-cover" />
                ) : (
                  <Image src={avatarSrc} alt={profile.fullName} width={96} height={96} className="h-full w-full object-cover" />
                )}
                <button onClick={() => fileRef.current?.click()} aria-label="Đổi ảnh đại diện"
                  className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white hover:bg-blue-700">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-[19px]">{profile.fullName}</b>
                  <span className="whitespace-nowrap rounded-md bg-blue-100/80 px-2 py-0.5 text-[11.5px] font-medium text-blue-600">{profile.title}</span>
                </span>
                <span className="mt-2 space-y-1.5 text-[13px] text-slate-500">
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {profile.email}</span>
                  <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {profile.phone}</span>
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {profile.address}</span>
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
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><User className="h-5 w-5 text-blue-600" /> Thông tin cá nhân</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Họ và tên <span className="text-red-500">*</span></label>
                          <input value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Email <span className="text-red-500">*</span></label>
                          <span className="relative block">
                            <input value={profile.email} disabled className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 pr-10 text-sm text-slate-400 outline-none" />
                            <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Số điện thoại</label>
                          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Ngày sinh</label>
                          <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="dd/MM/yyyy" className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] text-slate-600">Giới tính</label>
                          <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
                            {genderOptions.map((g) => (<option key={g}>{g}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] text-slate-600">Địa chỉ</label>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{formError}</p>}
                      <div className="flex justify-end gap-2">
                        <button onClick={resetInfo} disabled={!dirtyInfo} className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Hủy</button>
                        <button onClick={saveInfo} disabled={!dirtyInfo} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Lưu thay đổi</button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[13px] text-slate-600">Ảnh đại diện</p>
                      <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 transition hover:border-blue-300 hover:bg-blue-50/50">
                        <span className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                          {avatarSrc.startsWith("blob:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarSrc} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <Image src={avatarSrc} alt="Preview" width={80} height={80} className="h-full w-full object-cover" />
                          )}
                          <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-white"><Camera className="h-3 w-3" /></span>
                        </span>
                        <span className="mt-2.5 text-[13px] font-medium text-slate-600">Click để thay đổi ảnh</span>
                        <span className="mt-0.5 text-[11.5px] text-slate-400">Hỗ trợ: JPG, PNG (tối đa 2MB)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "password" && (
                <div className="mx-auto max-w-[520px]">
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><Lock className="h-5 w-5 text-blue-600" /> Đổi mật khẩu</h2>
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
                    <div className="flex justify-end">
                      <button onClick={changePassword} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Đổi mật khẩu</button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "notif" && (
                <div className="mx-auto max-w-[560px]">
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><Bell className="h-5 w-5 text-blue-600" /> Cài đặt thông báo</h2>
                  <div className="mt-4 space-y-2.5">
                    {([
                      ["email", "Email", "Nhận thông báo qua email"],
                      ["push", "Thông báo đẩy", "Hiển thị trên trình duyệt"],
                      ["assignment", "Bài tập", "Nộp bài, đến hạn, chấm điểm"],
                      ["quiz", "Kiểm tra", "Hoàn thành, sắp đến hạn"],
                      ["system", "Hệ thống", "Bảo trì, cập nhật tính năng"],
                    ] as const).map(([key, label, desc]) => (
                      <div key={key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                        <span className="flex-1"><b className="block text-[13.5px]">{label}</b><span className="block text-[12px] text-slate-400">{desc}</span></span>
                        <Toggle on={prefs[key]} onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))} label={label} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => showToast("Đã lưu cài đặt thông báo")} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Lưu cài đặt</button>
                  </div>
                </div>
              )}

              {tab === "theme" && (
                <div className="mx-auto max-w-[560px]">
                  <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><Palette className="h-5 w-5 text-blue-600" /> Giao diện</h2>
                  <p className="mt-3 text-[13px] font-medium text-slate-600">Chế độ hiển thị</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-2.5">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button key={t} onClick={() => setTheme(t)} className={`rounded-xl border-2 p-3 text-left transition ${theme === t ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}>
                        <span className={`block h-12 rounded-lg ${t === "light" ? "bg-white ring-1 ring-slate-200" : t === "dark" ? "bg-slate-900" : "bg-gradient-to-r from-white from-50% to-slate-900 to-50%"}`} />
                        <b className="mt-1.5 block text-[13px]">{t === "light" ? "Sáng" : t === "dark" ? "Tối" : "Hệ thống"}</b>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[13px] font-medium text-slate-600">Màu nhấn</p>
                  <div className="mt-1.5 flex gap-2.5">
                    {ACCENTS.map((a) => (
                      <button key={a.id} onClick={() => setAccent(a.id)} aria-label={`Màu ${a.id}`}
                        className={`grid h-10 w-10 place-items-center rounded-full ${a.cls} ring-2 ring-offset-2 transition ${accent === a.id ? "ring-slate-400" : "ring-transparent hover:ring-slate-200"}`}>
                        {accent === a.id && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => showToast(theme === "light" ? "Đã lưu giao diện (demo — web dùng chế độ Sáng)" : "Chế độ Tối/Hệ thống sẽ sớm ra mắt (demo)")} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Lưu giao diện</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Chuyên môn */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5">
            <h2 className="flex items-center gap-2 text-[15.5px] font-bold"><BookOpen className="h-5 w-5 text-blue-600" /> Thông tin chuyên môn</h2>
            <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-slate-600">Chức danh</label>
                <select value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
                  {titleOptions.map((o) => (<option key={o}>{o}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-slate-600">Khoa/Bộ môn</label>
                <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
                  {departmentOptions.map((o) => (<option key={o}>{o}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-slate-600">Môn giảng dạy chính</label>
                <select value="" onChange={(e) => { if (e.target.value && !subjects.includes(e.target.value)) setSubjects((s) => [...s, e.target.value]); }} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 outline-none" aria-label="Thêm môn giảng dạy">
                  <option value="">+ Thêm môn...</option>
                  {subjectOptions.filter((o) => !subjects.includes(o)).map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12.5px] font-medium text-blue-700">
                  {s}
                  <button onClick={() => setSubjects((p) => p.filter((x) => x !== s))} aria-label={`Xóa ${s}`} className="grid h-4 w-4 place-items-center rounded-full hover:bg-blue-200"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="mt-3.5">
              <label className="mb-1.5 block text-[13px] text-slate-600">Giới thiệu bản thân</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={600}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              <p className={`mt-1 text-right text-[12px] ${bio.length > 500 ? "font-semibold text-red-500" : "text-slate-400"}`}>{bio.length}/500</p>
            </div>
            <div className="flex justify-end">
              <button onClick={savePro} disabled={!dirtyPro} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Lưu thông tin</button>
            </div>
          </section>
        </div>

        {/* Cột phải */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><Building2 className="h-5 w-5 text-blue-600" /> Thông tin công tác</h2>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Khoa/Bộ môn</dt><dd className="text-right font-medium">{workInfo.department}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Mã giáo viên</dt><dd className="font-medium">{workInfo.staffId}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Ngày tham gia</dt><dd className="font-medium">{workInfo.joinDate}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Trạng thái</dt><dd className="flex items-center gap-1.5 font-medium text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> {workInfo.status}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><BarChart3 className="h-5 w-5 text-blue-600" /> Thống kê nhanh</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {profileQuickStats.map((s, i) => {
                const Icon = statIcons[i % statIcons.length];
                return (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-3 text-center">
                    <span className={`mx-auto grid h-9 w-9 place-items-center rounded-lg ${statColors[i % statColors.length]}`}><Icon className="h-5 w-5" /></span>
                    <b className="mt-1 block text-[19px]">{s.value}</b>
                    <span className="block text-[11.5px] text-slate-400">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><ShieldCheck className="h-5 w-5 text-blue-600" /> Bảo mật tài khoản</h2>
            <ul className="mt-3 space-y-3 text-[13px]">
              <li className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><KeyRound className="h-4 w-4" /></span>
                <span className="flex-1"><b className="block">Mật khẩu</b><span className="tracking-widest text-slate-400">••••••••</span></span>
                <button onClick={() => setTab("password")} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Đổi mật khẩu</button>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Smartphone className="h-4 w-4" /></span>
                <span className="flex-1"><b className="block">Xác thực 2 bước</b><span className="text-[12px] text-slate-400">{twoFA ? "Đã bật" : "Chưa bật"}</span></span>
                {twoFA
                  ? <span className="whitespace-nowrap rounded-lg bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-600">Đã bật</span>
                  : <button onClick={() => { setOtp(""); setOtpError(""); setTwoFAOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"><QrCode className="h-3.5 w-3.5" /> Bật</button>}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Monitor className="h-4 w-4" /></span>
                <span className="flex-1"><b className="block">Thiết bị đăng nhập</b><span className="text-[12px] text-slate-400">Quản lý các thiết bị đã đăng nhập</span></span>
                <button onClick={() => setDevicesOpen(true)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Xem chi tiết</button>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><Laptop className="h-5 w-5 text-blue-600" /> Tài khoản & phiên đăng nhập</h2>
            {sessions.filter((s) => s.current).map((s) => (
              <div key={s.id} className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px]">
                <p className="font-medium text-green-600">Phiên hiện tại</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-green-500" /> {s.device}</p>
                <p className="mt-0.5 text-[12px] text-slate-400">{s.location} • <span className="text-green-600">Đang hoạt động</span></p>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[13px] font-bold">Các phiên khác</p>
              <button onClick={() => setSessionsOpen(true)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Xem tất cả</button>
            </div>
            <ul className="mt-2 space-y-2.5">
              {sessions.filter((s) => !s.current).slice(0, 2).map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
                  <Smartphone className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1"><b className="block truncate">{s.device}</b><span className="block truncate text-[11.5px] text-slate-400">{s.location} • {s.lastActive}</span></span>
                  <button onClick={() => logoutSession(s.id)} className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-red-500 hover:bg-red-100">Đăng xuất</button>
                </li>
              ))}
              {sessions.filter((s) => !s.current).length === 0 && <li className="text-[12.5px] text-slate-400">Không còn phiên nào khác.</li>}
            </ul>
          </section>
        </div>
      </div>

      {/* Modal 2FA */}
      <Modal open={twoFAOpen} onClose={() => setTwoFAOpen(false)} title="Bật xác thực 2 bước" widthClass="max-w-[420px]">
        <div className="space-y-3 text-sm">
          <div className="grid place-items-center rounded-xl bg-slate-50 py-5">
            <QrCode className="h-20 w-20 text-slate-700" />
            <p className="mt-1.5 text-[12px] text-slate-400">Quét mã bằng Google Authenticator (demo)</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Mã xác minh 6 số *</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" placeholder="VD: 123456"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-center text-lg tracking-[0.3em] outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </div>
          {otpError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{otpError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setTwoFAOpen(false)} className="rounded-lg px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button onClick={verifyOtp} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">Xác minh</button>
          </div>
        </div>
      </Modal>

      {/* Modal tất cả phiên */}
      <Modal open={sessionsOpen} onClose={() => setSessionsOpen(false)} title="Tất cả phiên đăng nhập" widthClass="max-w-[480px]">
        <ul className="space-y-2.5 text-[13px]">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <Smartphone className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1"><b className="block">{s.device} {s.current && <span className="text-green-600">(hiện tại)</span>}</b><span className="block text-[11.5px] text-slate-400">{s.location} • {s.lastActive}</span></span>
              {!s.current && <button onClick={() => logoutSession(s.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-red-500 hover:bg-red-100"><LogOut className="h-3.5 w-3.5" /> Đăng xuất</button>}
            </li>
          ))}
          {sessions.length === 0 && <li className="text-center text-slate-400">Không còn phiên nào.</li>}
        </ul>
      </Modal>

      {/* Modal thiết bị */}
      <Modal open={devicesOpen} onClose={() => setDevicesOpen(false)} title="Thiết bị đăng nhập" widthClass="max-w-[440px]">
        <ul className="space-y-2.5 text-[13px]">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <Monitor className="h-4 w-4 shrink-0 text-slate-400" />
              <span><b className="block">{s.device}</b><span className="block text-[11.5px] text-slate-400">{s.location}</span></span>
            </li>
          ))}
        </ul>
      </Modal>

      <Toast message={toast} />
    </TeacherShell>
  );
}
