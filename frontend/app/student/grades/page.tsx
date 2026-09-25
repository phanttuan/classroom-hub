"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock, FileText, Search } from "lucide-react";
import StudentShell from "../components/StudentShell";
import { Donut, StatCard } from "../components/student-shared";
import { gradeRows } from "@/lib/mock/student";

const SEMESTERS = ["Học kỳ 1 (2026 - 2027)", "Học kỳ 2 (2026 - 2027)"];

function LineChart({ data }: { data: { label: string; value: number | null }[] }) {
  const W = 300;
  const H = 150;
  const PAD = 8;
  const y = (v: number) => H - 24 - (v / 10) * (H - 48);
  const pts = data.map((d, i) => ({ ...d, x: PAD + (i * (W - PAD * 2)) / Math.max(1, data.length - 1) }));
  const line = pts.filter((p) => p.value !== null).map((p) => `${p.x},${y(p.value as number)}`).join(" ");
  const area = `${PAD},${H - 24} ${line} ${W - PAD},${H - 24}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 2, 4, 6, 8, 10].map((g) => (
        <g key={g}>
          <line x1={PAD} x2={W - PAD} y1={y(g)} y2={y(g)} stroke="#eef2f7" strokeWidth="1" />
          <text x={0} y={y(g) + 3} fontSize="9" fill="#94a3b8">{g}</text>
        </g>
      ))}
      <polygon points={area} fill="rgba(37,99,235,0.10)" />
      <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) =>
        p.value === null ? null : (
          <g key={p.label}>
            <circle cx={p.x} cy={y(p.value)} r="3.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5">
              <title>{`${p.label}: ${p.value.toFixed(1)}`}</title>
            </circle>
            <text x={p.x} y={H - 8} fontSize="9" fill="#64748b" textAnchor="middle">{p.label}</text>
          </g>
        ),
      )}
    </svg>
  );
}

export default function StudentGradesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [classFilter, setClassFilter] = useState("Tất cả lớp học");
  const [query, setQuery] = useState("");
  const [detailCode, setDetailCode] = useState("WEB301");

  const isHK1 = semester === SEMESTERS[0];

  const rows = useMemo(() => {
    if (!isHK1) return [];
    const q = (query || topSearch).trim().toLowerCase();
    return gradeRows.filter((r) => {
      if (classFilter !== "Tất cả lớp học" && r.code !== classFilter) return false;
      if (q && !`${r.name} ${r.code}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [isHK1, classFilter, query, topSearch]);

  const done = gradeRows.filter((r) => r.result === "pass");
  const avg = done.length === 0 ? 0 : Math.round((done.reduce((s, r) => s + (r.total ?? 0), 0) / done.length) * 100) / 100;
  const detail = gradeRows.find((r) => r.code === detailCode) ?? gradeRows[0];

  const rankRows = [
    { label: "Xuất sắc", range: "3.6 - 4.0", count: 0, bar: "bg-slate-100", w: 2 },
    { label: "Giỏi", range: "3.2 - 3.59", count: 2, bar: "bg-green-500", w: 34 },
    { label: "Khá", range: "2.5 - 3.19", count: 3, bar: "bg-blue-600", w: 62 },
    { label: "Trung bình", range: "2.0 - 2.49", count: 1, bar: "bg-orange-400", w: 22 },
    { label: "Yếu", range: "< 2.0", count: 0, bar: "bg-red-500", w: 2 },
  ];

  return (
    <StudentShell activeId="grades" searchPlaceholder="Tìm kiếm lớp học, bài học, tài liệu, bài kiểm tra..." searchValue={topSearch} onSearchChange={setTopSearch}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-tight">Sổ điểm</h1>
          <p className="mt-0.5 text-[14px] text-slate-500">Xem điểm số và kết quả học tập của bạn trong các học kỳ</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1.6fr]">
            <label className="block text-[12.5px] text-slate-500">Học kỳ
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-2.5 text-[13px] outline-none ring-1 ring-slate-200">
                {SEMESTERS.map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <label className="block text-[12.5px] text-slate-500">Lớp học
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-white px-2.5 text-[13px] outline-none ring-1 ring-slate-200">
                {["Tất cả lớp học", "WEB301", "PY101", "DB201", "DSA201", "UI201", "BE301"].map((o) => (<option key={o}>{o}</option>))}
              </select>
            </label>
            <span className="relative block self-end">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm môn học..."
                className="h-10 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] outline-none ring-1 ring-slate-200 placeholder:text-slate-400" />
            </span>
          </div>

          {isHK1 ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={<BarChart3 className="h-6 w-6" />} iconCls="bg-blue-50 text-blue-600" value={avg.toFixed(2)} label="Điểm trung bình học kỳ" />
                <StatCard icon={<CheckCircle2 className="h-6 w-6" />} iconCls="bg-green-50 text-green-600" value="5 / 6" label="Đã hoàn thành môn" />
                <StatCard icon={<Clock className="h-6 w-6" />} iconCls="bg-orange-50 text-orange-500" value="1" label="Đang học" />
                <StatCard icon={<FileText className="h-6 w-6" />} iconCls="bg-red-50 text-red-500" value="0" label="Môn chưa đạt" />
              </div>

              <section className="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white">
                <h2 className="px-4 pt-4 text-[15px] font-extrabold">Danh sách môn học</h2>
                <div className="overflow-x-auto">
                  <table className="mt-1 w-full min-w-[760px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-slate-400">
                        <th className="px-4 py-2.5 font-medium">#</th>
                        <th className="font-medium">Môn học</th>
                        <th className="font-medium">Mã lớp</th>
                        <th className="text-center font-medium">Số tín chỉ</th>
                        <th className="text-center font-medium">Điểm quá trình (40%)</th>
                        <th className="text-center font-medium">Điểm cuối kỳ (60%)</th>
                        <th className="text-center font-medium">Điểm tổng kết</th>
                        <th className="pr-4 text-center font-medium">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r, i) => (
                        <tr key={r.code} onClick={() => setDetailCode(r.code)} className={`cursor-pointer transition hover:bg-blue-50/50 ${detailCode === r.code ? "bg-blue-50/60" : ""}`}>
                          <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                          <td className="py-3">
                            <span className="flex items-center gap-2.5">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-lg">{r.icon}</span>
                              <span><b className="block">{r.name}</b><span className="block text-[11.5px] text-slate-400">{r.teacher}</span></span>
                            </span>
                          </td>
                          <td className="text-slate-500">{r.code}</td>
                          <td className="text-center">{r.credits}</td>
                          <td className="text-center">{r.midterm === null ? "-" : r.midterm.toFixed(1)}</td>
                          <td className="text-center">{r.final === null ? "-" : r.final.toFixed(1)}</td>
                          <td className="text-center font-extrabold">{r.total === null ? "-" : r.total.toFixed(1)}</td>
                          <td className="pr-4 text-center">
                            {r.result === "pass"
                              ? <span className="whitespace-nowrap rounded-md bg-green-100/80 px-2.5 py-1 text-[11.5px] font-medium text-green-700">Đạt</span>
                              : <span className="whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-[11.5px] font-medium text-blue-600">Đang học</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Không tìm thấy môn học nào.</p>}
              </section>

              <section className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-extrabold">🔷 Chi tiết điểm môn học</h2>
                  <select value={detailCode} onChange={(e) => setDetailCode(e.target.value)} className="h-10 rounded-lg bg-white px-3 text-[13px] outline-none ring-1 ring-slate-200" aria-label="Chọn môn">
                    {gradeRows.map((r) => (<option key={r.code} value={r.code}>{r.name} ({r.code})</option>))}
                  </select>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead>
                      <tr className="text-[12px] text-slate-400">
                        <th className="py-2 font-medium">Thành phần đánh giá</th>
                        <th className="text-center font-medium">Tỷ lệ (%)</th>
                        <th className="text-center font-medium">Điểm đạt được</th>
                        <th className="text-center font-medium">Điểm tối đa</th>
                        <th className="text-right font-medium">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.detail.map((d) => (
                        <tr key={d.label}>
                          <td className="py-2.5">{d.label}</td>
                          <td className="text-center text-slate-500">{d.ratio}</td>
                          <td className="text-center font-bold text-green-600">{d.score === null ? "-" : d.score.toFixed(1)}</td>
                          <td className="text-center">{d.max}</td>
                          <td className="text-right text-slate-500">{d.note}</td>
                        </tr>
                      ))}
                      <tr className="bg-green-50/70 font-bold">
                        <td className="py-2.5 text-green-700">Điểm tổng kết</td>
                        <td className="text-center">100%</td>
                        <td className="text-center text-green-600">{detail.total === null ? "-" : detail.total.toFixed(1)}</td>
                        <td className="text-center">10</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
              Học kỳ 2 chưa có dữ liệu điểm (demo).
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold">🎓 Kết quả học tập</h2>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="h-9 rounded-lg bg-white px-2 text-[12px] outline-none ring-1 ring-slate-200" aria-label="Học kỳ">
                {SEMESTERS.map((o) => (<option key={o}>{o}</option>))}
              </select>
            </div>
            <div className="mt-2"><Donut pct={83} centerTop="3.46" centerBottom="Điểm TB" /></div>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Đạt (5) <b className="ml-auto">83%</b></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Đang học (1) <b className="ml-auto">17%</b></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Chưa đạt (0) <b className="ml-auto">0%</b></li>
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-100 p-2.5 text-center">
                <p className="text-[16px] font-extrabold">18 / 21</p>
                <p className="text-[11px] text-slate-400">Tổng số tín chỉ</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-2.5 text-center">
                <p className="text-[16px] font-extrabold">3</p>
                <p className="text-[11px] text-slate-400">Số môn học</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold">📊 Biểu đồ điểm số</h2>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="h-9 rounded-lg bg-white px-2 text-[12px] outline-none ring-1 ring-slate-200" aria-label="Học kỳ">
                {SEMESTERS.map((o) => (<option key={o}>{o}</option>))}
              </select>
            </div>
            <div className="relative mt-1">
              <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">PY101<br />9.0</span>
              <div className="pt-10">
                <LineChart data={[{ label: "WEB301", value: 8.3 }, { label: "PY101", value: 9.0 }, { label: "DB201", value: 7.1 }, { label: "UI201", value: 8.2 }]} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/70 bg-white p-4">
            <h2 className="text-[15px] font-extrabold">🎓 Xếp loại học tập ⓘ</h2>
            <ul className="mt-2.5 space-y-2 text-[12.5px]">
              {rankRows.map((r) => (
                <li key={r.label} className="flex items-center gap-2">
                  <span className="w-[70px] shrink-0 font-medium">{r.label}</span>
                  <span className="w-[70px] shrink-0 text-slate-400">{r.range}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${r.bar}`} style={{ width: `${Math.max(r.w, 2)}%` }} />
                  </span>
                  <b className="w-4 text-right">{r.count}</b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

    </StudentShell>
  );
}
