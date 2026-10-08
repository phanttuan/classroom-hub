"use client";

import { useEffect, useMemo, useState } from "react";
import GreetingHeader from "../components/common/GreetingHeader";
import TeacherSidebar from "./components/TeacherSidebar";
import TeacherTopbar from "./components/TeacherTopbar";
import StatCards from "./components/StatCards";
import CourseList from "./components/CourseList";
import { PendingAssignments, RecentResults } from "./components/AssignmentPanels";
import SchedulePanel from "./components/SchedulePanel";
import NotificationsPanel from "./components/NotificationsPanel";
import {
  CourseDetailModal,
  ConfirmStatusChangeModal,
  CreateCourseModal,
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
  teacherNotifications,
  teacherProfile,
} from "@/lib/mock/teacher-dashboard";
import type {
  PendingAssignment,
  ScheduleEvent,
  TeacherClass,
  TeacherNotification,
  TeacherProfile,
} from "@/lib/types/teacher";
import { fetchUserProfile } from "@/lib/api/user-api";
import {
  fetchTeacherCourses,
  createCourse,
  updateCourse,
  updateCourseStatus,
} from "@/lib/api/course-api";
import {
  mapCourseDtoToTeacherClass,
  type BackendCourseStatus,
} from "@/lib/types/course";
import { useSidebar } from "@/lib/context/sidebar-context";

export default function TeacherDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [profile, setProfile] = useState<TeacherProfile>(teacherProfile);
  const { collapsed, toggleCollapse } = useSidebar();

  // popup states
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TeacherClass | null>(null);
  const [viewingClass, setViewingClass] = useState<TeacherClass | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    classInfo: TeacherClass;
    targetStatus: "active" | "closed" | "archived";
  } | null>(null);
  const [grading, setGrading] = useState<PendingAssignment | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedNoti, setSelectedNoti] = useState<TeacherNotification | null | undefined>(
    undefined,
  );
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    // 1. Tải profile ngay từ localStorage nếu có
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setProfile({
          id: u.id ? String(u.id) : "gv-001",
          fullName: u.fullName || teacherProfile.fullName,
          role: u.role === "TEACHER" ? "Giáo viên" : u.role === "ADMIN" ? "Quản trị viên" : u.role === "STUDENT" ? "Học sinh" : (u.role || "Giáo viên"),
          avatarUrl: u.avatarUrl || "/images/teacher.webp",
        });
      }
    } catch {}

    // 2. Fetch profile mới nhất từ CSDL qua /users/me
    fetchUserProfile()
      .then((data) => {
        if (data) {
          setProfile({
            id: data.id,
            fullName: data.fullName || teacherProfile.fullName,
            role: data.role === "TEACHER" ? "Giáo viên" : data.role === "ADMIN" ? "Quản trị viên" : data.role === "STUDENT" ? "Học sinh" : "Giáo viên",
            avatarUrl: data.avatarUrl || "/images/teacher.webp",
          });
        }
      })
      .catch(() => {});

    // 3. Tải danh sách môn học thật từ API
    fetchTeacherCourses({ status: "all" })
      .then((res) => {
        if (res && res.items) {
          setClasses(res.items.map(mapCourseDtoToTeacherClass));
        }
      })
      .catch(() => {
        setClasses([]);
      });

    // 4. Lắng nghe sự kiện cập nhật hồ sơ để đồng bộ ngay lập tức
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setProfile((prev) => ({
          id: detail.id || prev.id,
          fullName: detail.fullName || prev.fullName,
          role: detail.role === "TEACHER" ? "Giáo viên" : detail.role === "ADMIN" ? "Quản trị viên" : detail.role === "STUDENT" ? "Học sinh" : prev.role,
          avatarUrl: detail.avatarUrl || prev.avatarUrl || "/images/teacher.webp",
        }));
      }
    };
    window.addEventListener("user-profile-updated", handleUpdate);
    return () => window.removeEventListener("user-profile-updated", handleUpdate);
  }, []);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [classes, searchQuery]);

  // Thống kê động đồng bộ số môn thực tế
  const dynamicStats = useMemo(() => {
    return dashboardStats.map((s, idx) => {
      if (idx === 0) {
        return { ...s, value: classes.length };
      }
      return s;
    });
  }, [classes.length]);

  const handleCreateSubmit = async (v: {
    name: string;
    description?: string;
  }) => {
    if (editingClass) {
      try {
        const res = await updateCourse(editingClass.id, {
          name: v.name,
          description: v.description,
        });
        const updated = mapCourseDtoToTeacherClass(res);
        setClasses((prev) =>
          prev.map((c) => (c.id === editingClass.id ? updated : c)),
        );
        showToast(`Đã lưu thay đổi lớp học ${res.courseCode}`);
        setEditingClass(null);
        setCreateOpen(false);
      } catch (err: unknown) {
        const error = err as { message?: string };
        showToast(error?.message || "Không thể lưu thay đổi lớp học");
      }
    } else {
      try {
        const res = await createCourse({
          name: v.name,
          description: v.description,
        });
        const newClass = mapCourseDtoToTeacherClass(res);
        setClasses((prev) => [newClass, ...prev]);
        showToast(`Đã tạo lớp học ${res.courseCode} thành công!`);
        setCreateOpen(false);
      } catch (err: unknown) {
        const error = err as { message?: string };
        showToast(error?.message || "Không thể tạo lớp học");
      }
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirm) return;
    const { classInfo, targetStatus } = statusConfirm;

    const statusMap: Record<"active" | "closed" | "archived", BackendCourseStatus> = {
      active: "ACTIVE",
      closed: "CLOSED",
      archived: "ARCHIVED",
    };

    try {
      const res = await updateCourseStatus(classInfo.id, statusMap[targetStatus]);
      const updated = mapCourseDtoToTeacherClass(res);
      setClasses((prev) => prev.map((c) => (c.id === classInfo.id ? updated : c)));

      const labelMap = {
        active: "khôi phục",
        closed: "đóng",
        archived: "lưu trữ",
      };
      showToast(`Đã ${labelMap[targetStatus]} lớp học ${res.courseCode}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      showToast(error?.message || "Không thể thay đổi trạng thái lớp học");
    } finally {
      setStatusConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <TeacherSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId="home"
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]"}`}>
        <TeacherTopbar
          profile={profile}
          notifications={teacherNotifications}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenu={() => setSidebarOpen(true)}
          onOpenNotifications={() => setSelectedNoti(null)}
        />

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
          {/* Chào mừng full-width (dùng chung 3 role) để cột Lịch bắt đầu ngang hàng stat cards */}
          <GreetingHeader
            name={profile.fullName}
            subtitle="Đây là tổng quan hoạt động giảng dạy của bạn hôm nay."
            dateLabel={greetingDateLabel}
          />

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            {/* ===== Cột trái ===== */}
            <div className="min-w-0 space-y-5">
              <StatCards stats={dynamicStats} />

              <CourseList
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
                onChangeStatus={(c, targetStatus) => {
                  setStatusConfirm({ classInfo: c, targetStatus });
                }}
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
      <CreateCourseModal
        open={createOpen}
        initial={editingClass}
        onClose={() => {
          setCreateOpen(false);
          setEditingClass(null);
        }}
        onSubmit={handleCreateSubmit}
      />
      <CourseDetailModal classInfo={viewingClass} onClose={() => setViewingClass(null)} />
      <ConfirmStatusChangeModal
        classInfo={statusConfirm?.classInfo ?? null}
        targetStatus={statusConfirm?.targetStatus ?? null}
        onClose={() => setStatusConfirm(null)}
        onConfirm={handleConfirmStatusChange}
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
