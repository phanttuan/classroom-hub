"use client";

import { useMemo, useState } from "react";
import GreetingHeader from "../components/common/GreetingHeader";
import TeacherSidebar from "./components/TeacherSidebar";
import TeacherTopbar from "./components/TeacherTopbar";
import StatCards from "./components/StatCards";
import ClassList from "./components/ClassList";
import { PendingAssignments, RecentResults } from "./components/AssignmentPanels";
import SchedulePanel from "./components/SchedulePanel";
import NotificationsPanel from "./components/NotificationsPanel";
import {
  ClassDetailModal,
  ConfirmDeleteModal,
  CreateClassModal,
  EventDetailModal,
  GradeModal,
  NotificationModal,
} from "./components/TeacherModals";
import {
  dashboardStats,
  greetingDateLabel,
  pendingAssignments,
  recentResults,
  scheduleEvents,
  teacherClasses,
  teacherNotifications,
  teacherProfile,
} from "@/lib/mock/teacher-dashboard";
import type {
  PendingAssignment,
  ScheduleEvent,
  TeacherClass,
  TeacherNotification,
} from "@/lib/types/teacher";

export default function TeacherDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classes, setClasses] = useState<TeacherClass[]>(teacherClasses);

  // popup states
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TeacherClass | null>(null);
  const [viewingClass, setViewingClass] = useState<TeacherClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<TeacherClass | null>(null);
  const [grading, setGrading] = useState<PendingAssignment | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(
    undefined,
  );
  const [toast, setToast] = useState("");

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [classes, searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2600);
  };

  const handleCreateSubmit = (v: { name: string; code: string; status: TeacherClass["status"] }) => {
    if (editingClass) {
      setClasses((prev) =>
        prev.map((c) => (c.id === editingClass.id ? { ...c, ...v, updatedAt: "15/09/2026" } : c)),
      );
      showToast(`Đã lưu thay đổi lớp ${v.code}`);
      setEditingClass(null);
    } else {
      setClasses((prev) => [
        {
          id: `cls-${Date.now()}`,
          name: v.name,
          code: v.code,
          status: v.status,
          studentCount: 0,
          courseCount: 0,
          updatedAt: "15/09/2026",
          coverGradient: "from-blue-100 via-sky-100 to-slate-200",
          coverEmoji: "📚",
        },
        ...prev,
      ]);
      showToast(`Đã tạo lớp ${v.code} thành công`);
    }
    setCreateOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-900">
      <TeacherSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeId="home" />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <TeacherTopbar
          profile={teacherProfile}
          notifications={teacherNotifications}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
        />

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
          {/* Chào mừng full-width (dùng chung 3 role) để cột Lịch bắt đầu ngang hàng stat cards */}
          <GreetingHeader
            name={teacherProfile.fullName}
            subtitle="Đây là tổng quan hoạt động giảng dạy của bạn hôm nay."
            dateLabel={greetingDateLabel}
          />

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            {/* ===== Cột trái ===== */}
            <div className="min-w-0 space-y-5">
              <StatCards stats={dashboardStats} />

              <ClassList
                classes={filteredClasses}
                onCreate={() => {
                  setEditingClass(null);
                  setCreateOpen(true);
                }}
                onView={setViewingClass}
                onEdit={(c) => {
                  setEditingClass(c);
                  setCreateOpen(true);
                }}
                onDelete={setDeletingClass}
              />

              <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
                <PendingAssignments items={pendingAssignments} onGrade={setGrading} />
                <RecentResults items={recentResults} />
              </div>
            </div>

            {/* ===== Cột phải ===== */}
            <div className="min-w-0 space-y-5">
              <SchedulePanel
                events={scheduleEvents}
                onSelectEvent={setSelectedEvent}
                onViewAll={() => setSelectedEvent(scheduleEvents[0])}
              />
              <NotificationsPanel
                items={teacherNotifications}
                onViewAll={() => setSelectedNoti(null)}
                onOpen={setSelectedNoti}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ===== Popups ===== */}
      <CreateClassModal
        open={createOpen}
        initial={editingClass}
        onClose={() => {
          setCreateOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleCreateSubmit}
      />
      <ClassDetailModal classInfo={viewingClass} onClose={() => setViewingClass(null)} />
      <ConfirmDeleteModal
        classInfo={deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={() => {
          if (deletingClass) {
            setClasses((prev) => prev.filter((c) => c.id !== deletingClass.id));
            showToast(`Đã xóa lớp ${deletingClass.code}`);
          }
          setDeletingClass(null);
        }}
      />
      <GradeModal
        assignment={grading}
        onClose={() => setGrading(null)}
        onSubmit={() => {
          showToast("Đã mở sổ điểm (demo)");
          setGrading(null);
        }}
      />
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      {selectedNoti !== undefined && (
        <NotificationModal
          notification={selectedNoti}
          all={teacherNotifications}
          onClose={() => setSelectedNoti(undefined)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
