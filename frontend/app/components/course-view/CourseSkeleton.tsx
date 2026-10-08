/** Khung xương trang khóa học khi đang tải — giữ bố cục để không bị giật khi nội dung hiện ra */
export default function CourseSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải lớp học">
      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-800/90 p-6 sm:p-8 lg:p-9">
          <div className="skeleton h-4 w-56 !bg-white/15" />
          <div className="skeleton mt-4 h-9 w-2/3 max-w-xl !bg-white/20" />
          <div className="mt-4 flex gap-4">
            <div className="skeleton h-4 w-24 !bg-white/15" />
            <div className="skeleton h-4 w-40 !bg-white/15" />
          </div>
        </div>
        <div className="mt-3 flex gap-6 rounded-xl border border-slate-200/90 bg-white px-6 py-4">
          {[80, 140, 70, 70].map((w, i) => (
            <div key={i} className="skeleton h-4" style={{ width: w }} />
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-[1440px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {[3, 2].map((rows, i) => (
          <section key={i} className="rounded-xl border border-slate-200/90 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="skeleton h-5 w-5" />
              <div className="skeleton h-5 w-56" />
            </div>
            <div className="divide-y divide-slate-100 px-4">
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="flex items-center gap-3 py-4">
                  <div className="skeleton h-10 w-10 !rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-16" />
                    <div className="skeleton h-4 w-1/2 max-w-md" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
