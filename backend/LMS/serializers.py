from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Avg
from LMS.models import Semester, Student, Subject, SubjectOffering, Teacher, Admin, Section, Quiz, QuizQuestion, QuizChoice, QuizAttempt, QuizAnswer, QuizTopicPerformance, GradeForecast, QuarterlyGrade, GradeChangeLog

User = get_user_model()


# =========================
# USER SERIALIZER
# =========================

class StudentSerializer(serializers.ModelSerializer):
    school_id = serializers.CharField(source="user.school_id", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    section = serializers.PrimaryKeyRelatedField(
        queryset=Section.objects.all(),
        allow_null=True,
        required=False
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "school_id",
            "first_name",
            "last_name",
            "email",
            "grade_level",
            "section",
        ]

class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = ["id"]


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    student_profile = StudentSerializer(required=False)
    teacher_profile = TeacherProfileSerializer(required=False)
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
            "school_id",
            "status",
            "student_profile",
            "teacher_profile",
            "subjects",
        ]

    def get_subjects(self, obj):
        if obj.role != "TEACHER":
            return []
        return obj.subjects.values("id", "name")
    
    def validate(self, data):
        role = data.get("role") or getattr(self.instance, "role", None)
        school_id = data.get("school_id") or getattr(self.instance, "school_id", None)

        student_profile = data.get("student_profile", {})
        grade_level = student_profile.get("grade_level")

        if role not in ["STUDENT", "TEACHER", "ADMIN"]:
            raise serializers.ValidationError({"role": "Invalid role selected."})

        if role == "STUDENT" and not school_id:
            raise serializers.ValidationError(
            {"school_id": "School ID is required for students."}
        )

        if role == "STUDENT" and not grade_level and not hasattr(self.instance, "student_profile"):
            raise serializers.ValidationError(
            {"student_profile": {"grade_level": "Grade level is required for students."}}
        )

        return data


    def create(self, validated_data):
        password = validated_data.pop("password", None)
        student_data = validated_data.pop("student_profile", None)
        teacher_data = validated_data.pop("teacher_profile", None)

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        if user.role == "STUDENT" and student_data:
            Student.objects.create(
                user=user,
                grade_level=student_data.get("grade_level"),
                section=student_data.get("section"),
            )

        elif user.role == "TEACHER":
            Teacher.objects.create(user=user)

        elif user.role == "ADMIN":
            Admin.objects.create(user=user)

        return user


    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        student_data = validated_data.pop("student_profile", None)
        teacher_data = validated_data.pop("teacher_profile", None)

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # ✅ HASH PASSWORD
        if password:
            instance.set_password(password)
            instance.save()

        # ✅ UPDATE STUDENT PROFILE
        if student_data and instance.role == "STUDENT":
            Student.objects.update_or_create(
                user=instance,
                defaults={
                "grade_level": student_data.get("grade_level"),
                "section": student_data.get("section"),
            }
            )
        
        # ✅ UPDATE TEACHER PROFILE
        if teacher_data and instance.role == "TEACHER":
            Teacher.objects.update_or_create(
                user=instance,
                defaults={
            }
            )

        return instance

class SectionSerializer(serializers.ModelSerializer):
    adviser_name = serializers.SerializerMethodField()
    # Accept student IDs when creating a section
    school_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    student_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = Section
        fields = ["id", "name", "grade_level", "adviser", "adviser_name", "is_active", "school_ids", "student_count"]

    def create(self, validated_data):
        school_ids = validated_data.pop("school_ids", [])
        section = Section.objects.create(**validated_data)

        # Assign selected students
        if school_ids:
            Student.objects.filter(id__in=school_ids).update(section=section)

        return section
    
    def get_adviser_name(self, obj):
        if obj.adviser:
            return f"{obj.adviser.first_name} {obj.adviser.last_name}"
        return "N/A"
    
class TeacherSerializer(serializers.ModelSerializer):
    advisory = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "email", "advisory")

    def get_advisory(self, obj):
        section = obj.advised_sections.first()
        if not section:
            return None
        # return structured data so frontend can use section.id
        return {
            "id": section.id,
            "section": section.name,
            "grade_level": section.grade_level,
            "adviser_name": f"{obj.first_name} {obj.last_name}",
        }
    
class SubjectOfferingSerializer(serializers.ModelSerializer):
    section_id = serializers.IntegerField(write_only=True)
    name = serializers.CharField()
    grade = serializers.CharField(source='section.grade_level', read_only=True)
    students = serializers.SerializerMethodField()
    nextClass = serializers.CharField(source='schedule', read_only=True)
    average = serializers.SerializerMethodField()
    pendingTasks = serializers.SerializerMethodField()
    section = serializers.CharField(source='section.name', read_only=True)
    teacher_id = serializers.IntegerField(source="teacher.id", read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = SubjectOffering
        fields = ["id", "name", "section", "room_number", "schedule", "section_id", "grade", "students", "nextClass", "average", "pendingTasks", "teacher_id", "teacher_name"]
        read_only_fields = ["id", "section"]

    def create(self, validated_data):
        request = self.context.get("request")
        teacher = getattr(request, "user", None)
        section_id = validated_data.pop("section_id")
        section = Section.objects.get(id=section_id)
        
        offering, created = SubjectOffering.objects.get_or_create(
            section=section,
            name=validated_data["name"],
            defaults={
            "room_number": validated_data.get("room_number", "TBA"),
            "schedule": validated_data.get("schedule", "TBA"),
            "teacher": teacher,  # ✅ set teacher on create
        },
    )
        return offering
    def get_students(self, obj):
        return obj.section.students.count()
    def get_average(self, obj):
        qs = QuarterlyGrade.objects.filter(
        SubjectOffering=obj,
        final_grade__isnull=False,
        semester__school_year__is_active=True,
    )
        avg = qs.aggregate(a=Avg("final_grade"))["a"]
        return round(avg, 2) if avg is not None else None
    def get_pendingTasks(self, obj):
        # pending quizzes = all quizzes not CLOSED
        return obj.quizzes.exclude(status="CLOSED").count()
    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip()
        return ""

    def get_quiz_count(self, obj):
        # all quizzes under this subject offering
        return obj.quizzes.count()

class SubjectSerializer(serializers.ModelSerializer):
    faculty_count = serializers.IntegerField(source="teachers.count", read_only=True)
    teachers = TeacherSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "faculty_count", "teachers"]

from rest_framework import serializers
from .models import SubjectOffering, SubjectOfferingFile


class SubjectListSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="subject.name")
    section = serializers.CharField(source="section.name")
    grade = serializers.SerializerMethodField()
    room = serializers.CharField(source="room_number")
    nextClass = serializers.CharField(source="schedule")
    students = serializers.SerializerMethodField()
    average = serializers.SerializerMethodField()
    pendingTasks = serializers.SerializerMethodField()

    class Meta:
        model = SubjectOffering
        fields = [
            "id",
            "subject",
            "section",
            "grade",
            "room",
            "students",
            "nextClass",
            "average",
            "pendingTasks",
        ]

    def get_grade(self, obj):
        return obj.section.get_grade_level_display().replace("Grade ", "")

    def get_students(self, obj):
        # TODO: Replace with real enrollment count
        return 35

    def get_average(self, obj):
        # TODO: Replace with real grade computation
        return 88

    def get_pendingTasks(self, obj):
        # TODO: Replace with real grading logic
        return 3

class StudentSubjectOfferingSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="name", read_only=True)
    teacher_name = serializers.SerializerMethodField()
    section_name = serializers.CharField(source="section.name", read_only=True)
    grade_level = serializers.CharField(source="section.grade_level", read_only=True)
    room_number = serializers.CharField(read_only=True)
    schedule = serializers.CharField(read_only=True)

    # computed fields
    progress = serializers.IntegerField(read_only=True)  # 0..100
    average = serializers.FloatField(read_only=True)     # 0..100
    semesters = serializers.SerializerMethodField()
    quarters = serializers.SerializerMethodField()       # {1: 88, 2: 90, ...}
    final_grade = serializers.SerializerMethodField()

    class Meta:
        model = SubjectOffering
        fields = (
            "id",
            "subject_name",
            "teacher_name",
            "section_name",
            "grade_level",
            "room_number",
            "schedule",
            "progress",
            "average",
            "quarters",
            "semesters",
            "final_grade",
        )

    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip()
        return "N/A"

    def get_semesters(self, obj):
        grades = getattr(obj, "_student_quarterly_grades", [])
        return {
            g.semester.name.replace("SEM", "SEMESTER_"): float(g.final_grade)
            for g in grades if g.semester_id is not None
        }

    def get_quarters(self, obj):
        # expects annotation or prefetched grades in the view
        qmap = {}
        grades = getattr(obj, "_student_quarterly_grades", [])
        for g in grades:
            if g.semester_id is None and g.quarter:
                qmap[g.quarter] = float(g.final_grade)
        return qmap
    def get_final_grade(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        student = getattr(user, "student_profile", None)
        if not student:
            return None

        qs = QuarterlyGrade.objects.filter(student=student, SubjectOffering=obj, semester__school_year__is_active=True)
        vals = list(qs.values_list("final_grade", flat=True))
        vals = [float(v) for v in vals if v is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

class GradeChangeLogSerializer(serializers.ModelSerializer):
    teacher = serializers.SerializerMethodField()
    student = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    changeType = serializers.SerializerMethodField()
    previousGrade = serializers.CharField(source="previous_grade", read_only=True)
    newGrade = serializers.CharField(source="new_grade", read_only=True)
    change = serializers.SerializerMethodField()  # ✅ shows difference


    class Meta:
        model = GradeChangeLog
        fields = [
            "timestamp",
            "teacher",
            "student",
            "subject",
            "activity",
            "previousGrade",
            "newGrade",
            "changeType",
            "change",
        ]

    def _full_name_user(self, user):
        if not user:
            return "—"
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        return name if name else getattr(user, "email", "—")

    def get_teacher(self, obj):
        # teacher is a User
        return self._full_name_user(obj.teacher)

    def get_student(self, obj):
        # student is a Student -> use student.user
        if not obj.student:
            return "—"
        return self._full_name_user(obj.student.user)

    def get_subject(self, obj):
        if not obj.SubjectOffering:
            return "—"
        # Adjust if your SubjectOffering uses "name" or "subject_name"
        return getattr(obj.SubjectOffering, "name", None) or getattr(obj.SubjectOffering, "subject_name", "—")

    def get_changeType(self, obj):
        # Convert "UPDATE"/"CREATE" into "Update"/"Create"
        return "Update" if obj.change_type == "UPDATE" else "Create"

    def get_change(self, obj):
        """
        Human-friendly description of what changed.
        Examples:
          "WW 18/20 → WW 19/20"
          "N/A → WW 10/10"
        """
        prev = (obj.previous_grade or "").strip() or "N/A"
        new = (obj.new_grade or "").strip() or "—"

        if prev == "N/A":
            return f"Created: {new}"

        if prev == new:
            return "No change"

        return f"{prev} → {new}"
    
class SubjectOfferingFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SubjectOfferingFile
        fields = ["id", "title", "file_url", "file_size", "content_type", "created_at"]
        read_only_fields = ["id", "file_url", "file_size", "content_type", "created_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        url = obj.file_url
        # If you want absolute URLs:
        if request and url and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url




# Quiz Serializers
class QuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']
        extra_kwargs = {
            'is_correct': {'write_only': True}  # Don't expose to students
        }

class TeacherQuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']

class StudentQuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'order']  # no is_correct

class StudentQuizQuestionSerializer(serializers.ModelSerializer):
    choices = StudentQuizChoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'question_type', 'points', 'order', 'choices']

class QuizQuestionSerializer(serializers.ModelSerializer):
    choices = TeacherQuizChoiceSerializer(many=True, required=False)
    
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question_text', 'question_type', 'points', 'order', 'choices']
    
    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = QuizQuestion.objects.create(**validated_data)
        
        for choice_data in choices_data:
            QuizChoice.objects.create(question=question, **choice_data)
        
        return question
    
    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', [])
        
        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update choices
        existing_choice_ids = [choice.id for choice in instance.choices.all()]
        new_choice_ids = [choice_data.get('id') for choice_data in choices_data if 'id' in choice_data]
        
        # Delete removed choices
        for choice_id in existing_choice_ids:
            if choice_id not in new_choice_ids:
                QuizChoice.objects.filter(id=choice_id).delete()
        
        # Update or create choices
        for choice_data in choices_data:
            choice_id = choice_data.get('id', None)
            if choice_id:
                # Update existing choice
                choice = QuizChoice.objects.get(id=choice_id, question=instance)
                for attr, value in choice_data.items():
                    setattr(choice, attr, value)
                choice.save()
            else:
                # Create new choice
                QuizChoice.objects.create(question=instance, **choice_data)
        
        return instance


class SemesterReferenceField(serializers.RelatedField):
    """Accept a semester PK, SEM1, or the React tab value SEMESTER_1.

    Codes resolve only in the active school year; PKs also support historical years.
    """
    def __init__(self, **kwargs):
        if not kwargs.get("read_only", False):
            kwargs.setdefault("queryset", Semester.objects.select_related("school_year").all())
        super().__init__(**kwargs)

    def to_internal_value(self, value):
        code = str(value).replace("SEMESTER_", "SEM")
        qs = self.get_queryset()
        if code in dict(Semester.SEMESTER_CHOICES):
            qs = qs.filter(name=code, school_year__is_active=True)
        elif str(value).isdigit():
            qs = qs.filter(pk=int(value))
        else:
            raise serializers.ValidationError("Use a semester ID, SEM1/SEM2/SEM3, or SEMESTER_1/2/3.")
        try:
            return qs.get()
        except (Semester.DoesNotExist, Semester.MultipleObjectsReturned):
            raise serializers.ValidationError("Semester not found or ambiguous. Configure one active school year or send the semester ID.")

    def to_representation(self, value):
        return value.name.replace("SEM", "SEMESTER_")


class QuizSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="current_status", read_only=True)
    semester = SemesterReferenceField(read_only=True)
    semester_id = serializers.IntegerField(read_only=True)
    questions = QuizQuestionSerializer(many=True, read_only=True)
    teacher_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='SubjectOffering.name', read_only=True)
    is_open = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_closed = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    is_editable = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'activity_mode',
            'id', 'quiz_id', 'SubjectOffering', 'subject_name', 'teacher', 'teacher_name',
            'title', 'description', 'posted_at', 'open_time', 'close_time',
            'time_limit', 'semester', 'semester_id', 'total_points', 'passing_score', 'status',
            'show_correct_answers', 'shuffle_questions', 'allow_multiple_attempts',
            'questions', 'question_count', 'is_open', 'is_upcoming', 'is_closed',
            'created_at', 'updated_at', 'grade_type', 'is_editable'
        ]
        read_only_fields = ['quiz_id', 'posted_at', 'teacher', 'created_at', 'updated_at']
    
    def get_question_count(self, obj):
        return obj.questions.count()
    
    def get_teacher_name(self, obj):
        """Get teacher's full name"""
        name = f"{obj.teacher.first_name} {obj.teacher.last_name}".strip()
        return name if name else obj.teacher.email
    
    def get_is_open(self, obj):
        return obj.is_open()
    
    def get_is_upcoming(self, obj):
        return obj.is_upcoming()
    
    def get_is_closed(self, obj):
        return obj.is_closed()
    
    def get_is_editable(self, obj):
        return obj.is_editable()


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    semester = SemesterReferenceField(required=True)
    questions = QuizQuestionSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Quiz
        fields = [
            'activity_mode',
            'id', 'SubjectOffering', 'title', 'description', 'open_time', 'close_time',
            'time_limit', 'semester', 'total_points', 'passing_score', 'status',
            'show_correct_answers', 'shuffle_questions', 'allow_multiple_attempts',
            'grade_type', 'questions'
        ]
        read_only_fields = ['id', 'total_points']
        
    def validate(self, attrs):
        from django.utils import timezone
        attrs = super().validate(attrs)
        status = attrs.get("status", getattr(self.instance, "status", "DRAFT"))
        # New drafts have no schedule; explicitly opening starts immediately.
        if self.instance is None and status in ("DRAFT", "OPEN"):
            attrs["open_time"] = timezone.now() if status == "OPEN" else None
            attrs["close_time"] = None
            return attrs
        opens = attrs.get("open_time", getattr(self.instance, "open_time", None))
        closes = attrs.get("close_time", getattr(self.instance, "close_time", None))
        if status == "SCHEDULED" and (opens is None or closes is None):
            raise serializers.ValidationError({"status": "Scheduled quizzes require open and close times."})
        if opens is not None and closes is not None and closes <= opens:
            raise serializers.ValidationError({"close_time": "Close time must be after open time."})
        return attrs

    def validate_questions(self, questions):
        import math
        if self.instance is not None:
            raise serializers.ValidationError("Edit existing questions through the question endpoints.")
        if not questions:
            raise serializers.ValidationError("Add at least one question.")
        for index, question in enumerate(questions, 1):
            prefix = f"Question {index}: "
            if not question.get("question_text", "").strip():
                raise serializers.ValidationError(prefix + "Question text is required.")
            points = question.get("points", 1)
            if not math.isfinite(points) or points <= 0:
                raise serializers.ValidationError(prefix + "Points must be a positive finite number.")
            kind = question.get("question_type", "MULTIPLE_CHOICE")
            choices = question.get("choices", [])
            if kind == "SHORT_ANSWER":
                if choices:
                    raise serializers.ValidationError(prefix + "Short answers do not use choices.")
                continue
            if len(choices) < 2 or any(not c.get("choice_text", "").strip() for c in choices):
                raise serializers.ValidationError(prefix + "Provide at least two non-empty choices.")
            if sum(bool(c.get("is_correct")) for c in choices) != 1:
                raise serializers.ValidationError(prefix + "Select exactly one correct answer.")
            if kind == "TRUE_FALSE" and (len(choices) != 2 or
                    {c["choice_text"].strip().lower() for c in choices} != {"true", "false"}):
                raise serializers.ValidationError(prefix + "Use exactly True and False choices.")
        return questions

    def create(self, validated_data):
        from django.db import transaction
        questions = validated_data.pop("questions", [])
        with transaction.atomic():
            quiz = super().create(validated_data)
            for order, question_data in enumerate(questions):
                question_data.pop("id", None)
                question_data["order"] = order
                for choice_order, choice in enumerate(question_data.get("choices", [])):
                    choice.pop("id", None)
                    choice["order"] = choice_order
                QuizQuestionSerializer(context=self.context).create({**question_data, "quiz": quiz})
            quiz.total_points = sum(question.get("points", 1) for question in questions)
            quiz.save(update_fields=["total_points"])
        return quiz

class StudentQuizSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="current_status", read_only=True)
    """Quiz serializer for students - hides sensitive info"""
    subject_name = serializers.CharField(source='SubjectOffering.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    is_open = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_closed = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    user_attempts = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'activity_mode',
            'id', 'quiz_id', 'status', 'SubjectOffering', 'subject_name', 'teacher_name', 'title',
            'description', 'open_time', 'close_time', 'time_limit',
            'total_points', 'allow_multiple_attempts', 'question_count',
            'is_open', 'is_upcoming', 'is_closed', 'user_attempts'
        ]
    
    def get_question_count(self, obj):
        return obj.questions.count()
    
    def get_teacher_name(self, obj):
        """Get teacher's full name"""
        if obj.teacher is None:
            return "Unassigned"
        name = f"{obj.teacher.first_name} {obj.teacher.last_name}".strip()
        return name if name else obj.teacher.email
    
    def get_user_attempts(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'student_profile'):
            return obj.attempts.filter(student=request.user.student_profile).count()
        return 0
    
    def get_is_open(self, obj):
        return obj.is_open()
    
    def get_is_upcoming(self, obj):
        return obj.is_upcoming()
    
    def get_is_closed(self, obj):
        return obj.is_closed()


class QuizAnswerSerializer(serializers.ModelSerializer):
    answer_file_url = serializers.SerializerMethodField()
    graded_by_name = serializers.SerializerMethodField()
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    question_points = serializers.FloatField(source='question.points', read_only=True)
    correct_choice = serializers.SerializerMethodField()
    choices = TeacherQuizChoiceSerializer(
        source='question.choices',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = QuizAnswer
        fields = [
            'id', 'question', 'question_text', 'question_points',
            'selected_choice', 'text_answer', 'answer_file', 'answer_file_url',
            'is_correct', 'points_earned', 'manually_graded', 
            'teacher_feedback', 'graded_at', 'graded_by', 'graded_by_name', 'correct_choice', 'choices'
        ]
    
    def get_correct_choice(self, obj):
        correct = obj.question.choices.filter(is_correct=True).first()
        if correct:
            return correct.id
        return None
    
    def get_answer_file_url(self, obj):
        url = obj.answer_file_url
        if not url:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request is not None else url
    
    def get_graded_by_name(self, obj):
        if obj.graded_by:
            return f"{obj.graded_by.first_name} {obj.graded_by.last_name}"
        return None


class QuizAttemptSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True, default=None)
    is_group_credit = serializers.SerializerMethodField()
    answers = QuizAnswerSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name',
            'started_at', 'submitted_at', 'score', 'status', 'answers', 'group_id', 'group_name', 'is_group_credit'
        ]
        read_only_fields = ['student', 'started_at', 'score']
    
    def get_is_group_credit(self, obj):
        return obj.group_id is not None

    def get_student_name(self, obj):
        """Get student's full name"""
        user = obj.student.user
        name = f"{user.first_name} {user.last_name}".strip()
        return name if name else user.email


class QuizSubmissionSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )


# Grade Forecasting Serializers
class QuizTopicPerformanceSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic', read_only=True)
    
    class Meta:
        model = QuizTopicPerformance
        fields = [
            'id', 'topic', 'topic_name', 'total_questions', 
            'correct_answers', 'accuracy_percentage', 'last_updated'
        ]


class GradeForecastSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='SubjectOffering.name', read_only=True)
    student_name = serializers.SerializerMethodField()
    student_id = serializers.CharField(source='student.user.school_id', read_only=True)
    
    class Meta:
        model = GradeForecast
        fields = [
            'id', 'student', 'student_id', 'student_name', 
            'SubjectOffering', 'subject_name',
            'current_average', 'quiz_count',
            'predicted_grade', 'confidence_score',
            'risk_level', 'performance_trend',
            'strong_topics', 'weak_topics', 'recommendations',
            'generated_at', 'updated_at'
        ]
        read_only_fields = ['generated_at', 'updated_at']
    
    def get_student_name(self, obj):
        """Get student's full name"""
        user = obj.student.user
        name = f"{user.first_name} {user.last_name}".strip()
        return name if name else user.email

# ==================== QUARTERLY GRADES SERIALIZERS ====================

class QuarterlyGradeSerializer(serializers.ModelSerializer):
    semester = SemesterReferenceField(read_only=True)
    semester_id = serializers.IntegerField(read_only=True)
    school_year = serializers.IntegerField(source="semester.school_year_id", read_only=True)
    semester_assessment_score = serializers.FloatField(source="quarterly_assessment_score", read_only=True)
    semester_assessment_total = serializers.FloatField(source="quarterly_assessment_total", read_only=True)
    sa_weight = serializers.FloatField(source="qa_weight", read_only=True)
    student_name = serializers.SerializerMethodField()
    student_id = serializers.CharField(source='student.user.school_id', read_only=True)
    subject_name = serializers.CharField(source='SubjectOffering.name', read_only=True)
    
    class Meta:
        model = QuarterlyGrade
        fields = [
            'id', 'student', 'student_id', 'student_name',
            'SubjectOffering', 'subject_name', 'quarter',
            'semester', 'semester_id', 'school_year',
            'semester_assessment_score', 'semester_assessment_total', 'sa_weight',
            'written_work_score', 'written_work_total',
            'performance_task_score', 'performance_task_total',
            'quarterly_assessment_score', 'quarterly_assessment_total',
            'ww_weight', 'pt_weight', 'qa_weight',
            'final_grade', 'remarks',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['final_grade', 'created_at', 'updated_at']
    
    def get_student_name(self, obj):
        """Get student's full name"""
        user = obj.student.user
        name = f"{user.first_name} {user.last_name}".strip()
        return name if name else user.email

def grade_snapshot(g) -> str:
    return (
        f"WW {g.written_work_score}/{g.written_work_total}, "
        f"PT {g.performance_task_score}/{g.performance_task_total}, "
        f"QA {g.quarterly_assessment_score}/{g.quarterly_assessment_total}, "
    )

class QuarterlyGradeCreateUpdateSerializer(serializers.ModelSerializer):
    """Write semester grades while retaining the existing database column names."""
    semester = SemesterReferenceField(required=True)
    semester_assessment_score = serializers.FloatField(source="quarterly_assessment_score", required=False)
    semester_assessment_total = serializers.FloatField(source="quarterly_assessment_total", required=False)
    sa_weight = serializers.FloatField(source="qa_weight", required=False)

    def to_internal_value(self, data):
        data = data.copy()
        for old, new in (
            ("quarterly_assessment_score", "semester_assessment_score"),
            ("quarterly_assessment_total", "semester_assessment_total"),
            ("qa_weight", "sa_weight"),
        ):
            if old in data and new not in data:
                data[new] = data[old]
        return super().to_internal_value(data)
    class Meta:
        model = QuarterlyGrade
        fields = [
            'student', 'SubjectOffering', 'semester',
            'written_work_score', 'written_work_total',
            'performance_task_score', 'performance_task_total',
            'semester_assessment_score', 'semester_assessment_total',
            'ww_weight', 'pt_weight', 'sa_weight', 'remarks'
        ]
    
    def validate(self, data):
        import math
        instance = self.instance
        semester = data.get("semester", getattr(instance, "semester", None))
        if semester is None:
            raise serializers.ValidationError({"semester": "Select a semester before saving."})
        offering = data.get("SubjectOffering", getattr(instance, "SubjectOffering", None))
        student = data.get("student", getattr(instance, "student", None))
        request = self.context.get("request")
        if request and (request.user.role != "TEACHER" or offering.teacher_id != request.user.pk):
            raise serializers.ValidationError({"SubjectOffering": "You may only edit your own subject offerings."})
        if student.section_id != offering.section_id:
            raise serializers.ValidationError({"student": "Student is not enrolled in this offering's section."})
        duplicates = QuarterlyGrade.objects.filter(student=student, SubjectOffering=offering, semester=semester)
        if instance:
            duplicates = duplicates.exclude(pk=instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("A grade already exists for this student, offering and semester. Update that grade instead.")
        for field in ("ww_weight", "pt_weight", "qa_weight"):
            value = data.get(field, getattr(instance, field, {"ww_weight": .4, "pt_weight": .4, "qa_weight": .2}[field]))
            if not math.isfinite(value) or not 0 <= value <= 1:
                raise serializers.ValidationError({field: "Weight must be between 0 and 1."})
        # Validate effective weights, including unchanged values on partial updates.
        ww = data.get('ww_weight', getattr(self.instance, 'ww_weight', 0.40))
        pt = data.get('pt_weight', getattr(self.instance, 'pt_weight', 0.40))
        qa = data.get('qa_weight', getattr(self.instance, 'qa_weight', 0.20))
        
        total_weight = ww + pt + qa
        if abs(total_weight - 1.0) > 0.01:  # Allow small floating point errors
            raise serializers.ValidationError(
                f"Weights must sum to 1.0 (100%). Current sum: {total_weight}"
            )
        
        return data
    
    def create(self, validated_data):
        grade = super().create(validated_data)

        teacher = None
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            teacher = request.user

        GradeChangeLog.objects.create(
            teacher=teacher,
            student=grade.student,
            SubjectOffering=grade.SubjectOffering,
            activity=f"Semester Grade ({grade.semester})",
            previous_grade="N/A",
            new_grade=grade_snapshot(grade),
            change_type="CREATE",
        )
        return grade

    def update(self, instance, validated_data):
        prev = grade_snapshot(instance)

        grade = super().update(instance, validated_data)
        new = grade_snapshot(grade)

        if prev != new:
            teacher = None
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                teacher = request.user

            GradeChangeLog.objects.create(
                teacher=teacher,
                student=grade.student,
                SubjectOffering=grade.SubjectOffering,
                activity=f"Semester Grade ({grade.semester})",
                previous_grade=prev,
                new_grade=new,
                change_type="UPDATE",
            )

        return grade
# =========================
# LOGIN SERIALIZER
# =========================
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password")

        if user.status != "ACTIVE":
            raise serializers.ValidationError("User account is inactive")

        refresh = RefreshToken.for_user(user)

        profile = None

        if user.role == "STUDENT":
            student = getattr(user, "student_profile", None)
            profile = {
                "grade_level": student.grade_level if student else None,
                "section": student.section_id if student else None,
            }

        elif user.role == "TEACHER":
            profile = {
                "subjects": user.subjects.values("id", "name"),
                "advisory_sections": user.advised_sections.values("id", "name"),
            }

        elif user.role == "ADMIN":
            profile = {"admin": True}

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "school_id": user.school_id,
                "status": user.status,
            },
            "profile": profile,
        }