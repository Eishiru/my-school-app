import { LayoutDashboard, Users, GraduationCap, UserCheck, FileSpreadsheet, Calendar, BookOpen, ClipboardList, FileCheck2, Inbox, UsersRound, Award } from "lucide-react";

import { NavItem } from "../types/navigation";

export const navigation: Record<string, NavItem[]> = {
  ADMIN: [
    { name: "Dashboard", to: "/admin/dashboard", Icon: LayoutDashboard },
    { name: "Academic Setup", to: "/admin/academic-setup", Icon: Calendar },
    { name: "Accounts Management", to: "/admin/accounts", Icon: Users },
    { name: "Faculty & Departments", to: "/admin/faculty", Icon: GraduationCap },
    { name: "Students Enrollment", to: "/admin/students", Icon: UserCheck },
    { name: "Grade Logs", to: "/admin/gradelogs", Icon: FileSpreadsheet },
  ],

  TEACHER: [
    { name: "Dashboard", to: "/teacher/dashboard", Icon: LayoutDashboard },
    { name: "Subjects", to: "/teacher/subject", Icon: BookOpen },
    { name: "Activities", to: "/teacher/activities", Icon: ClipboardList },
    { name: "Gradebook", to: "/teacher/grades/semester", Icon: FileCheck2 },
    { name: "Submissions", to: "/teacher/submissions", Icon: Inbox },
    { name: "Advisory Class", to: "/teacher/advisory-class", Icon: UsersRound },
  ],

  STUDENT: [
    { name: "Dashboard", to: "/student/dashboard", Icon: LayoutDashboard },
    { name: "Subjects", to: "/student/subject", Icon: BookOpen },
    { name: "Activities", to: "/student/activities", Icon: ClipboardList },
    { name: "Report Card", to: "/student/report-card", Icon: Award },
  ],
};