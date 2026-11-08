import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.tsx';
import Layout from './components/Layout.tsx';
import { useAuth } from './context/AuthContext.tsx';
import PageLoader from './components/PageLoader.tsx';

// Public & Auth routes (lazy-loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage.tsx').then(m => ({ default: m.LoginPage })));
const Unauthorized = lazy(() => import('./pages/auth/Unauthorized.tsx').then(m => ({ default: m.Unauthorized })));

// Student routes (lazy-loaded)
const StudentDashboard = lazy(() => import('./pages/student/dashboard/StudentDashboard.tsx'));
const SubjectsPage = lazy(() => import('./pages/student/subjects/SubjectListPage.tsx'));
const StudentSubjectpage = lazy(() => import('./pages/student/subjects/StudentSubjectPage.tsx'));
const StudentSemesterGrades = lazy(() => import('./pages/student/grades/StudentSemesterGrades.tsx'));
const StudentQuizList = lazy(() => import('./pages/student/quiz/StudentQuizList.tsx'));
const TakeQuiz = lazy(() => import('./pages/student/quiz/TakeQuiz.tsx'));
const ReviewQuiz = lazy(() => import('./pages/student/quiz/ReviewQuiz.tsx'));
const QuizResult = lazy(() => import('./pages/student/quiz/QuizResult.tsx'));

// Teacher routes (lazy-loaded)
const TeacherDashboard = lazy(() => import('./pages/teacher/dashboard/TeacherDashboard.tsx'));
const SubjectListPage = lazy(() => import('./pages/teacher/subjects/SubjectListPage.tsx'));
const SubjectCreationForm = lazy(() => import('./pages/teacher/subjects/AssignSubjectOffering.tsx'));
const SubjectLayout = lazy(() => import('./pages/teacher/subjects/SubjectLayout.tsx'));
const SubjectPage = lazy(() => import('./pages/teacher/subjects/SubjectPage.tsx'));
const SubjectFilesTab = lazy(() => import('./pages/teacher/subjects/SubjectFilesTab.tsx'));
const SubjectActivitiesTab = lazy(() => import('./pages/teacher/subjects/activity-tab/SubjectActivitiesTab.tsx'));
const SubjectGradesTab = lazy(() => import('./pages/teacher/subjects/SubjectGradesTab.tsx'));
const SubjectClassListTab = lazy(() => import('./pages/teacher/subjects/SubjectClassListTab.tsx'));
const SubjectQuizAnalytics = lazy(() => import('./pages/teacher/subjects/SubjectQuizAnalytics.tsx'));
const TeacherSubmissionsPage = lazy(() => import('./pages/teacher/submissions/TeacherSubmissionsPage.tsx'));
const TeacherSubjectSubmissionsPage = lazy(() => import('./pages/teacher/submissions/TeacherSubjectSubmissionPage.tsx'));
const SemesterGradesPage = lazy(() => import('./pages/teacher/gradebook/SemesterGradesPage.tsx'));
const SubjectGradeDetailPage = lazy(() => import('./pages/teacher/gradebook/SubjectSemesterGrades.tsx'));
const AdvisoryClass = lazy(() => import('./pages/teacher/advisoryClass/AdvisoryClass.tsx'));
const InputReportCardData = lazy(() => import('./pages/teacher/advisoryClass/InputReportCardData.tsx'));
const ExportReportCardPDF = lazy(() => import('./pages/teacher/advisoryClass/ExportReportCard.tsx'));
const TeacherQuizList = lazy(() => import('./pages/teacher/quiz/TeacherQuizList.tsx'));
const CreateQuiz = lazy(() => import('./pages/teacher/quiz/CreateQuiz.tsx'));
const ManageQuiz = lazy(() => import('./pages/teacher/quiz/ManageQuiz.tsx'));
const QuizItemAnalysis = lazy(() => import('./pages/teacher/quiz/QuizItemAnalysis.tsx'));
const QuizGradingPage = lazy(() => import('./pages/teacher/quiz/QuizGradingPage.tsx'));

// Admin routes (lazy-loaded)
const AdminDashboard = lazy(() => import('./pages/admin/dashboard/AdminDashboard.tsx'));
const AcademicSetupPage = lazy(() => import('./pages/admin/academic/AcademicSetupPage.tsx'));
const AccountListPage = lazy(() => import('./pages/admin/accounts/Account-list.tsx'));
const CreateTeacherAccountPage = lazy(() => import('./pages/admin/accounts/create-accounts/Create-teacher-account.tsx'));
const CreateStudentAccountPage = lazy(() => import('./pages/admin/accounts/create-accounts/Create-student-account.tsx'));
const CreateAdminAccountPage = lazy(() => import('./pages/admin/accounts/create-accounts/Create-admin-account.tsx'));
const FacultyPage = lazy(() => import('./pages/admin/faculty/FacultyPage.tsx').then(m => ({ default: m.FacultyPage })));
const CreateFacultyPage = lazy(() => import('./pages/admin/faculty/createFaculty.tsx'));
const FacultyList = lazy(() => import('./pages/admin/faculty/departmentId.tsx').then(m => ({ default: m.FacultyList })));
const StudentAccountsPage = lazy(() => import('./pages/admin/students/StudentsPage.tsx').then(m => ({ default: m.StudentAccountsPage })));
const CreateSectionPage = lazy(() => import('./pages/admin/students/create-subject.tsx'));
const StudentClassList = lazy(() => import('./pages/admin/students/Student_classlist.tsx').then(m => ({ default: m.StudentClassList })));
const GradeLogs = lazy(() => import('./pages/admin/gradelogs/GradeLogs.tsx'));

function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 1. Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* 2. PROTECTED APP AREA (Requires Login) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']} />}>
            
            {/* 3. LAYOUT WRAPPER */}
            <Route element={<Layout />}>
              
              {/* Student Domain */}
              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/subject" element={<SubjectsPage />} />
                <Route path="/student/subject-offering/:id" element={<StudentSubjectpage />} />
               
                <Route path="/student/report-card" element={<StudentSemesterGrades />} />
                <Route path="/student/grades/quarterly" element={<Navigate to="/student/report-card" replace />} />
                <Route path="/student/grades/semester" element={<Navigate to="/student/report-card" replace />} />
                <Route path="/student/activities" element={<StudentQuizList />} />
                <Route path="/student/activities/:id/take" element={<TakeQuiz />} />
                <Route path="/student/activities/:id/review" element={<ReviewQuiz />} />
                <Route path="/student/activities/result" element={<QuizResult />} />
              </Route>

              {/* Teacher Domain */}
              <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              
                <Route path="teacher/subject">
                  <Route index element={<SubjectListPage />} /> 
                  <Route path="create-subject" element={<SubjectCreationForm />} />
                  <Route path=":id" element={<SubjectLayout />}>
                    <Route index element={<SubjectPage />} />
                    <Route path="files" element={<SubjectFilesTab />} />
                    <Route path="activities" element={<SubjectActivitiesTab />} />
                    <Route path="activities/create" element={<CreateQuiz />} />
                    <Route path="grades" element={<SubjectGradesTab />} />
                    <Route path="classlist" element={<SubjectClassListTab />} />
                    <Route path="analytics" element={<SubjectQuizAnalytics />} />
                  </Route>
                </Route>

                <Route path="/teacher/submissions" element={<TeacherSubmissionsPage />} />
                <Route path="/teacher/submissions/:subjectOfferingId" element={<TeacherSubjectSubmissionsPage />} />

                <Route path="/teacher/grades/semester" element={<SemesterGradesPage />} />
                <Route path="/teacher/grades/semester/:id" element={<SubjectGradeDetailPage />} />
                <Route path="/teacher/advisory-class" element={<AdvisoryClass />} />
                <Route path="/teacher/advisory-class/report-card/:studentId" element={<InputReportCardData />} />
                <Route path="/teacher/advisory-class/report-card/:studentId/sf9" element={<ExportReportCardPDF />} />
                <Route path="/teacher/advisory-class/sf9/:studentId" element={<ExportReportCardPDF />} />
                <Route path="/teacher/activities" element={<TeacherQuizList />} />
                <Route path="/teacher/activities/create" element={<CreateQuiz />} />
                <Route path="/teacher/activities/:id" element={<ManageQuiz />} />
                <Route path="/teacher/activities/:id/item-analysis" element={<QuizItemAnalysis />} />
                <Route path="/teacher/activities/:id/grading" element={<QuizGradingPage />} />
              </Route>

              {/* Admin Domain */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/academic-setup" element={<AcademicSetupPage />} />
                <Route path="/admin/accounts" element={<AccountListPage />} />
                <Route path="/admin/accounts/create/teacher" element={<CreateTeacherAccountPage />} />
                <Route path="/admin/accounts/create/student" element={<CreateStudentAccountPage />} />
                <Route path="/admin/accounts/create/admin" element={<CreateAdminAccountPage />} />
                <Route path="/admin/faculty" element={<FacultyPage />} />
                <Route path="/admin/faculty/add-faculty" element={<CreateFacultyPage />} />
                <Route path="/admin/faculty/:department" element={<FacultyList />} />
                <Route path="/admin/students" element={<StudentAccountsPage />} />
                <Route path="/admin/students/add-section" element={<CreateSectionPage />} />
                <Route path="/admin/students/:sectionId" element={<StudentClassList />} />
                <Route path="/admin/gradelogs" element={<GradeLogs />} />
              </Route>

            </Route>
          </Route>

          {/* 4. Global Redirects */}
          <Route path="/" element={user ? <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<div className="p-10 text-center">404: Not Found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;