export interface TeacherSubjectOffering {
    id: number;
    name: string;
    section: string;
    grade?: string;
    room_number: string;
    students: number;
    nextClass: string;
    average: number;
    pendingTasks: number;
}

export type QuizStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED";



export type RecentQuizGrade = {
  student: string;
  quiz: string;
  score: number;
  total: number;
  percent: number;
  submitted_at?: string;
};

export type TeacherSubjectFile = {
  id: number;
  title: string;
  file_url: string;
  file_size: number;
  content_type: string;
  created_at: string;
};

export type UploadSubjectFilePayload = {
  subjectId: number;
  file: File;
  title?: string;
};

export type DeleteSubjectFilePayload = {
  subjectId: number;
  fileId: number;
};

export type TeacherQuizActivity = {
  id: number;
  title: string;
  description?: string;
  open_time?: string | null;
  close_time?: string | null;
  status?: string;
  total_points?: number;
  SubjectOffering?: number;
};

export type DeleteTeacherQuizPayload = {
  subjectId: number;
  activityId: number;
};

export type Semester =
  | "SEMESTER_1"
  | "SEMESTER_2"
  | "SEMESTER_3";

export type TeacherSemesterGrade = {
  id: number;
  student: number;
  student_name: string;

  semester: Semester;

  written_work_score: number;
  written_work_total: number;

  final_grade: number | null;
  remarks: string | null;
};

export type TeacherSubjectStudent = {
  id: number;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type TeacherQuiz = {
  id: number;
  quiz_id: string;
  title: string;
  subject_name: string;
  open_time: string;
  close_time: string;
  status: QuizStatus;
  total_points: number;
  allow_multiple_attempts: boolean;
  time_limit: number;
  question_count: number;
  is_open: boolean;
  is_upcoming: boolean;
  is_closed: boolean;
  grade_type?: "WRITTEN_WORK" | "PERFORMANCE_TASK" | "FINAL_EXAM";
  semester?: Semester;
};


// quiz analysis types
export interface ChoiceDistribution {
  [choiceId: number]: {
    text: string;
    count: number;
    percentage: number;
    is_correct: boolean;
  };
}

export interface ScoreBin {
  score: number;
  count: number;
  percentage: number;
}

export interface QuestionAIInsight {
  misconception_analysis: string;
  teaching_strategy: string;
  remediation_suggestion: string;
  difficulty_validation: string;
  confidence: number;
}

export interface QuestionAnalysis {
  question_id: number;
  question_text: string;
  question_type: string;
  points: number;
  order: number;
  total_attempts: number;

  correct_count: number;
  incorrect_count: number;
  correct_percentage: number;
  difficulty: string;
  choice_distribution: ChoiceDistribution;

  ungraded_count: number;

  analysis_mode?: "CHOICES" | "SCORES" | "N/A";
  graded_count?: number;
  pending_count?: number;
  max_points?: number;
  avg_score?: number | null;
  score_distribution?: ScoreBin[];

  ai_insight?: QuestionAIInsight;
}

export interface QuizItemAnalysisData {
  quiz_id: number;
  quiz_title: string;
  total_questions: number;
  total_student_attempts: number;
  questions: QuestionAnalysis[];
}

export interface Choice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  order: number;
}

export interface StudentAnswer {
  id: number;
  question: number;
  question_text: string;
  question_points: number;

  selected_choice: number | null;
  correct_choice: number | null;
  choices?: Choice[];

  text_answer: string;

  answer_file: string | null;
  answer_file_url: string;

  is_correct: boolean | null;

  points_earned: number;
  manually_graded: boolean;
  teacher_feedback: string;

  graded_at: string | null;
  graded_by_name: string | null;
}

export interface StudentSubmission {
  attempt_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  submitted_at: string;
  score: number;
  status: string;
  answers: StudentAnswer[];
}

export interface GradeAnswerPayload {
  quizId: number;
  answerId: number;
  points: number;
  feedback: string;
}

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER";


export interface QuizChoice {
  id?: number;
  choice_text: string;
  is_correct: boolean;
  order: number;
}

export interface TeacherQuizQuestion {
  id: number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order: number;
  choices: QuizChoice[];
}

export interface CreateQuizQuestionPayload {
  quizId: number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order: number;
  choices: QuizChoice[];
}

export interface UpdateQuizQuestionPayload {
  questionId: number;
  quizId: number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  choices: QuizChoice[];
}

export interface DeleteQuizQuestionPayload {
  questionId: number;
  quizId: number;
}

export interface UpdateQuizTimesPayload {
  quizId: number;
  open_time: string;
  close_time: string;
}

export interface UpdateQuizStatusPayload {
  quizId: number;
  status: QuizStatus;
}



export type CreateQuizPayload = {
  SubjectOffering: number;

  title: string;
  description: string;

  open_time: string;
  close_time: string;

  time_limit: number;

  semester: Semester;

  total_points: number;
  passing_score: number;

  status: QuizStatus;

  grade_type?: "WRITTEN_WORK" | "PERFORMANCE_TASK" | "FINAL_EXAM";

  show_correct_answers: boolean;
  shuffle_questions: boolean;
  allow_multiple_attempts: boolean;
};

export type CreateQuizResponse = {
  id: number;
};

export type SemesterGrade = {
  id?: number;

  student: number;
  student_id?: string;
  student_name?: string;

  SubjectOffering: number;
  semester: Semester;

  written_work_score: number | null;
  written_work_total: number;

  performance_task_score: number | null;
  performance_task_total: number;

  semester_assessment_score: number | null;
  semester_assessment_total: number;

  ww_weight: number;
  pt_weight: number;
  sa_weight: number;

  final_grade?: number;

  remarks: string;
};

export type SaveSemesterGradePayload = {
  gradeId?: number;

  student: number;
  SubjectOffering: number;
  semester: Semester;

  written_work_score: number | null;
  written_work_total: number;

  performance_task_score: number | null;
  performance_task_total: number;

  semester_assessment_score: number | null;
  semester_assessment_total: number;

  ww_weight: number;
  pt_weight: number;
  sa_weight: number;

  remarks: string;
};

export type ApplySemesterWeightsPayload = {
  subjectId: number;
  semester: Semester;

  ww_weight: number;
  pt_weight: number;
  sa_weight: number;
};

export type DeleteSemesterGradePayload = {
  subjectId: number;
  semester: Semester;
  gradeId: number;
};

export type SubmissionSummaryTotals = {
  overall_attempts: number;
  overall_unique_students: number;
  overall_quizzes: number;
  overall_subject_offerings: number;
};

export type SubmissionSubjectRow = {
  subject_offering_id: number;
  subject: string;

  submitted_attempts: number;
  unique_students: number;
  total_students: number;

  submission_rate: number;
};

export type TeacherSubmissionsSummary = {
  totals: SubmissionSummaryTotals | null;
  by_subject: SubmissionSubjectRow[];
};

export type SubjectSubmissionQuiz = {
  quiz_id: number;
  title: string;

  attempts: number;
  unique_students: number;

  status: string;

  open_time?: string | null;
  close_time?: string | null;
};

export type TeacherSubjectSubmissionDetail = {
  subject_offering_id: number;
  subject: string;

  total_students: number;

  totals: {
    attempts: number;
    unique_students: number;
    submission_rate: number;
  };

  quizzes: SubjectSubmissionQuiz[];
};

// advisory class types
export type AdvisorySection = {
  id: number;
  section: string;
  grade_level: string | number;
  adviser_name?: string;
};

export type TeacherAdvisoryDetail = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  advisory: AdvisorySection | null;
};

export type AdvisoryStudent = {
  id: number;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  grade_level: string | number;
  section: number | null;
};

export type SemesterSummaryRow = {
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
};

export type BatchRecordQuizScoreItem = {
  quiz_id: number;
  student_id: number;
  score: number | null;
};

export type BatchRecordQuizScoresPayload = {
  updates: BatchRecordQuizScoreItem[];
};

export type BatchRecordQuizScoresResponse = {
  status: string;
  updated_count: number;
};