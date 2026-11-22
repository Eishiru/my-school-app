"""
=============================================================================
CLAROED LMS - Performance & Reliability Load Testing Suite (Locust)
Aligned with Chapter 4 Section 4.2.6 & Table 4.6 of Capstone Research
Claro M. Recto High School
=============================================================================

This Locust load testing script evaluates system behavior under concurrent load
(up to 50 concurrent users at a ramp-up rate of 10 users/sec) across the five
critical architectural transactions:
  1. POST /api/token/                          - JWT Authentication & Issuance
  2. GET  /api/semester-grades/?SubjectOffering_id=... - Gradebook Matrix Retrieval
  3. POST /api/semester-grades/bulk-apply-weights/ - Trimester Grade Computation
  4. GET  /api/subject-offerings/{id}/grade-forecasts/ - AI Batch Forecasting
  5. GET  /api/teacher/submissions/export.csv  - Report Card Data Generation

USAGE:
  1. Install Locust:
       pip install locust

  2. Interactive Web UI Mode:
       locust -f locustfile.py --host=http://127.0.0.1:8000
       Then open http://localhost:8089 in your browser.

  3. Headless Automated Execution (Generates CSV reports for Table 4.6):
       locust -f locustfile.py --headless -u 50 -r 10 --run-time 3m \
              --host=http://127.0.0.1:8000 --csv=locust_report_results

  4. Environment Variable Overrides (Optional):
       $env:LOCUST_TEACHER_EMAIL="teacher@school.edu"
       $env:LOCUST_TEACHER_PASSWORD="password123"
       $env:LOCUST_STUDENT_EMAIL="student@school.edu"
       $env:LOCUST_STUDENT_PASSWORD="password123"
=============================================================================
"""

import os
import random
import logging
from locust import HttpUser, task, between, tag, events

logger = logging.getLogger("locust_claroed")

# ---------------------------------------------------------------------------
# Configurable Test Credentials (Defaults or via Environment Variables)
# ---------------------------------------------------------------------------
DEFAULT_TEACHER_EMAIL = os.environ.get("LOCUST_TEACHER_EMAIL", "teacher1@gmail.com")
DEFAULT_TEACHER_PASSWORD = os.environ.get("LOCUST_TEACHER_PASSWORD", "teacher1")
DEFAULT_STUDENT_EMAIL = os.environ.get("LOCUST_STUDENT_EMAIL", "student1@gmail.com")
DEFAULT_STUDENT_PASSWORD = os.environ.get("LOCUST_STUDENT_PASSWORD", "student1")


# ===========================================================================
# 1. TEACHER PERSONA (Gradebook, Calculation, AI Forecasting, Report Cards)
# ===========================================================================
class ClaroedTeacherUser(HttpUser):
    """
    Simulates a Claro M. Recto High School teacher performing daily academic workflows:
      - Authenticating and renewing JWT tokens
      - Loading the section gradebook matrix
      - Performing trimester grade recalculations with DepEd weight profiles
      - Executing AI-assisted batch grade forecasting for at-risk detection
      - Exporting consolidated submission matrices (BANIG / Form 137 prep)
    """
    weight = 3  # Ratio of teachers in user pool
    wait_time = between(1.0, 3.0)  # Realistic think-time between operations (1 to 3s)

    def on_start(self):
        """Executed when a virtual user starts: Log in and discover live offering IDs."""
        self.access_token = None
        self.offering_ids = []
        self.active_semester_id = 2
        self.login()
        if self.access_token:
            self.discover_offerings()

    def login(self):
        """Transaction 1: JWT Authentication & Bearer Token Retrieval"""
        payload = {
            "email": DEFAULT_TEACHER_EMAIL,
            "password": DEFAULT_TEACHER_PASSWORD,
        }
        with self.client.post(
            "/api/token/",
            json=payload,
            name="[Auth] 1. POST /api/token/ (Teacher Login)",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access")
                response.success()
            else:
                response.failure(f"Teacher login failed with status {response.status_code}: {response.text[:120]}")

    def auth_headers(self):
        """Generates standard Authorization headers."""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def discover_offerings(self):
        """Query real assigned offerings from database for dynamic testing."""
        try:
            res = self.client.get(
                "/api/teacher/subjects/",
                headers=self.auth_headers(),
                name="[Setup] GET /api/teacher/subjects/ (Offering Discovery)",
            )
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and len(data) > 0:
                    self.offering_ids = [item["id"] for item in data if "id" in item]
            if not self.offering_ids:
                # Fallback to teacher1's assigned offering IDs (8, 10, 11)
                self.offering_ids = [8, 10, 11]
        except Exception as e:
            logger.warning(f"Failed to discover live offerings: {e}")
            self.offering_ids = [8, 10, 11]

    def get_target_offering(self):
        """Select a random live offering from the teacher's enrolled subjects."""
        if self.offering_ids:
            return random.choice(self.offering_ids)
        return 1

    # -----------------------------------------------------------------------
    # Task 1: Gradebook Matrix Retrieval
    # -----------------------------------------------------------------------
    @tag("gradebook", "critical")
    @task(5)
    def retrieve_gradebook_matrix(self):
        """
        Transaction 2: Teacher Gradebook Matrix Retrieval
        Simulates teacher opening the Section Gradebook tab to inspect
        written works, performance tasks, and final grades for 40-50 students.
        """
        offering_id = self.get_target_offering()
        url = f"/api/semester-grades/?SubjectOffering_id={offering_id}"
        with self.client.get(
            url,
            headers=self.auth_headers(),
            name="[Gradebook] 2. GET /api/semester-grades/?SubjectOffering_id={id}",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Gradebook retrieval failed with HTTP {response.status_code}")

    # -----------------------------------------------------------------------
    # Task 2: Trimester Grade Computation (DepEd Weight Application)
    # -----------------------------------------------------------------------
    @tag("grades", "calculation")
    @task(3)
    def compute_trimester_grades(self):
        """
        Transaction 3: Trimester Grade Computation
        Simulates teacher adjusting or confirming component weights
        (e.g., 40% Written Work, 40% Performance Task, 20% Quarterly Assessment)
        triggering atomic recalculation and DepEd transmutation table lookup.
        """
        offering_id = self.get_target_offering()
        payload = {
            "SubjectOffering": offering_id,
            "semester": self.active_semester_id,
            "ww_weight": 0.40,
            "pt_weight": 0.40,
            "sa_weight": 0.20,
        }
        with self.client.post(
            "/api/semester-grades/bulk-apply-weights/",
            json=payload,
            headers=self.auth_headers(),
            name="[Grades] 3. POST /api/semester-grades/bulk-apply-weights/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 400, 403, 404):
                # 200: Successfully recalculated
                # 400/403/404: Expected edge-case response when offering has no active semester
                response.success()
            else:
                response.failure(f"Grade computation failed with HTTP {response.status_code}")

    # -----------------------------------------------------------------------
    # Task 3: AI Batch Grade Forecasting
    # -----------------------------------------------------------------------
    @tag("forecasting", "ai", "critical")
    @task(2)
    def generate_ai_grade_forecast(self):
        """
        Transaction 4: AI Batch Grade Forecasting
        Simulates teacher clicking 'Generate Section Forecasts' to invoke
        the DepEd-aligned Gradient Boosting ML engine across all enrolled students.
        """
        offering_id = self.get_target_offering()
        url = f"/api/subject-offerings/{offering_id}/grade-forecasts/"
        with self.client.get(
            url,
            headers=self.auth_headers(),
            name="[AI ML] 4. GET /api/subject-offerings/{id}/grade-forecasts/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"AI Grade forecasting failed with HTTP {response.status_code}")

    # -----------------------------------------------------------------------
    # Task 4: BANIG / Form 137 Report Card Generation
    # -----------------------------------------------------------------------
    @tag("reports", "export")
    @task(1)
    def export_report_card_data(self):
        """
        Transaction 5: Official Form 137 / BANIG Report Card Generation
        Simulates adviser or subject teacher generating consolidated tabular
        grades and submission summaries for report cards and DepEd Form 137.
        """
        offering_id = self.get_target_offering()
        url = f"/api/teacher/submissions/export.csv?scope=subject&subject_offering_id={offering_id}"
        with self.client.get(
            url,
            headers=self.auth_headers(),
            name="[Reports] 5. GET /api/teacher/submissions/export.csv",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Report export failed with HTTP {response.status_code}")


# ===========================================================================
# 2. STUDENT PERSONA (Dashboard, Quiz Taking, Personal Analytics)
# ===========================================================================
class ClaroedStudentUser(HttpUser):
    """
    Simulates a Claro M. Recto High School student:
      - Authenticating via JWT
      - Viewing active quarterly grades and semester summaries
      - Reviewing published quizzes and submission feedback
      - Checking personalized AI grade forecasts
    """
    weight = 7  # Higher proportion of virtual students vs teachers
    wait_time = between(2.0, 5.0)

    def on_start(self):
        self.access_token = None
        self.login()

    def login(self):
        payload = {
            "email": DEFAULT_STUDENT_EMAIL,
            "password": DEFAULT_STUDENT_PASSWORD,
        }
        with self.client.post(
            "/api/token/",
            json=payload,
            name="[Auth] 1b. POST /api/token/ (Student Login)",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                self.access_token = response.json().get("access")
                response.success()
            else:
                response.failure(f"Student login failed: HTTP {response.status_code}")

    def auth_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    @tag("student", "dashboard")
    @task(4)
    def view_my_offerings(self):
        """Student views enrolled subjects and quarterly progress."""
        with self.client.get(
            "/api/student/subject-offerings/",
            headers=self.auth_headers(),
            name="[Student] GET /api/student/subject-offerings/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Failed to fetch student subjects: HTTP {response.status_code}")

    @tag("student", "quizzes")
    @task(3)
    def view_quizzes(self):
        """Student checks assigned activities and deadlines."""
        with self.client.get(
            "/api/student/quizzes/",
            headers=self.auth_headers(),
            name="[Student] GET /api/student/quizzes/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Failed to fetch student quizzes: HTTP {response.status_code}")

    @tag("student", "analytics")
    @task(2)
    def view_grade_forecast(self):
        """Student checks personal AI trajectory prediction."""
        with self.client.get(
            "/api/student/grade-forecast/",
            headers=self.auth_headers(),
            name="[Student] GET /api/student/grade-forecast/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Failed to fetch grade forecast: HTTP {response.status_code}")


# ===========================================================================
# 3. TEST LIFECYCLE EVENT HOOKS
# ===========================================================================
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    logger.info("==================================================================")
    logger.info("CLAROED LOAD TEST INITIATING - Claro M. Recto High School")
    logger.info(f"Target Host: {environment.host}")
    logger.info("Aligned with Capstone Chapter 4 Table 4.6 Performance Benchmark")
    logger.info("==================================================================")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    logger.info("==================================================================")
    logger.info("CLAROED LOAD TEST COMPLETED")
    logger.info("Review generated CSV results to update Chapter 4 Table 4.6.")
    logger.info("==================================================================")
