import os
import mimetypes
import pandas as pd
from django.db import transaction
from django.utils import timezone

from httpx import request
from rest_framework import viewsets,status
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Max
from rest_framework import serializers
from django.db import transaction

from .ai_service import AIService
from .models import (GradeChangeLog, Section, Student, Subject, SubjectOffering, Quiz, QuizQuestion, QuizChoice, QuizAttempt, 
    QuizAnswer, Student, GradeForecast, QuizTopicPerformance,
    QuarterlyGrade, SubjectOfferingFile)
from rest_framework import permissions
from .serializers import (LoginSerializer, StudentQuizQuestionSerializer, StudentSubjectOfferingSerializer, SubjectListSerializer, SubjectOfferingSerializer, SubjectSerializer, TeacherSerializer, UserSerializer, SectionSerializer, StudentSerializer,QuizSerializer, QuizCreateUpdateSerializer,
    QuizQuestionSerializer, StudentQuizSerializer, QuizAttemptSerializer,
    QuizSubmissionSerializer, QuizChoiceSerializer, QuizAnswerSerializer,
    GradeForecastSerializer, QuizTopicPerformanceSerializer,
    SemesterReferenceField, QuarterlyGradeSerializer, QuarterlyGradeCreateUpdateSerializer, GradeChangeLogSerializer, SubjectOfferingFileSerializer
)
from .grade_analytics import GradeAnalyticsService


# this is for submission
from django.http import HttpResponse
from django.db.models import Count, Avg
import csv

User = get_user_model()

MAX_MB = 10
MAX_BYTES = MAX_MB * 1024 * 1024

ALLOWED_EXTS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".png", ".jpg", ".jpeg", ".webp",
    ".txt", ".csv",
}

def recalc_quarterly_component(*, student, offering, semester, grade_type):
    """
    Recompute QuarterlyGrade component totals based on BEST attempt per quiz for the semester.
    Prevents adding totals when multiple attempts exist.
    """
    quizzes = Quiz.objects.filter(
        SubjectOffering=offering,
        semester=semester,
        grade_type=grade_type,
    )

    attempts_qs = QuizAttempt.objects.filter(
        quiz__in=quizzes,
        student=student,
        status__in=["SUBMITTED", "GRADED"],
    )

    # A shared credit overrides the member's other attempts for this quiz.
    # Preserve historical grades until the group receives a shared grade.
    credited_quiz_ids = QuizAttempt.objects.filter(
        student=student, quiz__in=quizzes, group__isnull=False, status='GRADED'
    ).values('quiz_id')
    attempts_qs = attempts_qs.exclude(quiz_id__in=credited_quiz_ids, group__isnull=True)

    # ✅ best score per quiz
    best_rows = (
        attempts_qs.values("quiz_id")
        .annotate(best=Max("score"))
    )
    total_score = sum((r["best"] or 0.0) for r in best_rows)

    # ✅ total_points counted once per quiz (not per attempt)
    total_points = quizzes.aggregate(s=Sum("total_points"))["s"] or 0.0

    grade, _ = QuarterlyGrade.objects.get_or_create(
        student=student,
        SubjectOffering=offering,
        semester=semester,
        defaults={}
    )

    if grade_type == "WRITTEN_WORK":
        grade.written_work_score = float(total_score)
        grade.written_work_total = float(total_points)
    elif grade_type == "PERFORMANCE_TASK":
        grade.performance_task_score = float(total_score)
        grade.performance_task_total = float(total_points)
    elif grade_type == "FINAL_EXAM":
        grade.quarterly_assessment_score = float(total_score)
        grade.quarterly_assessment_total = float(total_points)

    grade.save()



class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "students": User.objects.filter(role="STUDENT").count(),
            "teachers": User.objects.filter(role="TEACHER").count(),
            "subjects": Subject.objects.count(),
        })

class SectionViewSet(ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"], url_path="students")
    def students(self, request, pk=None):
        students = Student.objects.filter(section_id=pk)
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.prefetch_related("teachers")
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    # ---------------------------
    # ASSIGN TEACHER TO SUBJECT
    # ---------------------------
    @action(detail=True, methods=["post"], url_path="assign-teacher")
    def assign_teacher(self, request, pk=None):
        subject = self.get_object()
        teacher_id = request.data.get("teacher_id")

        if not teacher_id:
            return Response(
                {"detail": "teacher_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            teacher = User.objects.get(id=teacher_id, role="TEACHER")
        except User.DoesNotExist:
            return Response(
                {"detail": "Teacher not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        subject.teachers.add(teacher)
        return Response(
           TeacherSerializer(teacher).data,
            status=status.HTTP_200_OK,
        )

    # ---------------------------
    # REMOVE TEACHER FROM SUBJECT
    # ---------------------------
    @action(detail=True, methods=["post","patch"], url_path="remove-teacher")
    def remove_teacher(self, request, pk=None):
        subject = self.get_object()
        teacher_id = request.data.get("teacher_id")

        if not teacher_id:
            return Response(
                {"detail": "teacher_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject.teachers.remove(teacher_id)
        return Response(
            {"message": "Teacher removed successfully"},
            status=status.HTTP_200_OK,
        )
    @action(detail=True, methods=["get"], url_path="teachers")
    def list_teachers(self, request, pk=None):
        subject = self.get_object()
        teachers = subject.teachers.all()
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TeacherSubjectListViewSet(ReadOnlyModelViewSet):
    serializer_class = SubjectListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            SubjectOffering.objects
            .select_related("subject", "section")
            .filter(
                teacher=user,
                subject__is_active=True,
                section__is_active=True
            )
            .order_by("section__grade_level", "section__name")
        )
class IsTeacherOrAdminWrite(permissions.BasePermission):
    """
    - Auth required
    - Everyone authenticated can READ
    - Only TEACHER/ADMIN can CREATE/UPDATE/DELETE
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        return getattr(request.user, "role", None) in ("TEACHER", "ADMIN")

class SubjectOfferingViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing SubjectOfferings.
    """
    serializer_class = SubjectOfferingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user

        # Teachers only see their own offerings
        if user.role == "TEACHER":
            return SubjectOffering.objects.filter(teacher=user)

        # Admins can see all (optional)
        if user.role == "ADMIN":
            return SubjectOffering.objects.all()

        # Others see none
        return SubjectOffering.objects.none()
    
    @action(detail=True, methods=["get"], url_path="students")
    def students(self, request, pk=None):
        offering = self.get_object()  # respects get_queryset() (teacher restriction)

        students_qs = (
            Student.objects
            .filter(section=offering.section)
            .select_related("user")
            # FIX: order by related user fields (not Student.last_name)
            .order_by("user__last_name", "user__first_name")
        )

        data = StudentSerializer(students_qs, many=True).data
        return Response(data)
    @action(detail=False, methods=["get"], url_path="by-section/(?P<section_id>[^/.]+)")
    def by_section(self, request, section_id=None):
        """
        List all SubjectOfferings for a specific section.
        """
        offerings = self.get_queryset().filter(section_id=section_id)
        serializer = self.get_serializer(offerings, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """
        Allow creation of SubjectOffering using section_id in request data.
        """
        section_id = self.request.data.get("section_id")
        if not section_id:
            raise serializers.ValidationError({"section_id": "This field is required."})
        section = Section.objects.get(id=section_id)
        serializer.save(section=section, teacher=self.request.user)

    @action(detail=True, methods=["get"], url_path="quizzes")
    def quizzes(self, request, pk=None):
        # IMPORTANT: FK field is SubjectOffering / SubjectOffering_id (NOT subject_offering)
        qs = Quiz.objects.filter(SubjectOffering_id=pk).order_by("-posted_at", "-created_at")
        return Response(QuizSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="recent-quiz-grades")
    def recent_quiz_grades(self, request, pk=None):
        attempts = (
            QuizAttempt.objects
            .filter(quiz__SubjectOffering_id=pk, status="GRADED",)
            .select_related("student__user", "quiz")
            .order_by("-submitted_at")[:10]
        )

        data = []
        for a in attempts:
            total = a.quiz.total_points or 0
            percent = round((a.score / total) * 100, 2) if total else 0
            student_name = f"{a.student.user.first_name} {a.student.user.last_name}".strip()

            data.append({
                "student": student_name,
                "quiz": a.quiz.title,
                "score": a.score,
                "total": total,
                "percent": percent,
                "submitted_at": a.submitted_at,
            })

        return Response(data)
    @action(detail=False, methods=["get"], url_path="my", permission_classes=[IsAuthenticated])
    def my_subject_offerings(self, request):
        """
        GET /api/subject-offerings/my/
        Returns subject offerings for the logged-in STUDENT based on their section.
        """
        user = request.user

        # Student profile should exist if user is a student
        student = getattr(user, "student_profile", None)
        if not student or not student.section:
            return Response([])

        offerings = SubjectOffering.objects.filter(section=student.section).order_by("name")
        serializer = self.get_serializer(offerings, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=["get"], url_path="files")
    def files(self, request, pk=None):
        offering = self.get_object()
        qs = offering.files.all().order_by("-created_at")
        ser = SubjectOfferingFileSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["post"], url_path="files/upload")
    def upload_file(self, request, pk=None):
        offering = self.get_object()

        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "file is required."}, status=status.HTTP_400_BAD_REQUEST)

        # size limit
        if f.size > MAX_BYTES:
            return Response({"detail": f"File too large. Max is {MAX_MB}MB."}, status=status.HTTP_400_BAD_REQUEST)

        # extension allowlist
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED_EXTS:
            return Response({"detail": f"File type not allowed: {ext}"}, status=status.HTTP_400_BAD_REQUEST)

        title = (request.data.get("title") or "").strip() or f.name

        # content type
        content_type = getattr(f, "content_type", "") or (mimetypes.guess_type(f.name)[0] or "")

        obj = SubjectOfferingFile.objects.create(
            subject_offering=offering,
            title=title,
            file=f,
            file_size=f.size,
            content_type=content_type,
        )

        ser = SubjectOfferingFileSerializer(obj, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"files/(?P<file_id>\d+)")
    def delete_file(self, request, pk=None, file_id=None):
        offering = self.get_object()
        obj = get_object_or_404(SubjectOfferingFile, subject_offering=offering, id=file_id)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class StudentSubjectOfferingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Student view: list subject offerings for the logged-in student (based on their section),
    including quarterly progress + average.
    """
    serializer_class = StudentSubjectOfferingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != "STUDENT":
            return SubjectOffering.objects.none()

        try:
            student = Student.objects.select_related("section").get(user=user)
        except Student.DoesNotExist:
            return SubjectOffering.objects.none()

        if not student.section:
            return SubjectOffering.objects.none()

        return (
            SubjectOffering.objects
            .select_related("section", "teacher")
            .filter(section=student.section)
            .order_by("name")
        )

    def list(self, request, *args, **kwargs):
        qs = list(self.get_queryset())

        # attach computed fields using student's grades
        user = request.user
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        grades = (
            QuarterlyGrade.objects
            .filter(student=student, SubjectOffering__in=qs, semester__school_year__is_active=True)
            .select_related("SubjectOffering")
        )

        by_offering = {}
        for g in grades:
            by_offering.setdefault(g.SubjectOffering_id, []).append(g)

        for o in qs:
            gs = by_offering.get(o.id, [])
            o._student_quarterly_grades = gs

            # Progress across the three semesters in the active school year.
            progress = int((len({g.semester_id for g in gs}) / 3) * 100) if gs else 0
            o.progress = progress

            # average = mean of available quarters (or 0)
            if gs:
                avg = sum(float(g.final_grade) for g in gs) / len(gs)
            else:
                avg = 0
            o.average = round(avg, 2)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="my-grades")
    def my_grades(self, request, pk=None):
        """
        Returns the student's quarterly grades for this subject offering.
        """
        user = request.user
        if user.role != "STUDENT":
            return Response({"detail": "Not authorized"}, status=403)

        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({"detail": "Student profile not found"}, status=404)

        qs = filter_grade_semester(QuarterlyGrade.objects.filter(student=student, SubjectOffering_id=pk), request).order_by("semester__school_year_id", "semester__name", "quarter")
        return Response(QuarterlyGradeSerializer(qs, many=True).data)
    
    @action(detail=True, methods=["get"], url_path="quizzes")
    def quizzes(self, request, pk=None):
        offering = self.get_object()
        qs = offering.quizzes.all().order_by("-id")  # uses related_name="quizzes"
        return Response(QuizSerializer(qs, many=True).data)
    
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()

        student = getattr(request.user, "student_profile", None)
        if student:
            grades = QuarterlyGrade.objects.filter(student=student, SubjectOffering=obj, semester__school_year__is_active=True).select_related("semester").order_by("semester__name")
            obj._student_quarterly_grades = list(grades)

        # optional: compute average + progress for detail view too
            gs = obj._student_quarterly_grades
            obj.progress = int((len({g.semester_id for g in gs}) / 3) * 100) if gs else 0
            obj.average = round(sum(float(g.final_grade) for g in gs) / len(gs), 2) if gs else 0

        serializer = self.get_serializer(obj)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"], url_path="files")
    def files(self, request, pk=None):
        offering = self.get_object()  # already restricted to student's section via get_queryset
        qs = offering.files.all().order_by("-created_at")
        ser = SubjectOfferingFileSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)
    
class GradeChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GradeChangeLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = GradeChangeLog.objects.all().order_by("-timestamp")

        # Optional filters
        subject_offering_id = self.request.query_params.get("subject_offering")
        if subject_offering_id:
            qs = qs.filter(SubjectOffering_id=subject_offering_id)

        return qs
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_submissions_summary(request):
    # Only teachers (or admins) should access this
    if request.user.role not in ("TEACHER", "ADMIN"):
        return Response({"detail": "Not authorized"}, status=403)

    # If TEACHER, limit to their offerings
    offerings = SubjectOffering.objects.all()
    if request.user.role == "TEACHER":
        offerings = offerings.filter(teacher=request.user)

    # Example summary payload (adjust to what your frontend expects)
    data = []
    for o in offerings.select_related("subject", "section"):
        total_students = Student.objects.filter(section=o.section).count()
        # If you track "submissions" via QuizAttempt, you can compute here
        attempts = QuizAttempt.objects.filter(quiz__SubjectOffering=o).count()
        unique_students = (
            QuizAttempt.objects.filter(quiz__SubjectOffering=o)
            .values("student_id").distinct().count()
        )
        submission_rate = round((unique_students / total_students) * 100, 2) if total_students else 0

        data.append({
            "subject_offering_id": o.id,
            "subject": o.name,
            "total_students": total_students,
            "totals": {
                "attempts": attempts,
                "unique_students": unique_students,
                "submission_rate": submission_rate,
            },
        })

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_submissions_subject_detail(request, subject_offering_id: int):
    # Optional: restrict to teacher’s own subject offerings
    if request.user.role not in ("TEACHER", "ADMIN"):
        return Response({"detail": "Not authorized"}, status=403)

    try:
        offering = SubjectOffering.objects.select_related("section").get(id=subject_offering_id)
    except SubjectOffering.DoesNotExist:
        return Response({"detail": "Subject offering not found"}, status=404)

    if request.user.role == "TEACHER" and getattr(offering, "teacher_id", None) != request.user.id:
        return Response({"detail": "Not authorized for this subject offering"}, status=403)

    # total students in the offering’s section
    total_students = Student.objects.filter(section=offering.section_id).count()

    # quizzes under this subject offering
    quizzes = Quiz.objects.filter(SubjectOffering=offering).order_by("-id")

    quiz_rows = []
    total_attempts = 0
    total_unique_students = 0

    for q in quizzes:
        attempts = QuizAttempt.objects.filter(quiz=q).count()
        unique_students = QuizAttempt.objects.filter(quiz=q).values("student_id").distinct().count()
        total_attempts += attempts
        total_unique_students += unique_students

        quiz_rows.append({
            "quiz_id": q.id,
            "title": q.title,
            "attempts": attempts,
            "unique_students": unique_students,
            "status": getattr(q, "status", ""),        # keep if you have status
            "open_time": getattr(q, "open_time", None),
            "close_time": getattr(q, "close_time", None),
        })

    submission_rate = round((total_unique_students / total_students) * 100, 2) if total_students else 0

    return Response({
        "subject_offering_id": offering.id,
        "subject": getattr(offering, "name", str(offering)),
        "total_students": total_students,
        "totals": {
            "attempts": total_attempts,
            "unique_students": total_unique_students,
            "submission_rate": submission_rate,
        },
        "quizzes": quiz_rows,
    })


# ============================================================================================================================================================= #
# CREATE USER (ADMIN ONLY)                                                                                                                                      #
# ============================================================================================================================================================= #
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_user(request):
    if request.user.role != "ADMIN":
        return Response(
            {"detail": "Not authorized"},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = UserSerializer(
        data=request.data,
        context={"request": request}
    )

    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(
        {"message": "User created successfully"},
        status=status.HTTP_201_CREATED
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def import_students_excel(request):
    if request.user.role != "ADMIN":
        return Response({"detail": "Not authorized"}, status=403)

    file = request.FILES.get("file")
    if not file:
        return Response({"detail": "Excel file is required"}, status=400)

    try:
        df = pd.read_excel(file)
    except Exception as e:
        return Response({"detail": f"Invalid Excel file: {e}"}, status=400)

    required_cols = {
        "email",
        "school_id",
        "first_name",
        "last_name",
        "grade_level",
        "password",
    }

    missing = required_cols - set(df.columns)
    if missing:
        return Response(
            {"detail": f"Missing columns: {list(missing)}"},
            status=400
        )

    df = df.where(pd.notnull(df), None)

    created = 0
    errors = []

    with transaction.atomic():
        for index, row in df.iterrows():
            excel_row = index + 2  # header = row 1

            try:
                if User.objects.filter(email=row["email"]).exists():
                    raise ValueError("Email already exists")

                if User.objects.filter(school_id=row["school_id"]).exists():
                    raise ValueError("School ID already exists")

                user = User.objects.create_user(
                    email=str(row["email"]).lower().strip(),
                    password=str(row["password"]).strip(),  # ✅ Excel password
                    school_id=str(row["school_id"]).strip(),
                    first_name=str(row["first_name"]).strip(),
                    last_name=str(row["last_name"]).strip(),
                    role="STUDENT",
                    status="ACTIVE",
                )

                Student.objects.create(
                    user=user,
                    grade_level=str(row["grade_level"]).upper().strip(),
                )

                created += 1

            except Exception as e:
                errors.append({
                    "row": excel_row,
                    "error": str(e),
                })

    return Response({
        "message": "Student import completed",
        "created": created,
        "failed": len(errors),
        "errors": errors,
    })


# =========================
# LIST USERS (ADMIN ONLY)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_users(request):
    if request.user.role != "ADMIN":
        return Response(
            {"detail": "Not authorized"},
            status=status.HTTP_403_FORBIDDEN
        )

    users = User.objects.all().order_by("-id")
    serializer = UserSerializer(users, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)

class StudentViewSet(ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Student.objects.select_related("user", "section")

        grade = self.request.query_params.get("grade_level")
        section = self.request.query_params.get("section")

        # 🔹 Filter by grade level
        if grade:
            queryset = queryset.filter(grade_level=grade)

        # 🔹 Unassigned students
        if section == "null":
            queryset = queryset.filter(section__isnull=True)

        return queryset
    @action(detail=True, methods=["get"], url_path="semester-summary")
    def semester_summary(self, request, pk=None):
        student = self.get_object()
        grades = QuarterlyGrade.objects.filter(
            student=student, semester__school_year__is_active=True,
        ).select_related("SubjectOffering", "semester")
        by_offering = {}
        for grade in grades:
            item = by_offering.setdefault(grade.SubjectOffering_id, {
                "subject_offering_id": grade.SubjectOffering_id,
                "subject": grade.SubjectOffering.name,
                "sem1": None, "sem2": None, "sem3": None, "final": None,
            })
            item[grade.semester.name.lower()] = grade.final_grade
        for item in by_offering.values():
            values = [item[key] for key in ("sem1", "sem2", "sem3") if item[key] is not None]
            item["final"] = round(sum(values) / len(values), 2) if values else None
        return Response(list(by_offering.values()))

    @action(detail=True, methods=["get"], url_path="quarterly-summary")
    def quarterly_summary(self, request, pk=None):
        student = self.get_object()

        grades = (
            QuarterlyGrade.objects
            .filter(student=student, semester__isnull=True)
            .select_related("SubjectOffering")
            .order_by("SubjectOffering_id", "quarter")
        )

        # group by offering
        by_offering = {}
        for g in grades:
            oid = g.SubjectOffering_id
            if oid not in by_offering:
                by_offering[oid] = {
                    "subject_offering_id": oid,
                    "subject": g.SubjectOffering.name,
                    "q1": None,
                    "q2": None,
                    "q3": None,
                    "q4": None,
                    "final": None,
                }

            if g.quarter == "Q1":
                by_offering[oid]["q1"] = g.final_grade
            elif g.quarter == "Q2":
                by_offering[oid]["q2"] = g.final_grade
            elif g.quarter == "Q3":
                by_offering[oid]["q3"] = g.final_grade
            elif g.quarter == "Q4":
                by_offering[oid]["q4"] = g.final_grade

        # compute final average (if at least one quarter exists)
        for item in by_offering.values():
            vals = [item["q1"], item["q2"], item["q3"], item["q4"]]
            vals = [v for v in vals if v is not None]
            item["final"] = round(sum(vals) / len(vals), 2) if vals else None

        return Response(list(by_offering.values()))
    
class TeacherViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(role="TEACHER")
    serializer_class = TeacherSerializer

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def user_detail(request, pk):
    if request.user.role != "ADMIN":
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
    
    user = get_object_or_404(User, pk=pk)

    if request.method == "GET":
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PATCH":
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "DELETE":
        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)


# =========================
# LOGIN
# =========================
class LoginView(APIView):
    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Login attempt - Data received: {request.data}")
        logger.info(f"Content-Type: {request.content_type}")
        
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
# ==================== TEACHER QUIZ VIEWS ====================

from .quiz_groups import QuizGroupsMixin
from .quiz_duplicate import QuizDuplicateMixin


class TeacherQuizViewSet(QuizDuplicateMixin, QuizGroupsMixin, viewsets.ModelViewSet):
    """ViewSet for teachers to manage quizzes"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'TEACHER':
            quizzes = Quiz.objects.filter(teacher=self.request.user)
            Quiz.sync_statuses(quizzes)
            return quizzes.order_by('-created_at')
        return Quiz.objects.none()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return QuizCreateUpdateSerializer
        return QuizSerializer
    
    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    def update(self, request, *args, **kwargs):
        quiz = self.get_object()
        # A title-only update is allowed without changing the quiz content/status.
        if set(request.data) == {"title"}:
            from rest_framework import serializers as drf_serializers
            if request.user.role != "TEACHER" or quiz.teacher_id != request.user.id:
                return Response({"detail": "Only the owning teacher can edit this title."}, status=403)
            field = drf_serializers.CharField(
                max_length=Quiz._meta.get_field("title").max_length,
                allow_blank=False, trim_whitespace=True,
            )
            try:
                title = field.run_validation(request.data["title"])
            except drf_serializers.ValidationError as exc:
                return Response({"title": exc.detail}, status=400)
            quiz.title = title
            quiz.save(update_fields=["title", "updated_at"])
            return Response({"id": quiz.id, "title": quiz.title})
        # Publishing/closing is separate from editing quiz content.
        if set(request.data) == {"status"}:
            new_status = request.data["status"]
            if new_status not in dict(Quiz.STATUS_CHOICES):
                return Response({"status": ["Invalid status."]}, status=400)
            if new_status == "DRAFT" and quiz.status != "DRAFT":
                return Response({"detail": "Published quizzes cannot revert to draft."}, status=400)
            if new_status == "SCHEDULED":
                if quiz.open_time is None or quiz.close_time is None:
                    return Response({"detail": "Set open and close times before scheduling."}, status=400)
                if quiz.close_time <= quiz.open_time:
                    return Response({"detail": "Closing time must be after opening time."}, status=400)
                if quiz.close_time <= timezone.now():
                    return Response({"detail": "This quiz's closing time has passed."}, status=400)
            if new_status == "OPEN":
                # An explicit Open action starts now and requires manual closing.
                quiz.open_time = timezone.now()
                quiz.close_time = None
            quiz.status = new_status
            quiz.status = quiz.current_status()
            quiz.save(update_fields=["status", "open_time", "close_time", "updated_at"])
            return Response(QuizSerializer(quiz, context=self.get_serializer_context()).data)
        if not quiz.is_editable():
            return Response({"detail": "Only an editable draft can have its content changed."}, status=400)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Override create to return full quiz data with ID"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full quiz data using QuizSerializer
        quiz = serializer.instance
        output_serializer = QuizSerializer(quiz)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        quiz = self.get_object()
        serializer = QuizQuestionSerializer(data=request.data)

        if not quiz.is_editable():
            return Response(
                {'error':'Quiz can no longer be edited once it is open.'}, status=400
            )

        if serializer.is_valid():
            serializer.save(quiz=quiz)

        # recalc total_points
            total = quiz.questions.aggregate(s=Sum('points'))['s'] or 0
            quiz.total_points = total
            quiz.save(update_fields=['total_points'])

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """Get all questions for a quiz"""
        quiz = self.get_object()
        questions = quiz.questions.all().order_by('order')
        serializer = QuizQuestionSerializer(questions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_times(self, request, pk=None):
        """Update quiz open and close times"""
        try:
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            from datetime import datetime
            quiz = self.get_object()

            if not quiz.is_editable():
                return Response(
                    {'error':'Quiz times can no longer be edited once it is open.'}, status=400
                )
            
            if 'open_time' in request.data:
                time_str = request.data['open_time']
                # Try parsing as ISO format first (e.g., "2026-01-12T08:33:00.000Z")
                try:
                    parsed_time = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                except:
                    # Fall back to simple format (e.g., "2026-01-12T23:56")
                    if len(time_str) == 16:  # Format: YYYY-MM-DDTHH:MM
                        time_str += ':00'
                    parsed_time = parse_datetime(time_str)
                    if parsed_time and timezone.is_naive(parsed_time):
                        parsed_time = timezone.make_aware(parsed_time)
                quiz.open_time = parsed_time
                
            if 'close_time' in request.data:
                time_str = request.data['close_time']
                try:
                    parsed_time = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                except:
                    if len(time_str) == 16:
                        time_str += ':00'
                    parsed_time = parse_datetime(time_str)
                    if parsed_time and timezone.is_naive(parsed_time):
                        parsed_time = timezone.make_aware(parsed_time)
                quiz.close_time = parsed_time
            
            quiz.save()
            serializer = self.get_serializer(quiz)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e), 'detail': 'Failed to update quiz times'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """Get all student attempts for this quiz"""
        quiz = self.get_object()
        attempts = quiz.attempts.all().order_by('-started_at')
        serializer = QuizAttemptSerializer(attempts, many=True, context={"request": request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def student_answers(self, request, pk=None):
        """Get all student answers for manual grading"""
        quiz = self.get_object()
        attempts = quiz.attempts.filter(status__in=['SUBMITTED', 'GRADED']).select_related('student__user')
        
        result = []
        for attempt in attempts:
            answers = attempt.answers.select_related('question', 'selected_choice').all()
            student_data = {
                'attempt_id': attempt.id,
                'student_id': attempt.student.id,
                'student_name': f"{attempt.student.user.first_name} {attempt.student.user.last_name}",
                'student_email': attempt.student.user.email,
                'submitted_at': attempt.submitted_at,
                'score': attempt.score,
                'status': attempt.status,
                'answers': QuizAnswerSerializer(answers, many=True, context={"request": request}).data
            }
            result.append(student_data)
        
        return Response(result)
    
    @action(detail=False, methods=['post'], url_path='grade-answer')
    def grade_answer(self, request):
        from django.utils import timezone

        answer_id = request.data.get('answer_id')
        points_earned = request.data.get('points_earned')
        feedback = request.data.get('feedback', '')

        try:
            answer = QuizAnswer.objects.get(id=answer_id)

            if answer.attempt.quiz.teacher != request.user:
                return Response({'error': 'You do not have permission to grade this answer'},
                            status=status.HTTP_403_FORBIDDEN)

            if answer.attempt.quiz.activity_mode == 'GROUP':
                return Response({'error': 'Use Group Grading in Manage Activity to grade all members together.'}, status=400)

            answer.points_earned = float(points_earned)
            answer.teacher_feedback = feedback
            answer.manually_graded = True
            answer.graded_by = request.user
            answer.graded_at = timezone.now()
            answer.save()

            attempt = answer.attempt
            total_score = attempt.answers.aggregate(total=Sum('points_earned'))['total'] or 0
            attempt.score = total_score
            attempt.status = 'GRADED'
            attempt.save()

            # ✅ NEW: recompute quarterly component so written_work_score updates
            quiz = attempt.quiz
            recalc_quarterly_component(
                student=attempt.student,
                offering=quiz.SubjectOffering,
                semester=quiz.semester,
                grade_type=quiz.grade_type,
            )

            return Response({
                'message': 'Answer graded successfully',
                'answer': QuizAnswerSerializer(answer, context={"request": request}).data,
                'new_total_score': total_score
            })

        except QuizAnswer.DoesNotExist:
            return Response({'error': 'Answer not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_quiz_question(request, question_id):
    """Update or delete a quiz question"""
    try:
        question = QuizQuestion.objects.get(id=question_id, quiz__teacher=request.user)
    except QuizQuestion.DoesNotExist:
        return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)
    
    quiz = question.quiz
    if not quiz.is_editable():
        return Response({'error': 'Quiz can no longer be edited once it is open.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if request.method == 'PUT':
        serializer = QuizQuestionSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            total = quiz.questions.aggregate(s=Sum('points'))['s'] or 0
            quiz.total_points = total
            quiz.save(update_fields=['total_points'])

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        question.delete()

        total = quiz.questions.aggregate(s=Sum('points'))['s'] or 0
        quiz.total_points = total
        quiz.save(update_fields=['total_points'])

        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== STUDENT QUIZ VIEWS ====================

def published_quizzes_for_student(student):
    """Enrollment is enforced by offering/section IDs, never display names."""
    if student.section_id is None:
        return Quiz.objects.none()
    quizzes = Quiz.objects.filter(SubjectOffering__section_id=student.section_id)
    Quiz.sync_statuses(quizzes)
    return quizzes.exclude(status="DRAFT").select_related("SubjectOffering", "teacher", "semester")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_quizzes(request):
    """Get all available quizzes for a student"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all quizzes except DRAFT (include SCHEDULED, OPEN, and CLOSED for history)
    # Students should see all published quizzes regardless of status
    quizzes = published_quizzes_for_student(request.user.student_profile).order_by('open_time')
    serializer = StudentQuizSerializer(quizzes, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_quiz_detail(request, quiz_id):
    """Get quiz details for a student"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        quiz = published_quizzes_for_student(request.user.student_profile).get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = StudentQuizSerializer(quiz, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_quiz(request, quiz_id):
    """Start a quiz attempt"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        quiz = published_quizzes_for_student(request.user.student_profile).get(id=quiz_id)
    except Quiz.DoesNotExist:
        return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if quiz is open
    if not quiz.is_open():
        return Response({'error': 'Quiz is not currently open'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if student already has an attempt
    student = request.user.student_profile
    existing_attempt = QuizAttempt.objects.filter(
        quiz=quiz, 
        student=student, 
        status='IN_PROGRESS'
    ).first()
    
    if existing_attempt:
        # Return existing attempt with quiz and questions data
        questions = quiz.questions.all().order_by('order')
        questions_data = StudentQuizQuestionSerializer(questions, many=True).data
        
        return Response({
            'attempt_id': existing_attempt.id,
            'quiz': StudentQuizSerializer(quiz).data,
            'questions': questions_data,
            'started_at': existing_attempt.started_at
        })
    
    # Check if multiple attempts allowed
    if not quiz.allow_multiple_attempts:
        previous_attempts = QuizAttempt.objects.filter(quiz=quiz, student=student).count()
        if previous_attempts > 0:
            return Response({'error': 'Multiple attempts not allowed'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create new attempt
    attempt = QuizAttempt.objects.create(quiz=quiz, student=student)
    
    # Return quiz questions
    questions = quiz.questions.all().order_by('order')
    questions_data = QuizQuestionSerializer(questions, many=True).data
    
    return Response({
        'attempt_id': attempt.id,
        'quiz': StudentQuizSerializer(quiz).data,
        'questions': questions_data,
        'started_at': attempt.started_at
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_quiz(request, attempt_id):
    """Submit quiz answers with optional file uploads"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)

    try:
        attempt = QuizAttempt.objects.get(
            id=attempt_id,
            student=request.user.student_profile,
            status='IN_PROGRESS'
        )
    except QuizAttempt.DoesNotExist:
        return Response({'error': 'Attempt not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if quiz is still open
    if not attempt.quiz.is_open():
        return Response({'error': 'Quiz has closed'}, status=status.HTTP_400_BAD_REQUEST)

    # Handle both JSON and multipart form data
    if request.content_type and 'multipart' in request.content_type:
        import json
        answers_json = request.data.get('answers', '[]')
        answers_data = json.loads(answers_json) if isinstance(answers_json, str) else answers_json
    else:
        serializer = QuizSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        answers_data = serializer.validated_data['answers']

    # Process answers
    total_score = 0.0

    for answer_data in answers_data:
        question_id = answer_data.get('question_id')
        selected_choice_id = answer_data.get('selected_choice_id')
        text_answer = answer_data.get('text_answer', '')

        try:
            question = QuizQuestion.objects.get(id=question_id, quiz=attempt.quiz)
        except QuizQuestion.DoesNotExist:
            continue

        answer, created = QuizAnswer.objects.get_or_create(
            attempt=attempt,
            question=question,
            defaults={'text_answer': text_answer}
        )

        if not created:
            answer.text_answer = text_answer

        # file upload
        file_key = f'answer_file_{question_id}'
        if file_key in request.FILES:
            answer.answer_file = request.FILES[file_key]

        # Grade objective questions
        if question.question_type in ['MULTIPLE_CHOICE', 'TRUE_FALSE'] and selected_choice_id:
            try:
                choice = QuizChoice.objects.get(id=selected_choice_id, question=question)
                answer.selected_choice = choice
                answer.is_correct = choice.is_correct
                if choice.is_correct:
                    answer.points_earned = float(question.points or 0)
                else:
                    answer.points_earned = 0.0
            except QuizChoice.DoesNotExist:
                answer.points_earned = 0.0
        else:
            # subjective items default 0 until teacher grades
            if answer.points_earned is None:
                answer.points_earned = 0.0

        answer.save()
        total_score += float(answer.points_earned or 0.0)

    # Update attempt
    attempt.submitted_at = timezone.now()
    attempt.score = float(total_score)
    attempt.status = 'SUBMITTED'
    attempt.save()

    # ✅ IMPORTANT: do NOT += to QuarterlyGrade here.
    # ✅ Recompute/overwrite using BEST attempt per quiz.
    quiz = attempt.quiz
    recalc_quarterly_component(
        student=attempt.student,
        offering=quiz.SubjectOffering,
        semester=quiz.semester,
        grade_type=quiz.grade_type,
    )

    return Response({
        'message': 'Quiz submitted successfully',
        'score': float(total_score),
        'total_points': attempt.quiz.total_points,
        'percentage': (total_score / attempt.quiz.total_points * 100) if attempt.quiz.total_points > 0 else 0
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_quiz_attempts(request):
    """Get all quiz attempts for the current student"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    attempts = QuizAttempt.objects.filter(
        student=request.user.student_profile
    ).order_by('-started_at')
    
    serializer = QuizAttemptSerializer(attempts, many=True, context={"request": request})
    return Response(serializer.data)


# AI-powered endpoints (Temporarily disabled - ready for future use)
# Uncomment when ready to enable AI features

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
     """General AI chat endpoint"""
     ai_service = AIService()
     messages = request.data.get('messages', [])
     
     if not messages:
         return Response({'error': 'Messages are required'}, status=status.HTTP_400_BAD_REQUEST)
     
     response = ai_service.chat(messages)
     return Response({'response': response})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quiz(request):
     """Generate quiz questions using AI"""
     ai_service = AIService()
     SubjectOffering = request.data.get('name', '')
     topic = request.data.get('topic', '')
     num_questions = request.data.get('num_questions', 5)
     
     if not SubjectOffering or not topic:
         return Response({'error': 'Subject and topic are required'}, status=status.HTTP_400_BAD_REQUEST)
     
     questions = ai_service.generate_quiz_questions(SubjectOffering, topic, num_questions)
     return Response({'questions': questions})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_concept(request):
     """Get AI explanation of a concept"""
     ai_service = AIService()
     concept = request.data.get('concept', '')
     SubjectOffering = request.data.get('name', '')
     
     if not concept or not SubjectOffering:
         return Response({'error': 'Concept and subject are required'}, status=status.HTTP_400_BAD_REQUEST)
     
     explanation = ai_service.explain_concept(concept, SubjectOffering)
     return Response({'explanation': explanation})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def provide_feedback(request):
     """Get AI feedback on student answer"""
     ai_service = AIService()
     student_answer = request.data.get('student_answer', '')
     correct_answer = request.data.get('correct_answer', '')
     question = request.data.get('question', '')
     
     if not all([student_answer, correct_answer, question]):
         return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
     
     feedback = ai_service.provide_feedback(student_answer, correct_answer, question)
     return Response({'feedback': feedback})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_plan(request):
     """Generate personalized study plan"""
     ai_service = AIService()
     SubjectOffering = request.data.get('name', '')
     topics = request.data.get('topics', [])
     difficulty_level = request.data.get('difficulty_level', 'intermediate')
     
     if not SubjectOffering or not topics:
         return Response({'error': 'Subject and topics are required'}, status=status.HTTP_400_BAD_REQUEST)
     
     study_plan = ai_service.generate_study_plan(SubjectOffering, topics, difficulty_level)
     return Response({'study_plan': study_plan})


# ==================== GRADE FORECASTING VIEWS ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def grade_forecast(request, student_id=None, SubjectOffering_id=None):
    """
    Get or generate grade forecast for a student
    
    GET: Retrieve existing forecast
    POST: Generate new forecast using AI
    """
    # Determine student_id (from param or current user)
    if student_id is None:
        if hasattr(request.user, 'student_profile'):
            student_id = request.user.student_profile.id
        else:
            return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Get all forecasts for student or specific subject
        if SubjectOffering_id:
            try:
                forecast = GradeForecast.objects.get(student_id=student_id, SubjectOffering_id=SubjectOffering_id)
                serializer = GradeForecastSerializer(forecast)
                return Response(serializer.data)
            except GradeForecast.DoesNotExist:
                return Response(
                    {'error': 'No forecast found. Generate one by making a POST request.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            forecasts = GradeForecast.objects.filter(student_id=student_id)
            serializer = GradeForecastSerializer(forecasts, many=True)
            return Response(serializer.data)
    
    elif request.method == 'POST':
        # Generate new forecast
        if not SubjectOffering_id:
            SubjectOffering_id = request.data.get('SubjectOffering_id')
        
        if not SubjectOffering_id:
            return Response(
                {'error': 'SubjectOffering_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate forecast using analytics service
        analytics = GradeAnalyticsService()
        forecast = analytics.generate_forecast(student_id, SubjectOffering_id)

        if forecast:
            serializer = GradeForecastSerializer(forecast)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': 'Insufficient data. Need at least 1 completed quiz.'},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_topic_performance(request, student_id=None, SubjectOffering_id=None):
    """Get topic-level performance data for a student"""
    # Determine student_id (from param or current user)
    if student_id is None:
        if hasattr(request.user, 'student_profile'):
            student_id = request.user.student_profile.id
        else:
            return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    # Filter by subject if provided
    topics_query = QuizTopicPerformance.objects.filter(student_id=student_id)
    if SubjectOffering_id:
        topics_query = topics_query.filter(SubjectOffering_id=SubjectOffering_id)
    
    topics = topics_query.order_by('-accuracy_percentage')
    serializer = QuizTopicPerformanceSerializer(topics, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_grade_analytics(request):
    """Get comprehensive analytics for current student"""
    if not hasattr(request.user, 'student_profile'):
        return Response({'error': 'Not a student'}, status=status.HTTP_403_FORBIDDEN)
    
    student = request.user.student_profile
    SubjectOffering_id = request.query_params.get('SubjectOffering_id')
    
    # Get analytics data
    analytics = GradeAnalyticsService()
    data = analytics.get_student_quiz_data(student.id, SubjectOffering_id)
    
    if not data:
        return Response({
            'message': 'No quiz data available yet',
            'quiz_count': 0
        })
    
    # Get existing forecast if available
    forecast = None
    if SubjectOffering_id:
        try:
            forecast_obj = GradeForecast.objects.get(student=student, SubjectOffering_id=SubjectOffering_id)
            forecast = GradeForecastSerializer(forecast_obj).data
        except GradeForecast.DoesNotExist:
            pass
    
    return Response({
        'student_name': data['student_name'],
        'quiz_count': data['quiz_count'],
        'current_average': round(data['current_average'], 2),
        'quiz_scores': data['quiz_scores'],
        'recent_trend': data['recent_trend'],
        'topic_performance': data['topic_performance'],
        'last_quiz_date': data['last_quiz_date'],
        'forecast': forecast
    })


# ==================== QUARTERLY GRADES VIEWS ====================

def filter_grade_semester(queryset, request):
    value = request.query_params.get("semester")
    if value:
        return queryset.filter(semester=SemesterReferenceField().run_validation(value))
    if "semester-grades" in request.path:
        return queryset.filter(semester__school_year__is_active=True)
    return queryset


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quarterly_grades(request):
    """Get or create quarterly grades"""
    if request.method == 'GET':
        # Filter by teacher for teachers, or by student for students
        if request.user.role == 'TEACHER':
            SubjectOffering_id = request.query_params.get('SubjectOffering_id')
            quarter = request.query_params.get('quarter')
            
            grades_query = QuarterlyGrade.objects.filter(SubjectOffering__teacher=request.user)
            # Only filter by SubjectOffering_id if it's a valid integer
            if SubjectOffering_id and SubjectOffering_id != 'NaN':
                try:
                    SubjectOffering_id_int = int(SubjectOffering_id)
                    grades_query = grades_query.filter(SubjectOffering_id=SubjectOffering_id_int)
                except (ValueError, TypeError):
                    pass  # Ignore invalid SubjectOffering_id
            if quarter:
                grades_query = grades_query.filter(quarter=quarter)
            
            grades_query = filter_grade_semester(grades_query, request)
            grades = grades_query.select_related('student__user', 'SubjectOffering').order_by('student__user__last_name', 'student__user__first_name')
            serializer = QuarterlyGradeSerializer(grades, many=True)
            return Response(serializer.data)
        
        elif hasattr(request.user, 'student_profile'):
            # Students can only see their own grades
            student = request.user.student_profile
            SubjectOffering_id = request.query_params.get('SubjectOffering_id')
            quarter = request.query_params.get('quarter')
            
            grades_query = QuarterlyGrade.objects.filter(student=student)
            if SubjectOffering_id:
                grades_query = grades_query.filter(SubjectOffering_id=SubjectOffering_id)
            if quarter:
                grades_query = grades_query.filter(quarter=quarter)
            
            grades_query = filter_grade_semester(grades_query, request)
            grades = grades_query.select_related('SubjectOffering').order_by('quarter')
            serializer = QuarterlyGradeSerializer(grades, many=True)
            return Response(serializer.data)
        
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    elif request.method == 'POST':
        # Only teachers can create grades
        if request.user.role != 'TEACHER':
            return Response({'error': 'Only teachers can create grades'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = QuarterlyGradeCreateUpdateSerializer(data=request.data,context={"request": request})
        if serializer.is_valid():
            grade = serializer.save()
            output_serializer = QuarterlyGradeSerializer(grade)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def quarterly_grade_detail(request, grade_id):
    """Get, update, or delete a specific quarterly grade"""
    try:
        grade = QuarterlyGrade.objects.get(id=grade_id)
    except QuarterlyGrade.DoesNotExist:
        return Response({'error': 'Grade not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Permission check
    if request.user.role == 'TEACHER':
        if grade.SubjectOffering.teacher_id != request.user.pk:
            return Response({"error": "Not authorized for this subject offering"}, status=403)
    elif hasattr(request.user, 'student_profile') and grade.student == request.user.student_profile:
        pass  # Students can access their own grades
    else:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = QuarterlyGradeSerializer(grade)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        if request.user.role != 'TEACHER':
            return Response({'error': 'Only teachers can update grades'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = QuarterlyGradeCreateUpdateSerializer(grade, data=request.data, partial=True,context={"request": request})
        if serializer.is_valid():
            grade = serializer.save()
            output_serializer = QuarterlyGradeSerializer(grade)
            return Response(output_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if request.user.role != 'TEACHER':
            return Response({'error': 'Only teachers can delete grades'}, status=status.HTTP_403_FORBIDDEN)
        
        grade.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quarterly_grades_bulk_apply_weights(request):
    # Only teachers can apply weights
    if request.user.role != "TEACHER":
        return Response({"error": "Only teachers can apply weights"}, status=403)

    SubjectOffering_id = request.data.get("SubjectOffering")
    semester = SemesterReferenceField().run_validation(request.data.get("semester"))
    ww = request.data.get("ww_weight")
    pt = request.data.get("pt_weight")
    qa = request.data.get("sa_weight", request.data.get("qa_weight"))

    if not SubjectOffering_id or not semester:
        return Response({"detail": "SubjectOffering and semester are required."}, status=400)

    try:
        ww = float(ww)
        pt = float(pt)
        qa = float(qa)
    except (TypeError, ValueError):
        return Response({"detail": "Weights must be numbers."}, status=400)

    import math
    if any(not math.isfinite(w) or not 0 <= w <= 1 for w in (ww, pt, qa)):
        return Response({"detail": "Weights must be between 0 and 1."}, status=400)
    total = ww + pt + qa
    if abs(total - 1.0) > 0.01:
        return Response({"detail": f"Weights must sum to 1.0. Got {total}"}, status=400)

    # ✅ Recommended: make sure teacher owns this offering
    from .models import SubjectOffering, QuarterlyGrade

    if not SubjectOffering.objects.filter(id=SubjectOffering_id, teacher=request.user).exists():
        return Response({"detail": "Not authorized for this subject offering"}, status=403)

    grades = QuarterlyGrade.objects.filter(
        SubjectOffering_id=SubjectOffering_id,
        semester=semester
    )

    updated = 0
    with transaction.atomic():
        for g in grades:
            g.ww_weight = ww
            g.pt_weight = pt
            g.qa_weight = qa
            g.save()  # ✅ triggers model.save() => recalculates final_grade
            updated += 1

    return Response({"updated": updated}, status=200)

# ==================== QUIZ ITEM ANALYSIS VIEWS ====================
# ==================== QUIZ ITEM ANALYSIS VIEWS ====================



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_item_analysis(request, quiz_id):
    if request.user.role != 'TEACHER':
        return Response({'error': 'Only teachers can access item analysis'}, status=status.HTTP_403_FORBIDDEN)

    quiz = get_object_or_404(Quiz, id=quiz_id, teacher=request.user)
    # 🔥 AI toggle (default OFF)
    with_ai = request.query_params.get("with_ai", "false").lower() == "true"
    ai_service = AIService() if with_ai else None

    questions = quiz.questions.all().order_by('order')
    analysis = []
    included_statuses = ['SUBMITTED', 'GRADED']

    for question in questions:
        answers = QuizAnswer.objects.filter(
            question=question,
            attempt__status__in=included_statuses,
        ).select_related('selected_choice')

        total_attempts = answers.count()

        base = {
            'question_id': question.id,
            'question_text': question.question_text,
            'question_type': question.question_type,
            'points': float(question.points or 0),
            'order': question.order,
            'total_attempts': total_attempts,
        }

        if total_attempts == 0:
            analysis.append({
                **base,
                'analysis_mode': 'N/A',
                'correct_count': 0,
                'incorrect_count': 0,
                'ungraded_count': 0,
                'correct_percentage': 0,
                'difficulty': 'N/A',
                'choice_distribution': {},
                'graded_count': 0,
                'pending_count': 0,
                'avg_score': 0,
                'score_distribution': [],
            })
            continue

        # ---------------------------
        # Objective questions (MC/TF)
        # ---------------------------
        if question.question_type in ['MULTIPLE_CHOICE', 'TRUE_FALSE']:
            correct_count = answers.filter(is_correct=True).count()
            ungraded_count = answers.filter(is_correct__isnull=True).count()
            incorrect_count = total_attempts - correct_count - ungraded_count

            graded_total = correct_count + incorrect_count
            correct_percentage = (correct_count / graded_total * 100) if graded_total > 0 else 0

            if graded_total == 0:
                difficulty = 'N/A'
            elif correct_percentage >= 75:
                difficulty = 'Easy'
            elif correct_percentage >= 50:
                difficulty = 'Medium'
            elif correct_percentage >= 25:
                difficulty = 'Hard'
            else:
                difficulty = 'Very Hard'

            choice_distribution = {}
            for choice in question.choices.all():
                choice_count = answers.filter(selected_choice=choice).count()
                choice_distribution[choice.choice_text] = {
                    'count': choice_count,
                    'percentage': (choice_count / total_attempts * 100) if total_attempts > 0 else 0,
                    'is_correct': choice.is_correct
                }

            question_data = {
                **base,
                'analysis_mode': 'CHOICES',
                'correct_count': correct_count,
                'incorrect_count': incorrect_count,
                'ungraded_count': ungraded_count,
                'graded_count': graded_total,
                'pending_count': ungraded_count,
                'correct_percentage': round(correct_percentage, 2),
                'difficulty': difficulty,
                'choice_distribution': choice_distribution,
                'avg_score': None,
                'score_distribution': [],
            }

            # 🔥 AI Integration
            if with_ai and total_attempts > 0:
                distribution_lines = []
                for choice_text, data in choice_distribution.items():
                    label = "Correct" if data['is_correct'] else "Incorrect"
                    distribution_lines.append(
                        f"{choice_text}: {data['count']} students "
                        f"({data['percentage']:.1f}%) – {label}"
                    )

                distribution_text = "\n".join(distribution_lines)

                ai_result = ai_service.analyze_question_item({
                    "question_text": question.question_text,
                    "question_type": question.question_type,
                    "success_rate": correct_percentage,
                    "difficulty": difficulty,
                    "total_attempts": total_attempts,
                    "distribution_data": distribution_text,
                })

                question_data["ai_insight"] = ai_result

            analysis.append(question_data)
            continue

        # ---------------------------
        # Subjective/manual questions
        # ---------------------------
        graded_qs = answers.filter(manually_graded=True)
        graded_count = graded_qs.count()
        pending_count = total_attempts - graded_count

        avg_score = graded_qs.aggregate(a=Avg('points_earned'))['a']
        avg_score = float(avg_score or 0)

        # Build histogram for points_earned (graded answers only)
        # NOTE: if you allow 0.5 steps, points_earned values will naturally group.
        grouped = (
            graded_qs
            .values('points_earned')
            .annotate(count=Count('id'))
            .order_by('points_earned')
        )

        score_distribution = []
        for row in grouped:
            score = float(row['points_earned'] or 0)
            count = int(row['count'])
            pct = (count / graded_count * 100) if graded_count > 0 else 0
            score_distribution.append({
                'score': score,
                'count': count,
                'percentage': round(pct, 2),
            })

        # Optional difficulty for manual items:
        # Use average score vs max points (simple but meaningful)
        max_points = float(question.points or 0)
        if graded_count == 0 or max_points <= 0:
            difficulty = 'N/A'
        else:
            avg_pct = (avg_score / max_points) * 100
            if avg_pct >= 75:
                difficulty = 'Easy'
            elif avg_pct >= 50:
                difficulty = 'Medium'
            elif avg_pct >= 25:
                difficulty = 'Hard'
            else:
                difficulty = 'Very Hard'

        question_data = {
            **base,
            'analysis_mode': 'SCORES',
            'graded_count': graded_count,
            'pending_count': pending_count,
            'ungraded_count': pending_count,
            'avg_score': round(avg_score, 2),
            'max_points': max_points,
            'score_distribution': score_distribution,

            # compatibility fields
            'correct_count': 0,
            'incorrect_count': 0,
            'correct_percentage': 0,
            'difficulty': difficulty,
            'choice_distribution': {},
        }

        # 🔥 AI Integration
        if with_ai and graded_count > 0 and max_points > 0:
            distribution_lines = []
            for row in score_distribution:
                distribution_lines.append(
                    f"Score {row['score']}: {row['count']} students "
                    f"({row['percentage']}%)"
                )

            distribution_text = "\n".join(distribution_lines)

            avg_pct = (avg_score / max_points) * 100

            ai_result = ai_service.analyze_question_item({
                "question_text": question.question_text,
                "question_type": question.question_type,
                "success_rate": avg_pct,
                "difficulty": difficulty,
                "total_attempts": total_attempts,
                "distribution_data": distribution_text,
            })

            question_data["ai_insight"] = ai_result

        analysis.append(question_data)

    total_questions = len(questions)
    total_student_attempts = quiz.attempts.filter(status__in=included_statuses).count()

    return Response({
        'quiz_id': quiz.id,
        'quiz_title': quiz.title,
        'total_questions': total_questions,
        'total_student_attempts': total_student_attempts,
        'questions': analysis
    })



# ==================== SUBMISSION DOWNLOAD VIEW ====================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_submissions_summary(request):
    """
    GET /api/teacher/submissions/summary/

    Returns:
    {
      "totals": {
        "overall_attempts": 120,
        "overall_unique_students": 80,
        "overall_quizzes": 12,
        "overall_subject_offerings": 4
      },
      "by_subject": [
        {
          "subject_offering_id": 1,
          "subject": "Math 7-A",
          "submitted_attempts": 40,
          "unique_students": 35,
          "total_students": 40,
          "submission_rate": 87.5
        },
        ...
      ]
    }
    """
    if request.user.role != "TEACHER":
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    # All offerings that belong to this teacher
    offerings = (
        SubjectOffering.objects
        .filter(teacher=request.user)
        .select_related("section")
        .order_by("name")
    )

    # All submitted attempts for this teacher (across all quizzes)
    submitted_statuses = ["SUBMITTED", "GRADED"]  # your app currently uses GRADED after submit
    teacher_attempts_qs = QuizAttempt.objects.filter(
        quiz__teacher=request.user,
        status__in=submitted_statuses,
    )

    overall_attempts = teacher_attempts_qs.count()
    overall_unique_students = teacher_attempts_qs.values("student_id").distinct().count()
    overall_quizzes = Quiz.objects.filter(teacher=request.user).count()

    results = []
    for o in offerings:
        attempts = QuizAttempt.objects.filter(
            quiz__SubjectOffering=o,
            quiz__teacher=request.user,
            status__in=submitted_statuses,
        )

        submitted_attempts = attempts.count()
        unique_students = attempts.values("student_id").distinct().count()
        total_students = o.section.students.count() if o.section else 0
        submission_rate = round((unique_students / total_students) * 100, 2) if total_students else 0

        results.append({
            "subject_offering_id": o.id,
            "subject": o.name,
            "submitted_attempts": submitted_attempts,
            "unique_students": unique_students,
            "total_students": total_students,
            "submission_rate": submission_rate,
        })

    return Response({
        "totals": {
            "overall_attempts": overall_attempts,
            "overall_unique_students": overall_unique_students,
            "overall_quizzes": overall_quizzes,
            "overall_subject_offerings": offerings.count(),
        },
        "by_subject": results,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_submissions_subject_detail(request, subject_offering_id: int):
    """
    GET /api/teacher/submissions/subject/<subject_offering_id>/

    Returns:
    {
      "subject_offering_id": 1,
      "subject": "Math 7-A",
      "total_students": 40,
      "totals": { "attempts": 40, "unique_students": 35, "submission_rate": 87.5 },
      "quizzes": [
        { "quiz_id": 10, "title": "Quiz 1", "attempts": 35, "unique_students": 35, "status": "CLOSED" },
        ...
      ]
    }
    """
    if request.user.role != "TEACHER":
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    offering = get_object_or_404(SubjectOffering, id=subject_offering_id, teacher=request.user)
    submitted_statuses = ["SUBMITTED", "GRADED"]

    quizzes = Quiz.objects.filter(
        teacher=request.user,
        SubjectOffering=offering
    ).order_by("-created_at")

    quiz_rows = []
    total_attempts = 0
    all_students = set()

    for q in quizzes:
        attempts_qs = QuizAttempt.objects.filter(
            quiz=q,
            status__in=submitted_statuses
        )
        attempts = attempts_qs.count()
        unique_students = attempts_qs.values("student_id").distinct().count()

        total_attempts += attempts
        all_students.update(list(attempts_qs.values_list("student_id", flat=True)))

        quiz_rows.append({
            "quiz_id": q.id,
            "title": q.title,
            "attempts": attempts,
            "unique_students": unique_students,
            "status": q.status,
            "open_time": q.open_time,
            "close_time": q.close_time,
        })

    total_students = offering.section.students.count() if offering.section else 0
    unique_students_total = len(all_students)
    submission_rate = round((unique_students_total / total_students) * 100, 2) if total_students else 0

    return Response({
        "subject_offering_id": offering.id,
        "subject": offering.name,
        "total_students": total_students,
        "totals": {
            "attempts": total_attempts,
            "unique_students": unique_students_total,
            "submission_rate": submission_rate,
        },
        "quizzes": quiz_rows,
    })

# csv export
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def teacher_submissions_export_csv(request):
    """
    GET /api/teacher/submissions/export.csv?scope=overall
    GET /api/teacher/submissions/export.csv?scope=subject&subject_offering_id=1
    """
    if request.user.role != "TEACHER":
        return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

    scope = request.query_params.get("scope", "overall")
    subject_offering_id = request.query_params.get("subject_offering_id")

    submitted_statuses = ["SUBMITTED", "GRADED"]

    response = HttpResponse(content_type="text/csv")
    writer = csv.writer(response)

    if scope == "subject" and subject_offering_id:
        offering = get_object_or_404(SubjectOffering, id=int(subject_offering_id), teacher=request.user)
        response["Content-Disposition"] = f'attachment; filename="submissions_{offering.id}.csv"'

        writer.writerow(["Quiz ID", "Quiz Title", "Attempts", "Unique Students", "Status", "Open Time", "Close Time"])

        quizzes = Quiz.objects.filter(teacher=request.user, SubjectOffering=offering).order_by("-created_at")
        for q in quizzes:
            attempts_qs = QuizAttempt.objects.filter(quiz=q, status__in=submitted_statuses)
            writer.writerow([
                q.id,
                q.title,
                attempts_qs.count(),
                attempts_qs.values("student_id").distinct().count(),
                q.status,
                q.open_time,
                q.close_time,
            ])

        return response

    # default: overall export (per subject offering)
    response["Content-Disposition"] = 'attachment; filename="submissions_overall.csv"'
    writer.writerow(["Subject Offering ID", "Subject", "Submitted Attempts", "Unique Students", "Total Students", "Submission Rate %"])

    offerings = SubjectOffering.objects.filter(teacher=request.user).select_related("section").order_by("name")
    for o in offerings:
        attempts_qs = QuizAttempt.objects.filter(
            quiz__teacher=request.user,
            quiz__SubjectOffering=o,
            status__in=submitted_statuses
        )
        submitted_attempts = attempts_qs.count()
        unique_students = attempts_qs.values("student_id").distinct().count()
        total_students = o.section.students.count() if o.section else 0
        rate = round((unique_students / total_students) * 100, 2) if total_students else 0

        writer.writerow([o.id, o.name, submitted_attempts, unique_students, total_students, rate])

    return response

# student information for student dashboard
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_student(request):
    student = Student.objects.get(user=request.user)
    serializer = StudentSerializer(student)
    return Response(serializer.data)

