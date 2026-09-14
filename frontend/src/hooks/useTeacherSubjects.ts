import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addQuizQuestion, applySemesterWeights, batchRecordQuizScores, createTeacherQuiz, deleteQuizQuestion, deleteSemesterGrade, deleteSubjectFile, deleteTeacherQuiz, deleteTeacherQuizActivity, deleteTeacherSubject, generateQuizAIAnalysis, getAdvisoryStudents, getQuizItemAnalysis, getQuizQuestions, getQuizStudentSubmissions, getRecentQuizGrades, getSemesterGrades, getStudentSemesterSummary, getSubjectFiles, getTeacherAdvisoryDetail, getTeacherQuiz, getTeacherQuizAttempts, getTeacherQuizzes, getTeacherSubject, getTeacherSubjectActivities, getTeacherSubjectGrades, getTeacherSubjectQuizzes, getTeacherSubjects, getTeacherSubjectStudents, getTeacherSubjectSubmissionDetail, getTeacherSubmissionsSummary, gradeQuizAnswer, saveSemesterGrade, updateQuizQuestion, updateQuizStatus, updateQuizTimes, uploadSubjectFile } from "../api/teacherApi";
import { Semester, TeacherQuiz } from "../types/teacherTypes";

export function useTeacherSubjects() {
  return useQuery({
    queryKey: ["teacher", "subjects"],
    queryFn: getTeacherSubjects,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDeleteTeacherSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeacherSubject,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher", "subjects"],
      });
    },
  });
}

export function useTeacherSubject(subjectId: number) {
  return useQuery({
    queryKey: ["teacher", "subjects", subjectId],

    queryFn: () => getTeacherSubject(subjectId),

    enabled: subjectId > 0,

    staleTime: 10 * 60 * 1000,
  });
}




export function useTeacherSubjectQuizzes(subjectId: number) {
  return useQuery({
    queryKey: ["teacher", "subjects", subjectId, "quizzes"],
    queryFn: () => getTeacherSubjectQuizzes(subjectId),
    enabled: subjectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacherSubjectQuizAttempts(quizzes: TeacherQuiz[]) {
  const quizIds = quizzes.map((q) => q.id).sort().join(",");
  return useQuery({
    queryKey: ["teacher", "quizzes", "attempts-map", quizIds],
    queryFn: async () => {
      const map: Record<number, Record<number, number | null>> = {};
      await Promise.all(
        quizzes.map(async (quiz) => {
          try {
            const attempts = await getTeacherQuizAttempts(quiz.id);
            for (const att of attempts) {
              if (att.status === "SUBMITTED" || att.status === "GRADED") {
                if (!map[att.student]) {
                  map[att.student] = {};
                }
                const prev = map[att.student][quiz.id];
                if (prev === undefined || (att.score !== null && (prev === null || att.score > prev))) {
                  map[att.student][quiz.id] = att.score;
                }
              }
            }
          } catch (e) {
            console.error(`Failed to load attempts for quiz ${quiz.id}:`, e);
          }
        })
      );
      return map;
    },
    enabled: quizzes.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentQuizGrades(subjectId: number) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "recent-quiz-grades",
    ],
    queryFn: () => getRecentQuizGrades(subjectId),
    enabled: subjectId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubjectFiles(subjectId: number) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "files",
    ],
    queryFn: () => getSubjectFiles(subjectId),
    enabled: subjectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadSubjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadSubjectFile,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.subjectId,
          "files",
        ],
      });
    },
  });
}

export function useDeleteSubjectFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubjectFile,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.subjectId,
          "files",
        ],
      });
    },
  });
}

export function useTeacherSubjectActivities(
  subjectId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "activities",
    ],
    queryFn: () =>
      getTeacherSubjectActivities(subjectId),
    enabled: subjectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteTeacherQuizActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeacherQuizActivity,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.subjectId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
        ],
      });
    },
  });
}

export function useTeacherSubjectGrades(
  subjectId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "grades",
    ],

    queryFn: () =>
      getTeacherSubjectGrades(subjectId),

    enabled: subjectId > 0,

    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacherSubjectStudents(
  subjectId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "students",
    ],

    queryFn: () =>
      getTeacherSubjectStudents(subjectId),

    enabled: subjectId > 0,

    staleTime: 10 * 60 * 1000,
  });
}

export function useTeacherQuizzes() {
  return useQuery({
    queryKey: [
      "teacher",
      "quizzes",
    ],

    queryFn: getTeacherQuizzes,

    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteTeacherQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTeacherQuiz,

    onSuccess: () => {
      // Main teacher quiz/activity list
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
        ],
      });

      // Subject-related quiz/activity queries may
      // also contain the deleted quiz
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
        ],
      });
    },
  });
}

export function useQuizItemAnalysis(
  quizId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "quizzes",
      quizId,
      "item-analysis",
    ],
    queryFn: () =>
      getQuizItemAnalysis(quizId),
    enabled: quizId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateQuizAIAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateQuizAIAnalysis,

    onSuccess: (data, quizId) => {
      queryClient.setQueryData(
        [
          "teacher",
          "quizzes",
          quizId,
          "item-analysis",
        ],
        data
      );
    },
  });
}

export function useTeacherQuiz(
  quizId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "quizzes",
      quizId,
    ],
    queryFn: () =>
      getTeacherQuiz(quizId),
    enabled: quizId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuizStudentSubmissions(
  quizId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "quizzes",
      quizId,
      "submissions",
    ],
    queryFn: () =>
      getQuizStudentSubmissions(quizId),
    enabled: quizId > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGradeQuizAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gradeQuizAnswer,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
          "submissions",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
          "item-analysis",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });
    },
  });
}

// create quiz

export function useQuizQuestions(
  quizId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "quizzes",
      quizId,
      "questions",
    ],
    queryFn: () =>
      getQuizQuestions(quizId),
    enabled: quizId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateQuizTimes() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: updateQuizTimes,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
        ],
      });
    },
  });
}

export function useUpdateQuizStatus() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: updateQuizStatus,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
        ],
      });
    },
  });
}

export function useAddQuizQuestion() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: addQuizQuestion,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
          "questions",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });
    },
  });
}

export function useUpdateQuizQuestion() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: updateQuizQuestion,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
          "questions",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });
    },
  });
}

export function useDeleteQuizQuestion() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: deleteQuizQuestion,

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
          "questions",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
          variables.quizId,
        ],
      });
    },
  });
}

export function useCreateTeacherQuiz() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: createTeacherQuiz,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "quizzes",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
        ],
      });
    },
  });
}

// gradebook

export function useSemesterGrades(
  subjectId: number,
  semester: Semester
) {
  return useQuery({
    queryKey: [
      "teacher",
      "subjects",
      subjectId,
      "semester-grades",
      semester,
    ],

    queryFn: () =>
      getSemesterGrades(
        subjectId,
        semester
      ),

    enabled: subjectId > 0,

    staleTime:
      2 * 60 * 1000,
  });
}

export function useSaveSemesterGrade() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      saveSemesterGrade,

    onSuccess: (
      _,
      variables
    ) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.SubjectOffering,
          "semester-grades",
          variables.semester,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.SubjectOffering,
        ],
      });
    },
  });
}

export function useBatchRecordQuizScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchRecordQuizScores,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher", "subjects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["teacher", "quiz-attempts"],
      });
    },
  });
}

export function useDeleteSemesterGrade() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      deleteSemesterGrade,
    
    onSuccess: (
      _,
      variables
    ) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.subjectId,
          "semester-grades",
          variables.semester,
        ],
      });
    },
  });
}

export function useApplySemesterWeights() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      applySemesterWeights,

    onSuccess: (
      _,
      variables
    ) => {
      queryClient.invalidateQueries({
        queryKey: [
          "teacher",
          "subjects",
          variables.subjectId,
          "semester-grades",
          variables.semester,
        ],
      });
    },
  });
}

export function useTeacherSubmissionsSummary() {
  return useQuery({
    queryKey: [
      "teacher",
      "submissions",
      "summary",
    ],

    queryFn:
      getTeacherSubmissionsSummary,

    staleTime:
      2 * 60 * 1000,
  });
}

export function useTeacherSubjectSubmissionDetail(
  subjectId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "submissions",
      "subject",
      subjectId,
    ],

    queryFn: () =>
      getTeacherSubjectSubmissionDetail(
        subjectId
      ),

    enabled:
      subjectId > 0,

    staleTime:
      2 * 60 * 1000,
  });
}

// advisory class
export function useTeacherAdvisoryDetail(
  teacherId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "advisory",
      teacherId,
    ],

    queryFn: () =>
      getTeacherAdvisoryDetail(
        teacherId
      ),

    enabled: teacherId > 0,

    staleTime:
      10 * 60 * 1000,
  });
}

export function useAdvisoryStudents(
  sectionId: number
) {
  return useQuery({
    queryKey: [
      "teacher",
      "advisory",
      "section",
      sectionId,
      "students",
    ],

    queryFn: () =>
      getAdvisoryStudents(
        sectionId
      ),

    enabled: sectionId > 0,

    staleTime:
      5 * 60 * 1000,
  });
}

export function useStudentSemesterSummary(
  studentId: number,
  enabled = true
) {
  return useQuery({
    queryKey: [
      "teacher",
      "advisory",
      "student",
      studentId,
      "semester-summary",
    ],

    queryFn: () =>
      getStudentSemesterSummary(
        studentId
      ),

    enabled:
      enabled &&
      studentId > 0,

    staleTime:
      5 * 60 * 1000,
  });
}       