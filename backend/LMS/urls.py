from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import GradeChangeLogViewSet, StudentSubjectOfferingViewSet, StudentViewSet, SubjectOfferingViewSet, SubjectViewSet, TeacherQuizViewSet, TeacherSubjectListViewSet, TeacherViewSet, ai_chat, current_student, explain_concept, generate_quiz, generate_study_plan, grade_forecast, import_students_excel, list_users, LoginView, create_user, manage_quiz_question, provide_feedback, quarterly_grade_detail, quarterly_grades, quiz_item_analysis, start_quiz, student_grade_analytics, student_quiz_attempts, student_quiz_attempt_detail, student_quiz_detail, student_quiz_review, student_quizzes, student_topic_performance, submit_quiz, user_detail, SectionViewSet, AdminDashboardStatsView, SchoolYearViewSet

from .views import teacher_submissions_summary, teacher_submissions_subject_detail, teacher_submissions_export_csv, quarterly_grades_bulk_apply_weights

router = DefaultRouter()
router.register(r"sections", SectionViewSet, basename="section")
router.register(r"students", StudentViewSet, basename="student")
router.register("subjects", SubjectViewSet, basename="subjects")
router.register(r"teachers", TeacherViewSet, basename="teacher")
router.register("teacher/subjects", TeacherSubjectListViewSet, basename="teacher-subjects")
router.register(r"subject-offerings", SubjectOfferingViewSet, basename="subject-offering")
router.register(r'teacher/quizzes', TeacherQuizViewSet, basename='teacher-quiz')
router.register(r"student/subject-offerings", StudentSubjectOfferingViewSet, basename="student-subject-offerings")
router.register(r'grade-logs', GradeChangeLogViewSet, basename='grade-logs')
router.register(r'academic-years', SchoolYearViewSet, basename='academic-year')

urlpatterns = [
    path('token/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/', list_users, name="list_users"),
    path("user/create/", create_user, name="create_user"),
    path("user/<int:pk>/", user_detail),
    path("", include(router.urls)),
    path("dashboard/stats/", AdminDashboardStatsView.as_view()),
    path("user/import-students/", import_students_excel),
    path("teacher/submissions/summary/", teacher_submissions_summary),
    path("teacher/submissions/subject/<int:subject_offering_id>/", teacher_submissions_subject_detail),

    path("student/profile/", current_student, name="current_student"),
    
    # Teacher Quiz Management
    path('teacher/questions/<int:question_id>/', manage_quiz_question, name='manage_quiz_question'),
    
    # Quiz Item Analysis
    path('teacher/quizzes/<int:quiz_id>/item-analysis/', quiz_item_analysis, name='quiz_item_analysis'),
    
    # Student Quiz Access
    path('student/quizzes/', student_quizzes, name='student_quizzes'),
    path('student/quizzes/<int:quiz_id>/', student_quiz_detail, name='student_quiz_detail'),
    path('student/quizzes/<int:quiz_id>/review/', student_quiz_review, name='student_quiz_review'),
    path('student/quizzes/<int:quiz_id>/start/', start_quiz, name='start_quiz'),
    path('student/quiz-attempts/<int:attempt_id>/submit/', submit_quiz, name='submit_quiz'),
    path('student/quiz-attempts/<int:attempt_id>/', student_quiz_attempt_detail, name='student_quiz_attempt_detail'),
    path('student/quiz-attempts/', student_quiz_attempts, name='student_quiz_attempts'),
    
    # Grade Forecasting - Student access
    path('student/grade-analytics/', student_grade_analytics, name='student_grade_analytics'),
    path('student/grade-forecast/', grade_forecast, name='student_grade_forecast'),
    path('student/grade-forecast/<int:SubjectOffering_id>/', grade_forecast, name='student_grade_forecast_subject'),
    path('student/topic-performance/', student_topic_performance, name='student_topic_performance'),
    path('student/topic-performance/<int:SubjectOffering_id>/', student_topic_performance, name='student_topic_performance_subject'),
    
    # Semester routes; legacy quarterly URLs remain available.
    path('semester-grades/', quarterly_grades, name='semester_grades'),
    path('semester-grades/bulk-apply-weights/', quarterly_grades_bulk_apply_weights, name='semester_grades_bulk_apply_weights'),
    path('semester-grades/<int:grade_id>/', quarterly_grade_detail, name='semester_grade_detail'),
    # Quarterly Grades
    path('quarterly-grades/', quarterly_grades, name='quarterly_grades'),
    path("quarterly-grades/bulk-apply-weights/", quarterly_grades_bulk_apply_weights, name="quarterly_grades_bulk_apply_weights"),
    path('quarterly-grades/<int:grade_id>/', quarterly_grade_detail, name='quarterly_grade_detail'),
    
    path('ai/chat/', ai_chat, name='ai_chat'),
    path('ai/generate-quiz/', generate_quiz, name='generate_quiz'),
    path('ai/explain-concept/', explain_concept, name='explain_concept'),
    path('ai/feedback/', provide_feedback, name='provide_feedback'),
    path('ai/study-plan/', generate_study_plan, name='generate_study_plan'),
    
]