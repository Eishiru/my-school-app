import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage.tsx';

import ProtectedRoute from './ProtectedRoute.tsx';
import { Unauthorized } from './pages/auth/Unauthorized.tsx';
import Layout from '../src/components/Layout.tsx'; // Import your new Layout
import { useAuth } from '../src/context/AuthContext.tsx'; // Import your auth hook

// student imports
import SubjectsPage from './pages/student/subjects/SubjectListPage.tsx';
import  StudentSubjectpage  from './pages/student/subjects/StudentSubjectPage.tsx';

// teacher imports


import AdvisoryClass from './pages/teacher/advisoryClass/AdvisoryClass.tsx';
import  TeacherDashboard  from './pages/teacher/dashboard/TeacherDashboard.tsx';
import SubjectQuizAnalytics from './pages/teacher/subjects/SubjectQuizAnalytics.tsx';

// admin imports
import AdminDashboard from './pages/admin/dashboard/AdminDashboard.tsx';
import AcademicSetupPage from './pages/admin/academic/AcademicSetupPage.tsx';
import { FacultyList } from './pages/admin/faculty/departmentId.tsx';
import { StudentClassList } from './pages/admin/students/Student_classlist.tsx';
// import SectionsPage from './pages/admin/section/SectionPage.tsx';
import { FacultyPage } from './pages/admin/faculty/FacultyPage.tsx';
import { StudentAccountsPage} from './pages/admin/students/StudentsPage.tsx';
import GradeLogs from './pages/admin/gradelogs/GradeLogs.tsx';
import AccountListPage from './pages/admin/accounts/Account-list.tsx';
import CreateSectionPage from './pages/admin/students/create-subject.tsx';
import ExportReportCardPDF from './pages/teacher/advisoryClass/ExportReportCard.tsx';

// import SubjectPage from './pages/teacher/subjects/SubjectPage.tsx';
import SubjectListPage from './pages/teacher/subjects/SubjectListPage.tsx';
import SubjectCreationForm from './pages/teacher/subjects/AssignSubjectOffering.tsx';
import SubjectPage from './pages/teacher/subjects/SubjectPage.tsx';
import CreateTeacherAccountPage from './pages/admin/accounts/create-accounts/Create-teacher-account.tsx';
import CreateStudentAccountPage from './pages/admin/accounts/create-accounts/Create-student-account.tsx';
import CreateAdminAccountPage from './pages/admin/accounts/create-accounts/Create-admin-account.tsx';
import CreateFacultyPage from './pages/admin/faculty/createFaculty.tsx';
import StudentDashboard from './pages/student/dashboard/StudentDashboard.tsx';

// Quiz imports
import TeacherQuizList from './pages/teacher/quiz/TeacherQuizList.tsx';
import CreateQuiz from './pages/teacher/quiz/CreateQuiz.tsx';
import ManageQuiz from './pages/teacher/quiz/ManageQuiz.tsx';
import QuizItemAnalysis from './pages/teacher/quiz/QuizItemAnalysis.tsx';
import QuizGradingPage from './pages/teacher/quiz/QuizGradingPage.tsx';
import StudentQuizList from './pages/student/quiz/StudentQuizList.tsx';
import TakeQuiz from './pages/student/quiz/TakeQuiz.tsx';
import QuizResult from './pages/student/quiz/QuizResult.tsx';
import ReviewQuiz from './pages/student/quiz/ReviewQuiz.tsx';
import StudentSemesterGrades from './pages/student/grades/StudentSemesterGrades.tsx';
import SubjectLayout from './pages/teacher/subjects/SubjectLayout.tsx';
import SubjectClassListTab from './pages/teacher/subjects/SubjectClassListTab.tsx';
import SubjectGradesTab from './pages/teacher/subjects/SubjectGradesTab.tsx';
import SubjectActivitiesTab from './pages/teacher/subjects/activity-tab/SubjectActivitiesTab.tsx';
import SubjectFilesTab from './pages/teacher/subjects/SubjectFilesTab.tsx';
import TeacherSubmissionsPage from './pages/teacher/submissions/TeacherSubmissionsPage.tsx';
import TeacherSubjectSubmissionsPage from './pages/teacher/submissions/TeacherSubjectSubmissionPage.tsx';

import SubjectGradeDetailPage from './pages/teacher/gradebook/SubjectSemesterGrades.tsx';

import InputReportCardData from './pages/teacher/advisoryClass/InputReportCardData.tsx';
import SemesterGradesPage from './pages/teacher/gradebook/SemesterGradesPage.tsx';





function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 2. PROTECTED APP AREA (Requires Login) */}
        {/* We wrap everything in a general ProtectedRoute first */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']} />}>
          
          {/* 3. LAYOUT WRAPPER 
              Every route inside here will have the Sidebar and Topbar 
          */}
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

              {/* You can add more student pages here like /student/grades */}
            </Route>

            {/* Teacher Domain */}
            <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            
              <Route path='teacher/subject'>
                {/* Renders the list of subjects */}
                <Route index element={<SubjectListPage />} /> 
                
                {/* Renders the form for creating a new subject */}
                <Route path='create-subject' element={<SubjectCreationForm />} />
                
                {/* Renders the detail page for a specific subject */}
                <Route path=':id' element={<SubjectLayout />}>
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
              <Route path='/teacher/grades/semester/:id' element={<SubjectGradeDetailPage />} />
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
    </BrowserRouter>
  );
}

export default App;