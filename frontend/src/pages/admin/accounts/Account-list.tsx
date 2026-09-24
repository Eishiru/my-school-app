import React, { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Search,
  GraduationCap,
  UsersRound,
  MoreVertical,
  Mail,
  Settings,
  Trash2,
  ChevronRight,
  ArrowUpRight,
  Edit3,
  UserCheck,
  UserX,
} from "lucide-react";

import EditModal from "./EditModal";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useAdminUsers,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from "../../../hooks/useAdminData";

// ✅ Unified UserAccount type (Department -> Subjects)
type UserAccount = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password?: string;

  subjects?: { id: number; name: string }[];
  gradeLevel?: string;
  gender?: "MALE" | "FEMALE" | string;
  birthdate?: string;
  age?: number | null;

  role: "STUDENT" | "TEACHER" | "ADMIN";
  status: "Active" | "Inactive";
};

/** ---------------- Grade helpers ---------------- **/

// Accepts: "GRADE_7", "7", 7, "Grade 7" (best-effort)
const parseGradeNumber = (gl?: string): number | null => {
  if (!gl) return null;
  const s = String(gl).trim().toUpperCase();
  // pick the first number found
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};

// Keeps backend style consistent with what the student already has
const formatNextGradeLevel = (current?: string): string | null => {
  const n = parseGradeNumber(current);
  if (n == null) return null;

  const next = n + 1;

  // Optional cap (edit as needed)
  if (next > 12) return null;

  const cur = String(current ?? "").trim().toUpperCase();
  if (cur.startsWith("GRADE_")) return `GRADE_${next}`;

  // If it’s just "7" or "Grade 7", send the number string
  return String(next);
};

const displayGrade = (gl?: string) => {
  const n = parseGradeNumber(gl);
  return n ? `Grade ${n}` : gl || "N/A";
};

const AccountListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { data: rawUsers, isLoading: loading } = useAdminUsers();
  const deleteMutation = useDeleteAdminUser();
  const updateMutation = useUpdateAdminUser();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserAccount | null>(null);
  const [activeGrade, setActiveGrade] = useState<number | "ALL">("ALL");

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"student" | "teacher" | "admin">(
    () => location.state?.activeTab || "student"
  );

  useEffect(() => {
    if (location.state?.activeTab) setActiveTab(location.state.activeTab);
  }, [location.state]);

  useEffect(() => {
    if (activeTab !== "student") setActiveGrade("ALL");
  }, [activeTab]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-account-menu]")) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const users: UserAccount[] = useMemo(() => {
    return (rawUsers ?? []).map((u: any) => ({
      id: String(u.id),
      firstname: u.first_name ?? "",
      lastname: u.last_name ?? "",
      email: u.email ?? "",
      role: u.role,
      gradeLevel: u.student_profile?.grade_level ?? undefined,
      gender: u.student_profile?.gender ?? undefined,
      birthdate: u.student_profile?.birthdate ?? undefined,
      age: u.student_profile?.age ?? undefined,
      subjects: Array.isArray(u.subjects) ? u.subjects : [],
      status: u.status === "ACTIVE" ? "Active" : "Inactive",
    }));
  }, [rawUsers]);

  const handleCreateAccount = () => {
    if (activeTab === "teacher") {
      navigate("/admin/accounts/create/teacher", { state: { activeTab: "teacher" } });
    } else if (activeTab === "admin") {
      navigate("/admin/accounts/create/admin", { state: { activeTab: "admin" } });
    } else {
      navigate("/admin/accounts/create/student", { state: { activeTab: "student" } });
    }
  };

  const createButtonLabel =
    activeTab === "student"
      ? "Add Student"
      : activeTab === "teacher"
      ? "Add Teacher"
      : "Add Admin";

  // ✅ Grade buttons available (Students only)
  const availableGrades = useMemo(() => {
    const nums = users
      .filter((u) => u.role === "STUDENT")
      .map((u) => parseGradeNumber(u.gradeLevel))
      .filter((n): n is number => n != null);

    const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
    return uniq;
  }, [users]);

  // --- Filter & Search ---
  const currentList = useMemo(() => {
    const filteredByRole = users.filter((u) => {
      if (activeTab === "student") return u.role === "STUDENT";
      if (activeTab === "teacher") return u.role === "TEACHER";
      return u.role === "ADMIN";
    });

    // ✅ Apply grade filter only for students
    const filteredByGrade =
      activeTab === "student" && activeGrade !== "ALL"
        ? filteredByRole.filter((u) => parseGradeNumber(u.gradeLevel) === activeGrade)
        : filteredByRole;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredByGrade;

    return filteredByGrade.filter((u) => {
      const subjectText =
        u.role === "TEACHER"
          ? (u.subjects ?? []).map((s) => s?.name ?? "").join(" ")
          : "";
      const hay = `${u.firstname} ${u.lastname} ${u.email} ${subjectText} ${u.gradeLevel ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, activeTab, searchQuery, activeGrade]);

  // --- Actions ---
  const handleToggleStatus = async (user: UserAccount) => {
    try {
      const newStatus = user.status === "Active" ? "INACTIVE" : "ACTIVE";
      await updateMutation.mutateAsync({
        userId: user.id,
        payload: { status: newStatus },
      });
      setOpenMenuId(null);
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      alert(err.message || "Failed to update account status. Please try again.");
    }
  };

  const handleDelete = async (user: UserAccount) => {
    const roleLabel = user.role.toLowerCase();
    const confirmed = window.confirm(
      `Are you sure you want to delete ${roleLabel} account "${user.firstname} ${user.lastname}" (${user.email})? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(user.id);
      setOpenMenuId(null);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      alert(err.message || "Failed to delete account. Please try again.");
    }
  };

  // ✅ Promote ONE student (Grade 7 -> 8, etc.)
  const handlePromoteStudent = async (user: UserAccount) => {
    if (user.role !== "STUDENT") return;

    const nextGradeLevel = formatNextGradeLevel(user.gradeLevel);
    if (!nextGradeLevel) {
      alert("Cannot promote this student (missing grade level or already max grade).");
      return;
    }

    if (!window.confirm(`Promote ${user.firstname} ${user.lastname} to ${displayGrade(nextGradeLevel)}?`)) return;

    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        payload: {
          student_profile: { grade_level: nextGradeLevel },
        },
      });
      setOpenMenuId(null);
    } catch (err: any) {
      console.error("Failed to promote student:", err);
      alert(err.message || "Failed to promote student. Please try again.");
    }
  };

  // ✅ Bulk promote for active grade
  const handleBulkPromoteStudents = async () => {
    const list = users.filter((u) => {
      if (u.role !== "STUDENT") return false;
      if (activeGrade === "ALL") return true;
      return parseGradeNumber(u.gradeLevel) === activeGrade;
    });

    if (list.length === 0) return;

    const label = activeGrade === "ALL" ? "ALL students" : `Grade ${activeGrade} students`;
    if (!window.confirm(`Promote ${label} to the next grade level?`)) return;

    for (const stu of list) {
      const nextGradeLevel = formatNextGradeLevel(stu.gradeLevel);
      if (!nextGradeLevel) continue;

      try {
        await updateMutation.mutateAsync({
          userId: stu.id,
          payload: { student_profile: { grade_level: nextGradeLevel } },
        });
      } catch {
        // continue others
      }
    }

    alert("Bulk promotion done (students without valid grade levels were skipped).");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const payload: any = {
      first_name: selectedItem.firstname,
      last_name: selectedItem.lastname,
      email: selectedItem.email,
    };

    if (selectedItem.role === "STUDENT") {
      let grade = selectedItem.gradeLevel || "GRADE_7";
      if (!grade.startsWith("GRADE_")) {
        const num = grade.replace(/\D/g, "");
        grade = num ? `GRADE_${num}` : "GRADE_7";
      }
      payload.student_profile = {
        grade_level: grade,
        gender: selectedItem.gender || null,
        birthdate: selectedItem.birthdate || null,
      };
    }

    if (selectedItem.password?.trim()) {
      payload.password = selectedItem.password.trim();
    }

    try {
      await updateMutation.mutateAsync({
        userId: selectedItem.id,
        payload,
      });
      setIsEditModalOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      console.error("Failed to update user:", err);
      alert(err.message || "Failed to save account changes.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage student, teacher, and administrator credentials and permissions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "student" && (
            <button
              onClick={handleBulkPromoteStudents}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              title="Promote students to next grade level"
            >
              <ArrowUpRight size={15} />
              Promote {activeGrade === "ALL" ? "All Students" : `Grade ${activeGrade}`}
            </button>
          )}

          <button
            onClick={handleCreateAccount}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={15} /> {createButtonLabel}
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto no-scrollbar">
            <TabButton
              active={activeTab === "student"}
              onClick={() => setActiveTab("student")}
              icon={<GraduationCap size={15} />}
              label="Students"
            />
            <TabButton
              active={activeTab === "teacher"}
              onClick={() => setActiveTab("teacher")}
              icon={<UsersRound size={15} />}
              label="Teachers"
            />
            <TabButton
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
              icon={<Settings size={15} />}
              label="Admins"
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab}s by name, email, or details...`}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Grade-level navigation (Students only) */}
        {activeTab === "student" && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Grade Level:
            </span>
            <GradeChip
              active={activeGrade === "ALL"}
              onClick={() => setActiveGrade("ALL")}
              label="All Grades"
            />
            {availableGrades.map((g) => (
              <GradeChip
                key={g}
                active={activeGrade === g}
                onClick={() => setActiveGrade(g)}
                label={`Grade ${g}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop table + Mobile cards */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block">
              <div className="max-h-[70vh] overflow-auto min-h-[320px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {activeTab === "teacher"
                          ? "Assigned Subjects"
                          : activeTab === "student"
                          ? "Grade Level"
                          : "Role"}
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {currentList.map((user, index) => {
                      const initials =
                        (user.firstname?.charAt(0) || "") + (user.lastname?.charAt(0) || "");
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                                {initials || "U"}
                              </div>
                              <span className="font-semibold text-sm text-slate-900">
                                {user.firstname} {user.lastname}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <Mail size={13} className="text-slate-400" />
                              {user.email}
                            </span>
                          </td>

                          <td className="px-6 py-3.5 text-xs text-slate-600">
                            {user.role === "TEACHER" ? (
                              user.subjects && user.subjects.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {user.subjects.map((s) => (
                                    <span
                                      key={s.id}
                                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No assigned subjects</span>
                              )
                            ) : user.role === "STUDENT" ? (
                              <span className="font-medium text-slate-800">
                                {displayGrade(user.gradeLevel)}
                              </span>
                            ) : (
                              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-100">
                                System Administrator
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            <span
                              className={[
                                "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                user.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200",
                              ].join(" ")}
                            >
                              {user.status}
                            </span>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="relative inline-block text-left" data-account-menu>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  openMenuId === user.id
                                    ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                                aria-label="Open actions"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openMenuId === user.id && (
                                <div
                                  className={`absolute right-0 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                    index >= currentList.length - 2 && currentList.length > 2
                                      ? "bottom-full mb-1.5 origin-bottom-right"
                                      : "top-full mt-1.5 origin-top-right"
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedItem(user);
                                      setIsEditModalOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                                  >
                                    <Edit3 size={14} className="text-indigo-600 shrink-0" />
                                    <span>Edit Account Details</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleStatus(user)}
                                    className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                                  >
                                    {user.status === "Active" ? (
                                      <>
                                        <UserX size={14} className="text-amber-600 shrink-0" />
                                        <span>Set as Inactive</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck size={14} className="text-emerald-600 shrink-0" />
                                        <span>Set as Active</span>
                                      </>
                                    )}
                                  </button>

                                  {user.role === "STUDENT" && (
                                    <button
                                      onClick={() => handlePromoteStudent(user)}
                                      className="w-full text-left px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center justify-between font-medium transition-colors"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <ArrowUpRight size={14} className="text-emerald-600 shrink-0" />
                                        <span>Promote to next grade</span>
                                      </span>
                                      <ChevronRight size={13} className="text-emerald-400" />
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    onClick={() => handleDelete(user)}
                                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                                  >
                                    <Trash2 size={14} className="text-rose-600 shrink-0" />
                                    <span>Delete Account</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && currentList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400">
                          No matching accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              <div className="max-h-[72vh] overflow-auto p-3 space-y-2.5">
                {currentList.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-400 text-center text-xs">
                    No matching accounts found.
                  </div>
                ) : (
                  currentList.map((user) => (
                    <div key={user.id} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm" data-account-menu>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {user.firstname} {user.lastname}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 min-w-0">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={[
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                              user.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200",
                            ].join(" ")}
                          >
                            {user.status}
                          </span>

                          <button
                            onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              openMenuId === user.id
                                ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                            aria-label="Open actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                        {user.role === "TEACHER" ? (
                          user.subjects && user.subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {user.subjects.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No assigned subjects</span>
                          )
                        ) : user.role === "STUDENT" ? (
                          <span>
                            <span className="text-slate-400">Grade Level: </span>
                            <span className="font-semibold text-slate-800">{displayGrade(user.gradeLevel)}</span>
                          </span>
                        ) : (
                          <span className="text-purple-600 font-medium">System Administrator</span>
                        )}
                      </div>

                      {openMenuId === user.id && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 divide-y divide-slate-200/70 overflow-hidden text-xs">
                          <button
                            onClick={() => {
                              setSelectedItem(user);
                              setIsEditModalOpen(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-slate-700 hover:bg-white flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Edit3 size={14} className="text-indigo-600 shrink-0" />
                            <span>Edit Account Details</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="w-full text-left px-3.5 py-2.5 text-slate-700 hover:bg-white flex items-center gap-2.5 font-medium transition-colors"
                          >
                            {user.status === "Active" ? (
                              <>
                                <UserX size={14} className="text-amber-600 shrink-0" />
                                <span>Set as Inactive</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} className="text-emerald-600 shrink-0" />
                                <span>Set as Active</span>
                              </>
                            )}
                          </button>

                          {user.role === "STUDENT" && (
                            <button
                              onClick={() => handlePromoteStudent(user)}
                              className="w-full text-left px-3.5 py-2.5 text-emerald-700 hover:bg-white flex items-center justify-between font-medium transition-colors"
                            >
                              <span className="flex items-center gap-2.5">
                                <ArrowUpRight size={14} className="text-emerald-600 shrink-0" />
                                <span>Promote to next grade</span>
                              </span>
                              <ChevronRight size={13} className="text-emerald-400" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(user)}
                            className="w-full text-left px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Trash2 size={14} className="text-rose-600 shrink-0" />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        selectedItem={selectedItem}
        activeTab={activeTab}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        setSelectedItem={setSelectedItem}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
};

// --- TabButton Subcomponent ---
const TabButton = ({ active, onClick, label, icon }: any) => (
  <button
    onClick={onClick}
    className={[
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
      active
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50",
    ].join(" ")}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Grade chip (Students tab)
const GradeChip = ({ active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={[
      "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all border",
      active
        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
    ].join(" ")}
  >
    {label}
  </button>
);

export default AccountListPage;
