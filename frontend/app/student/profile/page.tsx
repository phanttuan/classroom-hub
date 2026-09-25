"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  CheckSquare,
  Clock,
  FileText,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  Settings,
  ShieldCheck,
  Trophy,
  User,
} from "lucide-react";
import StudentShell, { Toast } from "../components/StudentShell";
import Modal from "../../teacher/components/Modal";
import { Donut } from "../components/student-shared";
import { studentProfile } from "@/lib/mock/student";

type Tab = "info" | "study" | "security" | "notif" | "settings";

export default function StudentProfilePage() {
  const [topSearch, setTopSearch] = useState("");
  const [tab, setTab] = useState<Tab>("info");
  const [profile, setProfile] = useState(studentProfile);
  const [editing, setEditing] = useState<null | "info" | "study" | "extra">(null);
  const [draft, setDraft] = useState({ name: "", phone: "", address: "", bio: "" });
  const [hobbyModal, setHobbyModal] = useState(false);
  const [hobby, setHobby] = useState("");
  const [linkModal, setLinkModal] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [links, setLinks] = useState([
    { label: profile.github, icon: "github" },
    { label: profile.linkedin, icon: "linkedin" },
  ]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ cur: "", nw: "", cf: "" });
  const [pwError, setPwError] = useState("");
  const [prefs, setPrefs] = useState({ email: true, push: true, deadline: true });
  const [theme, setTheme] = useState("light");
  const [sessions, setSessions] = useState(2);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2500);
  };

  const startEdit = (which: "info" | "study" | "extra") => {
    setDraft({ name: profile.fullName, phone: profile.phone, address: profile.address, bio: profile.bio });
    setEditing(which);
  };
  const saveEdit = () => {
    if (!draft.name.trim()) { showToast("Tên không được trống"); return; }
    setProfile((p) => ({ ...p, fullName: draft.name.trim(), phone: draft.phone.trim(), address: draft.address.trim(), bio: draft.bio }));
    setEditing(null);
    showToast("Đã lưu thay đổi");
  };

  const changePassword = () => {
    if (pw.cur.length < 6) { setPwError("Nhập mật khẩu hiện tại."); return; }
    if (pw.nw.length < 8) { setPwError("Mật khẩu mới ít nhất 8 ký tự."); return; }
    if (pw.nw !== pw.cf) { setPwError("Xác nhận chưa khớp."); return; }
    setPwError("");
    setPw({ cur: "", nw: "", cf: "" });
    setPwOpen(false);
    showToast("Đã đổi mật khẩu");
  };

  const avatarSrc = avatarPreview ?? profile.avatarUrl;
  const tabs: { id: Tab; label: string; Icon: typeof User }[] = [
    { id: "info", label: "Thông tin cá nhân", Icon: User },
    { id: "study", label: "Học tập", Icon: GraduationCap },
    { id: "security", label: "Bảo mật", Icon: Lock },
    { id: "notif", label: "Thông báo", Icon: Bell },
    { id: "settings", label: "Cài đặt", Icon: Settings },
  ];

  const infoRows = [
    ["Họ và tên", profile.fullName, User],
    ["MSSV", profile.mssv, BookOpen],
    ["Ngày sinh", profile.birthDate, BookOpen],
    ["Giới tính", profile.gender, User],
    ["Email", profile.email, Mail],
    ["Số điện thoại", profile.phone, Phone],
    ["Địa chỉ", profile.address, MapPin],
  ] as const;

  const studyRows = [
    ["Trường", "ĐH Sư phạm Kỹ thuật TP. HCM", GraduationCap],
    ["Khoa", "Công nghệ thông tin", BookOpen],
    ["Ngành", "Công nghệ thông tin", BookOpen],
    ["Chuyên ngành", "Kỹ thuật phần mềm", BookOpen],
    ["Khóa học", "2023 – 2027", BookOpen],
    ["Lớp", profile.mssv, BookOpen],
    ["Cố vấn học tập", "Thầy Cao Khải Hùng", User],
  ] as const;

  return (
    <StudentShell activeId="profile" searchPlaceholder="Tìm kiếm lớp học, bài giảng, tài liệu, bài tập..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <h1 className="text-[26px] font-extrabold tracking-tight">Hồ sơ cá nhân</h1>
      <p className="mt-0.5 text-[14px] text-slate-500">Quản lý thông tin cá nhân, xem quá trình học tập và cài đặt tài khoản</p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          {/* Cover */}
          <section className="relative overflow-hidden rounded-2xl border border-blue-100/70 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-100 p-5">
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-blue-200/40" />
            <div className="pointer-events-none absolute right-24 top-10 h-28 w-28 rounded-full bg-sky-200/40" />
            <div className="relative flex flex-wrap items-center gap-4">
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white ring-4 ring-white/70">
                {avatarPreview ? (
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
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[19px] font-extrabold">{profile.fullName}
                  <button onClick={() => startEdit("info")} aria-label="Sửa tên" className="text-blue-600 hover:text-blue-700"><Pencil className="h-4 w-4" /></button>
                </p>
                <p className="text-[12.5px] text-slate-500">MSSV: {profile.mssv}</p>
                <p className="text-[12.5px] text-slate-500">{profile.year}</p>
                <p className="text-[12.5px] text-slate-500">{profile.major}</p>
                <p className="text-[12.5px] text-slate-500">🏛 {profile.university}</p>
              </div>
              <button onClick={() => showToast("Đổi ảnh bìa (demo)")} className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3.5 py-2 text-[12.5px] font-semibold text-blue-600 ring-1 ring-blue-200 hover:bg-white">
                <ImagePlus className="h-4 w-4" /> Thay đổi ảnh bìa
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Chọn ảnh"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 2 * 1024 * 1024) { showToast("Ảnh tối đa 2MB"); return; }
                  setAvatarPreview(URL.createObjectURL(f));
                  showToast("Đã cập nhật ảnh đại diện");
                }
              }} />
          </section>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/70 bg-white px-3">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 px-3.5 pb-3 pt-3.5 text-[13px] font-medium ${tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                <t.Icon className="h-4 w-4" /> {t.label}
                {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200/70 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-extrabold">Thông tin cá nhân</h2>
                    <button onClick={() => startEdit("info")} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100"><Pencil className="h-3 w-3" /> Chỉnh sửa</button>
                  </div>
                  {editing === "info" ? (
                    <div className="space-y-2.5">
                      {[["Họ và tên", "name"], ["Số điện thoại", "phone"], ["Địa chỉ", "address"]].map(([label, key]) => (
                        <label key={key} className="block text-[12.5px] text-slate-500">{label}
                          <input value={(draft as Record<string, string>)[key]} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-300" />
                        </label>
                      ))}
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
                        <button onClick={saveEdit} className="rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 text-[13px]">
                      {infoRows.map(([label, val, Icon]) => (
                        <li key={label} className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="w-24 shrink-0 text-slate-500">{label}</span>
                          <b className="min-w-0 flex-1 truncate font-medium">{val}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200/70 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-extrabold">Thông tin học tập</h2>
                    <button onClick={() => showToast("Thông tin học tập do nhà trường quản lý (demo)")} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100"><Pencil className="h-3 w-3" /> Chỉnh sửa</button>
                  </div>
                  <ul className="space-y-2.5 text-[13px]">
                    {studyRows.map(([label, val, Icon]) => (
                      <li key={label} className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="w-24 shrink-0 text-slate-500">{label}</span>
                        <b className="min-w-0 flex-1 truncate font-medium">{val}</b>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="rounded-xl border border-slate-200/70 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-extrabold">Thông tin bổ sung</h2>
                  <button onClick={() => startEdit("extra")} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100"><Pencil className="h-3 w-3" /> Chỉnh sửa</button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="flex items-center gap-1.5 text-slate-500"><User className="h-4 w-4" /> Sở thích</span>
                  {profile.hobbies.map((h) => (
                    <span key={h} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-600">{h}</span>
                  ))}
                  <button onClick={() => setHobbyModal(true)} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600 hover:bg-blue-100">+ Thêm</button>
                </div>
                <div className="mt-3 text-[13px]">
                  <p className="flex items-center gap-1.5 text-slate-500"><BookOpen className="h-4 w-4" /> Giới thiệu bản thân</p>
                  {editing === "extra" ? (
                    <div className="mt-1.5">
                      <textarea value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-300" />
                      <div className="mt-1.5 flex justify-end gap-2">
                        <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-1.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
                        <button onClick={saveEdit} className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white">Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-600">{profile.bio}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="flex items-center gap-1.5 text-slate-500">🔗 Mạng xã hội</span>
                  {links.map((l) => (
                    <span key={l.label} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium">
                      {l.icon === "github" ? "🐙" : "💼"} {l.label}
                    </span>
                  ))}
                  <button onClick={() => setLinkModal(true)} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-100">+ Thêm liên kết</button>
                </div>
              </section>
            </>
          )}

          {tab === "study" && (
            <section className="rounded-xl border border-slate-200/70 bg-white p-4">
              <h2 className="text-[15px] font-extrabold">Quá trình học tập</h2>
              <div className="mx-auto mt-2 max-w-[220px]"><Donut pct={83} centerTop="3.46" centerBottom="Điểm TB" /></div>
              <ul className="mx-auto mt-3 max-w-[320px] space-y-1.5 text-[13px]">
                <li className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Đạt (5) <b className="ml-auto">83%</b></li>
                <li className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Đang học (1) <b className="ml-auto">17%</b></li>
              </ul>
            </section>
          )}

          {tab === "security" && (
            <section className="rounded-xl border border-slate-200/70 bg-white p-4">
              <h2 className="text-[15px] font-extrabold">Bảo mật tài khoản</h2>
              <ul className="mt-3 space-y-3 text-[13px]">
                <li className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <span className="flex-1"><b className="block">Mật khẩu</b><span className="text-[12px] text-slate-400">Đổi lần cuối 30 ngày trước</span></span>
                  <button onClick={() => { setPwError(""); setPwOpen(true); }} className="rounded-lg border border-blue-200 px-3.5 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Đổi mật khẩu</button>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span className="flex-1"><b className="block">Phiên đăng nhập</b><span className="text-[12px] text-slate-400">{sessions} thiết bị đang hoạt động</span></span>
                  <button onClick={() => showToast("Xem thiết bị (demo)")} className="rounded-lg border border-blue-200 px-3.5 py-1.5 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50">Xem thiết bị</button>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-red-50/60 px-3.5 py-3">
                  <Lock className="h-4 w-4 text-red-400" />
                  <span className="flex-1"><b className="block">Đăng xuất tất cả</b><span className="text-[12px] text-slate-400">Trừ phiên hiện tại</span></span>
                  <button onClick={() => { setSessions(1); showToast("Đã đăng xuất các phiên khác"); }} className="rounded-lg bg-red-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-red-500 hover:bg-red-100">Đăng xuất</button>
                </li>
              </ul>
            </section>
          )}

          {tab === "notif" && (
            <section className="rounded-xl border border-slate-200/70 bg-white p-4">
              <h2 className="text-[15px] font-extrabold">Cài đặt thông báo</h2>
              <ul className="mt-3 space-y-2.5 text-[13px]">
                {[["email", "Email", "Nhận qua email sinh viên"], ["push", "Thông báo đẩy", "Trên trình duyệt"], ["deadline", "Nhắc hạn nộp", "Trước hạn 1-3 ngày"]].map(([key, label, desc]) => (
                  <li key={key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span className="flex-1"><b className="block">{label}</b><span className="text-[12px] text-slate-400">{desc}</span></span>
                    <button role="switch" aria-checked={prefs[key as keyof typeof prefs]} aria-label={label as string}
                      onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${prefs[key as keyof typeof prefs] ? "bg-blue-600" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[key as keyof typeof prefs] ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-end">
                <button onClick={() => showToast("Đã lưu cài đặt thông báo")} className="rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">Lưu</button>
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="rounded-xl border border-slate-200/70 bg-white p-4">
              <h2 className="text-[15px] font-extrabold">Cài đặt hiển thị</h2>
              <p className="mt-3 text-[13px] font-medium text-slate-600">Chế độ</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[["light", "Sáng"], ["dark", "Tối"], ["system", "Hệ thống"]].map(([id, label]) => (
                  <button key={id} onClick={() => setTheme(id)} className={`rounded-xl border-2 py-2.5 text-[13px] font-semibold transition ${theme === id ? "border-blue-600 bg-blue-50/50 text-blue-600" : "border-slate-200 text-slate-500"}`}>{label}</button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={() => showToast("Đã lưu cài đặt hiển thị (demo)")} className="rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">Lưu</button>
              </div>
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold">📊 Tổng quan học tập</h2>
              <select className="h-9 rounded-lg bg-white px-2 text-[12px] outline-none ring-1 ring-slate-200" aria-label="Học kỳ" onChange={() => showToast("Đổi học kỳ (demo)")}>
                <option>Học kỳ 1 (2026 - 2027)</option>
                <option>Học kỳ 2 (2026 - 2027)</option>
              </select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-blue-50/70 p-2.5 text-center"><BookOpen className="mx-auto h-5 w-5 text-blue-600" /><b className="block text-[16px]">18 / 21</b><span className="text-[11px] text-slate-500">Số tín chỉ đã học</span></div>
              <div className="rounded-xl bg-green-50/70 p-2.5 text-center"><BarChart3 className="mx-auto h-5 w-5 text-green-600" /><b className="block text-[16px]">3.46</b><span className="text-[11px] text-slate-500">Điểm trung bình</span></div>
              <div className="rounded-xl bg-purple-50/70 p-2.5 text-center"><Trophy className="mx-auto h-5 w-5 text-purple-600" /><b className="block text-[16px]">5 / 6</b><span className="text-[11px] text-slate-500">Môn đã hoàn thành</span></div>
              <div className="rounded-xl bg-orange-50/70 p-2.5 text-center"><Clock className="mx-auto h-5 w-5 text-orange-500" /><b className="block text-[16px]">1</b><span className="text-[11px] text-slate-500">Môn đang học</span></div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">🎓 Lớp học hiện tại</h2>
              <button onClick={() => showToast("Mở danh sách lớp (demo)") } className="text-[12.5px] font-medium text-blue-600">Xem tất cả →</button>
            </div>
            <div className="mt-2.5 flex gap-2.5 rounded-xl border border-slate-100 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-[19px] font-extrabold text-blue-600">{"</>"}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 text-[13px] font-bold">Lập trình Web nâng cao
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-green-100/80 px-2 py-0.5 text-[10.5px] font-medium text-green-700">Đang học</span></p>
                <p className="text-[11.5px] text-slate-400">WEB301 - 2311ST2B</p>
                <p className="text-[11.5px] text-slate-400">Giảng viên: Nguyễn Văn A</p>
                <p className="mt-1 flex items-center gap-3 text-[11px] text-slate-400"><span>🕐 Thứ 4, 08:00 - 09:30</span><span>📍 A1-301</span></p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="text-[15px] font-extrabold">🔗 Liên kết nhanh</h2>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {[
                { icon: <KeyRound className="h-5 w-5 text-purple-600" />, label: "Đổi mật khẩu", sub: "Cập nhật mật khẩu", go: () => { setTab("security"); setPwError(""); setPwOpen(true); } },
                { icon: <Mail className="h-5 w-5 text-blue-600" />, label: "Email sinh viên", sub: "Truy cập email", go: () => showToast("Mở email sinh viên (demo)") },
                { icon: <Settings className="h-5 w-5 text-green-600" />, label: "Cài đặt thông báo", sub: "Quản lý thông báo", go: () => setTab("notif") },
                { icon: <ShieldCheck className="h-5 w-5 text-red-500" />, label: "Bảo mật tài khoản", sub: "Xem thiết bị đăng nhập", go: () => setTab("security") },
              ].map((t) => (
                <button key={t.label} onClick={t.go} className="rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40">
                  {t.icon}
                  <b className="mt-1.5 block text-[12.5px]">{t.label}</b>
                  <span className="block text-[11px] text-slate-400">{t.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2.5 text-center">
            {[
              { icon: <FileText className="mx-auto h-5 w-5 text-blue-600" />, v: "15", l: "Bài tập" },
              { icon: <CheckSquare className="mx-auto h-5 w-5 text-purple-600" />, v: "12", l: "Kiểm tra" },
              { icon: <Trophy className="mx-auto h-5 w-5 text-orange-500" />, v: "3", l: "Chứng chỉ" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-slate-200/70 bg-white p-3">
                {s.icon}<b className="mt-0.5 block text-[16px]">{s.v}</b><span className="text-[11px] text-slate-400">{s.l}</span>
              </div>
            ))}
          </section>

          <section className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white p-3.5 text-[12px] text-slate-500">
            <Monitor className="h-4 w-4 shrink-0" />
            <span>Hệ thống • Phiên bản web • <button onClick={() => showToast("Đã kiểm tra: phiên bản mới nhất")} className="font-medium text-blue-600">Kiểm tra cập nhật</button></span>
          </section>
        </div>
      </div>

      <Modal open={hobbyModal} onClose={() => setHobbyModal(false)} title="Thêm sở thích" widthClass="max-w-[400px]">
        <div className="flex gap-2">
          <input value={hobby} onChange={(e) => setHobby(e.target.value)} placeholder="VD: Chơi cờ vua"
            className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />
          <button onClick={() => {
            if (!hobby.trim()) return;
            setProfile((p) => ({ ...p, hobbies: [...p.hobbies, hobby.trim()] }));
            setHobby("");
            setHobbyModal(false);
            showToast("Đã thêm sở thích");
          }} className="shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Thêm</button>
        </div>
      </Modal>

      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Thêm liên kết" widthClass="max-w-[400px]">
        <div className="space-y-2.5">
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Nhãn hiển thị"
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..."
            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setLinkModal(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
            <button onClick={() => {
              if (!linkLabel.trim() || !linkUrl.trim()) { showToast("Nhập đủ nhãn và đường dẫn"); return; }
              setLinks((p) => [...p, { label: linkLabel.trim(), icon: "link" }]);
              setLinkLabel("");
              setLinkUrl("");
              setLinkModal(false);
              showToast("Đã thêm liên kết");
            }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Thêm</button>
          </div>
        </div>
      </Modal>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Đổi mật khẩu" widthClass="max-w-[420px]">
        <div className="space-y-2.5">
          {[["Mật khẩu hiện tại", "cur"], ["Mật khẩu mới", "nw"], ["Xác nhận mật khẩu", "cf"]].map(([label, key]) => (
            <label key={key} className="block text-[13px] text-slate-600">{label}
              <input type="password" value={pw[key as keyof typeof pw]} onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" />
            </label>
          ))}
          {pwError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{pwError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setPwOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
            <button onClick={changePassword} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Đổi mật khẩu</button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </StudentShell>
  );
}
