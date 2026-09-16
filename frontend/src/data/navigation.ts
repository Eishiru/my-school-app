import {
  LayoutDashboard,
  Users,
  BookCopy,
  Book,
  ClipboardList,
  BarChart3,
  Banknote,
} from "lucide-react";

import { NavItem } from "../types/navigation";

export const navigation: Record<string, NavItem[]> = {
  ADMIN: [
    { name: "Dashboard", to: "/admin/dashboard", Icon: LayoutDashboard },
    { name: "Accounts", to: "/admin/accounts", Icon: Users },
    { name: "Faculty", to: "/admin/faculty", Icon: Users },
    { name: "Students", to: "/admin/students", Icon: Users },
    { name: "Grade Logs", to: "/admin/gradelogs", Icon: Users },
  ],

  TEACHER: [
    { name: "Dashboard", to: "/teacher/dashboard", Icon: LayoutDashboard },
    { name: "Subjects", to: "/teacher/subject", Icon: BookCopy },
    { name: "Activities", to: "/teacher/activities", Icon: ClipboardList },
    { name: "Gradebook", to: "/teacher/grades/semester", Icon: Book },
    { name: "Submissions", to: "/teacher/submissions", Icon: BarChart3 },
    { name: "Advisory Class", to: "/teacher/advisory-class", Icon: Banknote },
  ],

  STUDENT: [
    { name: "Dashboard", to: "/student/dashboard", Icon: LayoutDashboard },
    { name: "Subjects", to: "/student/subject", Icon: BookCopy },
    { name: "Report Card", to: "/student/report-card", Icon: Book },
  ],
};