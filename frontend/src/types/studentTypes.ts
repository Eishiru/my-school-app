export type PageKey = 'dashboard' | 'subjects' | 'grades'  ;
export type SubjectAccent = 'violet' | 'green' | 'amber' | 'blue';
export type SubjectIconName = 'code' | 'database' | 'calculator' | 'book';

export interface StudentProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    grade_level: string;
    academic_year: string;
    role: string;
}

export interface StudentSubjectOffering {
  id: number;
  subject_name: string;
  teacher_name: string;
  section_name: string;
  grade_level: string;
  room_number: string;
  schedule: string;

  progress: number;
  average: number;
  quarters?: Record<string, number>;
  semesters?: Record<string, number>;
  final_grade: number | null;
}


export interface Subject {
    id: string;
    subjectName: string;
    teacherName: string;
    days: string;
    time: string;
    accent: SubjectAccent;
}

export interface Semester {
    id: string;
    label: string;
    academicYear: string;
}

// activity grade will be input here later on

export interface SubjectGrade {
    subjectId: string;
    subjectName: string;
    initialGrade: number | null;
    transmutedGrade: number | null;
}

export interface SemesterGradeReport {
    semesterId: string;
    rows: SubjectGrade[];
    average: number | null; // average of all transmuted grades for the semester
    gpa: number | null; 
    result: 'passed' | 'failed';
}

export interface PortalSnapshot {
    currentSemesterId: string;
    student: StudentProfile;
    semesters: Semester[];
    subjects: Subject[];
    gradeReports: SemesterGradeReport[];

}

export type QuizStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";

export interface StudentQuiz {
  id: number;
  quiz_id: string;
  SubjectOffering: number;

  subject_name: string;
  teacher_name: string;

  title: string;
  description: string;

  open_time: string;
  close_time: string;
  time_limit: number;

  total_points: number;
  allow_multiple_attempts: boolean;
  question_count: number;

  is_open: boolean;
  is_upcoming: boolean;
  is_closed: boolean;

  user_attempts: number;
}

export interface StudentSubjectFile {
    id: number;
    title: string;
    file_url: string;
    file_size: number;
    content_type: string;
    created_at: string;
}

// for grade/report card section types

export interface GradeComponent {
  score: number;
  total: number;
  percentage: number;
  weight: number;
  weighted_score: number;
}

export interface StudentSubjectSemesterGrade {
  subject_offering_id: number;
  subject_name: string;
  teacher_name: string;

  written_work: GradeComponent;
  performance_task: GradeComponent;
  final_exam: GradeComponent;

  initial_grade: number | null;
  transmuted_grade: number | null;
  remarks: "PASSED" | "FAILED" | "INCOMPLETE" | null;
}

export interface StudentSemesterGradeReport {
  semester_id: number;
  semester_name: string;
  school_year: string;

  subjects: StudentSubjectSemesterGrade[];

  semester_average: number | null;
  result: "PASSED" | "FAILED" | "INCOMPLETE";
}

export interface StudentSemesterGradeRow {
  subject_offering_id: number;
  subject: string;
  teacher_name?: string;
  sem1?: number | null;
  sem2?: number | null;
  sem3?: number | null;
  semester_1?: number | null;
  semester_2?: number | null;
  semester_3?: number | null;
  final: number | null;
}

export interface StudentQuizAttempt {
  id: number;
  quiz: number;
  quiz_title?: string;
  subject_name?: string;
  score: number | null;
  total: number | null;
  percentage: number | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED";
  started_at?: string;
  submitted_at?: string;
}

export interface StudentSubjectQuarterlyGrade {
  id: number;
  quarter?: number | null;
  semester?: {
    id: number;
    name: string;
    school_year?: number;
  } | null;
  semester_id?: number | null;
  written_work_score: number;
  written_work_total: number;
  performance_task_score: number;
  performance_task_total: number;
  semester_assessment_score?: number;
  semester_assessment_total?: number;
  quarterly_assessment_score?: number;
  quarterly_assessment_total?: number;
  ww_weight: number;
  pt_weight: number;
  sa_weight?: number;
  qa_weight?: number;
  final_grade: number | null;
  remarks: string | null;
}