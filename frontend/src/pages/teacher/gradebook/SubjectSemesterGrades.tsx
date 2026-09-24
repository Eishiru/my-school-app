import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Code2 } from "lucide-react";

import type {
  Semester,
  SemesterGrade,
} from "../../../types/teacherTypes";
import {
  useSemesterGrades,
  useSaveSemesterGrade,
  useDeleteSemesterGrade,
  useApplySemesterWeights,
  useTeacherSubject,
  useTeacherSubjectQuizzes,
  useTeacherSubjectQuizAttempts,
  useTeacherSubjectStudents,
  useCreateTeacherQuiz,
  useBatchRecordQuizScores,
  useDeleteTeacherQuizActivity,
} from "../../../hooks/useTeacherSubjects";
import { useToast } from "../../../hooks/use-toast";

import type {
  ActivityItem,
  GradingMetrics,
  StudentRowData,
  ActivityCategory,
} from "./semester-grading/types/gradingSheetTypes";

import type { BatchRecordQuizScoreItem, SaveSemesterGradePayload } from "../../../types/teacherTypes";

import {
  decimalToPercent,
  percentToDecimal,
  calculateCategoryTotals,
  calculatePercentage,
  calculateFinalGrade,
} from "./semester-grading/utils/gradeCalculations";

import { GradingSheetHeader } from "./semester-grading/components/GradingSheetHeader";
import { GradingSummaryCards } from "./semester-grading/components/GradingSummaryCards";
import { ActivityGradingTable } from "./semester-grading/components/ActivityGradingTable";
import { GradingMetricsModal } from "./semester-grading/components/GradingMetricsModal";
// import { BackendSuggestionModal } from "./semester-grading/components/BackendSuggestionModal";
import { AddActivityModal } from "./semester-grading/components/AddActivityModal";

const SEMESTER_OPTIONS: { label: string; value: Semester }[] = [
  { label: "1st Semester", value: "SEMESTER_1" },
  { label: "2nd Semester", value: "SEMESTER_2" },
  { label: "3rd Semester", value: "SEMESTER_3" },
];

interface StudentDraft {
  activity_scores?: Record<number, number | null>;
  written_work_score?: number | null;
  written_work_total?: number;
  performance_task_score?: number | null;
  performance_task_total?: number;
  final_exam_score?: number | null;
  final_exam_total?: number;
  remarks?: string;
}

export default function SubjectSemesterGrades() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id || 0);

  // Active state
  const [currentSemester, setCurrentSemester] = useState<Semester>("SEMESTER_1");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWeightModal, setShowWeightModal] = useState(false);
  // const [showBackendModal, setShowBackendModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [addActivityCategory, setAddActivityCategory] = useState<ActivityCategory>("WRITTEN_WORK");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Local draft edits per student id
  const [draftGrades, setDraftGrades] = useState<Record<number, StudentDraft>>(
    {}
  );

  /*
   * Queries
   */
  const { data: subject, isLoading: subjectLoading } =
    useTeacherSubject(subjectId);

  const {
    data: grades = [],
    isLoading: gradesLoading,
    isError: gradesError,
    error: gradesErrObj,
    refetch: refetchGrades,
    isFetching: gradesFetching,
  } = useSemesterGrades(subjectId, currentSemester);

  const { data: quizzes = [], isFetching: quizzesFetching } =
    useTeacherSubjectQuizzes(subjectId);

  const { data: enrolledStudents = [] } =
    useTeacherSubjectStudents(subjectId);

  // Fetch real student attempt scores for all quizzes in this subject
  const { data: attemptScores = {} } =
    useTeacherSubjectQuizAttempts(quizzes);

  /*
   * Mutations
   */
  const saveMutation = useSaveSemesterGrade();
  const deleteMutation = useDeleteSemesterGrade();
  const applyWeightsMutation = useApplySemesterWeights();
  const createQuizMutation = useCreateTeacherQuiz();
  const batchRecordMutation = useBatchRecordQuizScores();
  const deleteActivityMutation = useDeleteTeacherQuizActivity();
  const { toast } = useToast();

  /*
   * Grading Metrics (Weights)
   */
  const defaultWeights = useMemo<GradingMetrics>(() => {
    const firstWithWeights = grades.find((g) => g.ww_weight !== undefined);
    return {
      ww_weight: firstWithWeights
        ? decimalToPercent(firstWithWeights.ww_weight)
        : 40,
      pt_weight: firstWithWeights
        ? decimalToPercent(firstWithWeights.pt_weight)
        : 40,
      sa_weight: firstWithWeights
        ? decimalToPercent(firstWithWeights.sa_weight)
        : 20,
    };
  }, [grades]);

  const [weights, setWeights] = useState<GradingMetrics>(defaultWeights);

  useEffect(() => {
    setWeights(defaultWeights);
    setDraftGrades({});
  }, [defaultWeights, currentSemester]);

  /*
   * Validate route parameter
   */
  useEffect(() => {
    if (!Number.isFinite(subjectId) || subjectId <= 0) {
      navigate("/teacher/grades/semester", { replace: true });
    }
  }, [subjectId, navigate]);

  /*
   * 100% Real Activities from Backend (Filtered for current semester)
   */
  const activities = useMemo<ActivityItem[]>(() => {
    const semesterQuizzes = quizzes.filter(
      (q) => !q.semester || q.semester === currentSemester
    );

    return semesterQuizzes.map((q) => {
      let kind: ActivityCategory = "WRITTEN_WORK";
      if (
        q.grade_type === "WRITTEN_WORK" ||
        q.grade_type === "PERFORMANCE_TASK" ||
        q.grade_type === "FINAL_EXAM"
      ) {
        kind = q.grade_type;
      } else {
        // Fallback inference if grade_type is missing
        const lower = (q.title || "").toLowerCase();
        if (/exam|final|quarterly|assessment|periodical/.test(lower)) {
          kind = "FINAL_EXAM";
        } else if (
          /task|project|performance|pt|demo|lab|presentation/.test(lower)
        ) {
          kind = "PERFORMANCE_TASK";
        } else {
          kind = "WRITTEN_WORK";
        }
      }

      return {
        id: q.id,
        title: q.title,
        grade_type: kind,
        total_points: Number(q.total_points) || 100,
        semester: q.semester,
      };
    });
  }, [quizzes, currentSemester]);

  const wwActivities = useMemo(
    () => activities.filter((a) => a.grade_type === "WRITTEN_WORK"),
    [activities]
  );
  const ptActivities = useMemo(
    () => activities.filter((a) => a.grade_type === "PERFORMANCE_TASK"),
    [activities]
  );
  const feActivities = useMemo(
    () => activities.filter((a) => a.grade_type === "FINAL_EXAM"),
    [activities]
  );

  /*
   * Merge students list with 100% real attempt scores, server grades, and local drafts
   */
  const studentRows = useMemo<StudentRowData[]>(() => {
    const gradeMap = new Map<number, SemesterGrade>();
    for (const g of grades) {
      gradeMap.set(g.student, g);
    }

    // Build unified student list
    const studentList: { id: number; school_id: string; name: string }[] = [];
    const seenIds = new Set<number>();

    for (const s of enrolledStudents) {
      seenIds.add(s.id);
      studentList.push({
        id: s.id,
        school_id: s.school_id,
        name: `${s.first_name} ${s.last_name}`.trim(),
      });
    }

    for (const g of grades) {
      if (!seenIds.has(g.student)) {
        seenIds.add(g.student);
        studentList.push({
          id: g.student,
          school_id: g.student_id || "—",
          name: g.student_name || `Student #${g.student}`,
        });
      }
    }

    return studentList.map((student) => {
      const serverGrade = gradeMap.get(student.id);
      const draft = draftGrades[student.id] || {};
      const isModified = Object.keys(draft).length > 0;

      // Real attempt scores mapped to each real activity
      const activityScores: Record<number, number | null> = {};
      for (const act of activities) {
        const studentAttempt = attemptScores[student.id]?.[act.id];
        activityScores[act.id] =
          studentAttempt !== undefined && studentAttempt !== null
            ? studentAttempt
            : null;
      }

      // Local draft overrides when teacher types into grid cells
      if (draft.activity_scores) {
        for (const [actIdStr, val] of Object.entries(draft.activity_scores)) {
          activityScores[Number(actIdStr)] = val;
        }
      }

      // 1. Written Works totals
      let wwScore = serverGrade?.written_work_score ?? null;
      let wwTotal = serverGrade?.written_work_total ?? 100;

      if (wwActivities.length > 0) {
        const wwTotals = calculateCategoryTotals(activityScores, wwActivities);
        wwScore = wwTotals.earned;
        wwTotal = wwTotals.total > 0 ? wwTotals.total : wwTotal;
      }
      if (draft.written_work_score !== undefined) {
        wwScore = draft.written_work_score;
      }
      if (draft.written_work_total !== undefined) {
        wwTotal = draft.written_work_total;
      }
      const wwPct = calculatePercentage(wwScore, wwTotal);

      // 2. Performance Tasks totals
      let ptScore = serverGrade?.performance_task_score ?? null;
      let ptTotal = serverGrade?.performance_task_total ?? 100;

      if (ptActivities.length > 0) {
        const ptTotals = calculateCategoryTotals(activityScores, ptActivities);
        ptScore = ptTotals.earned;
        ptTotal = ptTotals.total > 0 ? ptTotals.total : ptTotal;
      }
      if (draft.performance_task_score !== undefined) {
        ptScore = draft.performance_task_score;
      }
      if (draft.performance_task_total !== undefined) {
        ptTotal = draft.performance_task_total;
      }
      const ptPct = calculatePercentage(ptScore, ptTotal);

      // 3. Final Exam totals
      let feScore = serverGrade?.semester_assessment_score ?? null;
      let feTotal = serverGrade?.semester_assessment_total ?? 100;

      if (feActivities.length > 0) {
        const feTotals = calculateCategoryTotals(activityScores, feActivities);
        feScore = feTotals.earned;
        feTotal = feTotals.total > 0 ? feTotals.total : feTotal;
      }
      if (draft.final_exam_score !== undefined) {
        feScore = draft.final_exam_score;
      }
      if (draft.final_exam_total !== undefined) {
        feTotal = draft.final_exam_total;
      }
      const fePct = calculatePercentage(feScore, feTotal);

      // 4. Final Grade (live calculation)
      let finalGrade: number | null = null;
      if (isModified || (wwScore !== null || ptScore !== null || feScore !== null)) {
        finalGrade = calculateFinalGrade(wwPct, ptPct, fePct, weights);
      } else if (
        serverGrade?.final_grade !== undefined &&
        serverGrade.final_grade !== null
      ) {
        finalGrade = Number(serverGrade.final_grade);
      }

      // Remarks
      const remarks =
        draft.remarks !== undefined
          ? draft.remarks
          : serverGrade?.remarks || "";

      return {
        student_id: student.id,
        school_id: student.school_id,
        student_name: student.name,
        grade_record_id: serverGrade?.id,
        activity_scores: activityScores,
        written_work_score: wwScore,
        written_work_total: wwTotal,
        written_work_pct: wwPct,
        performance_task_score: ptScore,
        performance_task_total: ptTotal,
        performance_task_pct: ptPct,
        final_exam_score: feScore,
        final_exam_total: feTotal,
        final_exam_pct: fePct,
        final_grade: finalGrade,
        remarks,
        isModified,
      };
    });
  }, [
    grades,
    enrolledStudents,
    draftGrades,
    activities,
    wwActivities,
    ptActivities,
    feActivities,
    weights,
    attemptScores,
  ]);

  /*
   * Filtered rows for search query
   */
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return studentRows;

    return studentRows.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.school_id.toLowerCase().includes(q)
    );
  }, [studentRows, searchQuery]);

  const modifiedCount = useMemo(
    () => Object.keys(draftGrades).length,
    [draftGrades]
  );

  /*
   * Handlers for editing scores inline
   */
  const handleActivityScoreChange = (
    studentId: number,
    activityId: number,
    score: number | null
  ) => {
    setDraftGrades((prev) => {
      const studentDraft = prev[studentId] || {};
      const currentScores = studentDraft.activity_scores || {};

      return {
        ...prev,
        [studentId]: {
          ...studentDraft,
          activity_scores: {
            ...currentScores,
            [activityId]: score,
          },
        },
      };
    });
  };

  const handleSummaryScoreChange = (
    studentId: number,
    category: "written_work" | "performance_task" | "final_exam",
    field: "score" | "total",
    value: number | null
  ) => {
    setDraftGrades((prev) => {
      const studentDraft = prev[studentId] || {};
      const key = `${category}_${field}` as keyof StudentDraft;

      return {
        ...prev,
        [studentId]: {
          ...studentDraft,
          [key]: value,
        },
      };
    });
  };

  const handleRemarksChange = (studentId: number, remarks: string) => {
    setDraftGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        remarks,
      },
    }));
  };

  /*
   * Save one student row to backend
   */
  const handleSaveRow = async (row: StudentRowData) => {
    const payload = {
      gradeId: row.grade_record_id,
      student: row.student_id,
      SubjectOffering: subjectId,
      semester: currentSemester,
      written_work_score: row.written_work_score,
      written_work_total: row.written_work_total,
      performance_task_score: row.performance_task_score,
      performance_task_total: row.performance_task_total,
      semester_assessment_score: row.final_exam_score,
      semester_assessment_total: row.final_exam_total,
      ww_weight: percentToDecimal(weights.ww_weight),
      pt_weight: percentToDecimal(weights.pt_weight),
      sa_weight: percentToDecimal(weights.sa_weight),
      remarks: row.remarks || "",
    };

    const studentDraft = draftGrades[row.student_id];
    const activityUpdates: BatchRecordQuizScoreItem[] = [];
    if (studentDraft?.activity_scores) {
      for (const [actIdStr, val] of Object.entries(studentDraft.activity_scores)) {
        activityUpdates.push({
          quiz_id: Number(actIdStr),
          student_id: row.student_id,
          score: val,
        });
      }
    }

    try {
      if (activityUpdates.length > 0) {
        await batchRecordMutation.mutateAsync({ updates: activityUpdates });
      }
      await saveMutation.mutateAsync(payload);
      setDraftGrades((prev) => {
        const next = { ...prev };
        delete next[row.student_id];
        return next;
      });
    } catch (err) {
      console.error("Failed to save grade:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to save semester grade."
      );
    }
  };

  /*
   * Save all modified rows (Global Save)
   */
  const handleSaveAll = async () => {
    const modifiedRows = studentRows.filter((r) => r.isModified);
    if (modifiedRows.length === 0) return;

    setIsSavingAll(true);
    try {
      // 1. Gather all activity score updates across students
      const allActivityUpdates: BatchRecordQuizScoreItem[] = [];
      for (const row of modifiedRows) {
        const draft = draftGrades[row.student_id];
        if (draft?.activity_scores) {
          for (const [actIdStr, val] of Object.entries(draft.activity_scores)) {
            allActivityUpdates.push({
              quiz_id: Number(actIdStr),
              student_id: row.student_id,
              score: val,
            });
          }
        }
      }

      if (allActivityUpdates.length > 0) {
        await batchRecordMutation.mutateAsync({ updates: allActivityUpdates });
      }

      // 2. Save semester grades for each modified student
      for (const row of modifiedRows) {
        const payload: SaveSemesterGradePayload = {
          gradeId: row.grade_record_id,
          student: row.student_id,
          SubjectOffering: subjectId,
          semester: currentSemester,
          written_work_score: row.written_work_score,
          written_work_total: row.written_work_total,
          performance_task_score: row.performance_task_score,
          performance_task_total: row.performance_task_total,
          semester_assessment_score: row.final_exam_score,
          semester_assessment_total: row.final_exam_total,
          ww_weight: percentToDecimal(weights.ww_weight),
          pt_weight: percentToDecimal(weights.pt_weight),
          sa_weight: percentToDecimal(weights.sa_weight),
          remarks: row.remarks || "",
        };
        await saveMutation.mutateAsync(payload);
      }

      setDraftGrades({});
      setIsEditing(false);
      refetchGrades();
    } catch (err) {
      console.error("Failed to save all grades:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to save all grades."
      );
    } finally {
      setIsSavingAll(false);
    }
  };

  /*
   * Discard unsaved changes
   */
  const handleDiscardChanges = () => {
    if (Object.keys(draftGrades).length > 0) {
      const ok = window.confirm("Discard all unsaved grade modifications?");
      if (!ok) return;
    }
    setDraftGrades({});
    setIsEditing(false);
  };

  /*
   * Create Manual Activity
   */
  const handleCreateActivity = async (data: {
    title: string;
    grade_type: ActivityCategory;
    total_points: number;
    description: string;
    semester: Semester;
  }) => {
    await createQuizMutation.mutateAsync({
      SubjectOffering: subjectId,
      title: data.title,
      grade_type: data.grade_type,
      total_points: data.total_points,
      description: data.description,
      semester: data.semester,
      open_time: new Date().toISOString(),
      close_time: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      time_limit: 60,
      passing_score: Math.round(data.total_points * 0.6),
      status: "CLOSED",
      show_correct_answers: false,
      shuffle_questions: false,
      allow_multiple_attempts: false,
    });
  };

  /*
   * Delete grade row
   */
  const handleDeleteRow = async (gradeId?: number) => {
    if (!gradeId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this recorded grade?"
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync({
        subjectId,
        semester: currentSemester,
        gradeId,
      });
    } catch (err) {
      console.error("Failed to delete grade:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete grade."
      );
    }
  };

  /*
   * Delete an activity / quiz directly from the gradebook
   */
  const handleDeleteActivity = (activityId: number, title: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? All student scores for this activity will be deleted, and grades will automatically recalculate.`
    );
    if (!confirmed) return;

    deleteActivityMutation.mutate(
      { subjectId, activityId },
      {
        onSuccess: () => {
          // Clear any draft scores for this activity
          setDraftGrades((prev) => {
            const next = { ...prev };
            for (const sId of Object.keys(next)) {
              const numId = Number(sId);
              if (next[numId]?.activity_scores?.[activityId] !== undefined) {
                const updatedScores = { ...next[numId].activity_scores };
                delete updatedScores[activityId];
                next[numId] = {
                  ...next[numId],
                  activity_scores: updatedScores,
                };
              }
            }
            return next;
          });

          toast({
            title: "Activity Deleted",
            description: `"${title}" has been deleted. Student grades have been recalculated.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Failed to delete activity",
            description:
              err instanceof Error
                ? err.message
                : "An error occurred while deleting the activity.",
            variant: "destructive",
          });
        },
      }
    );
  };

  /*
   * Apply adjusted weights
   */
  const handleSaveWeights = async (newMetrics: GradingMetrics) => {
    try {
      await applyWeightsMutation.mutateAsync({
        subjectId,
        semester: currentSemester,
        ww_weight: percentToDecimal(newMetrics.ww_weight),
        pt_weight: percentToDecimal(newMetrics.pt_weight),
        sa_weight: percentToDecimal(newMetrics.sa_weight),
      });

      setWeights(newMetrics);
      setShowWeightModal(false);
    } catch (err) {
      console.error("Failed to apply weights:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to apply weights."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex flex-col space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <GradingSheetHeader
          subjectName={
            subjectLoading ? "Loading subject..." : subject?.name
          }
          section={subject?.section}
          gradeLevel={subject?.grade}
          roomNumber={subject?.room_number}
          currentSemester={currentSemester}
          semesterOptions={SEMESTER_OPTIONS}
          searchQuery={searchQuery}
          isFetching={gradesFetching || quizzesFetching}
          modifiedCount={modifiedCount}
          isEditing={isEditing}
          isSavingAll={isSavingAll}
          onBack={() => navigate("/teacher/grades/semester")}
          onSemesterChange={setCurrentSemester}
          onSearchChange={setSearchQuery}
          onRefresh={() => refetchGrades()}
          onOpenWeightsModal={() => setShowWeightModal(true)}
          onToggleEdit={() => setIsEditing((prev) => !prev)}
          onOpenAddActivity={() => {
            setAddActivityCategory("WRITTEN_WORK");
            setShowAddActivityModal(true);
          }}
          onSaveAll={handleSaveAll}
        />

        {/* Summary Metric Cards */}
        <GradingSummaryCards
          students={studentRows}
          activities={activities}
        />

        

        {/* The Matrix Table with Section Buttons and Inline Score Editing */}
        <ActivityGradingTable
          subjectId={subjectId}
          students={filteredStudents}
          activities={activities}
          metrics={weights}
          isLoading={gradesLoading}
          isError={gradesError}
          errorMessage={
            gradesErrObj instanceof Error ? gradesErrObj.message : undefined
          }
          isEditing={isEditing}
          isSavingAll={isSavingAll}
          isSavingRow={(sId) =>
            (saveMutation.isPending && saveMutation.variables?.student === sId) ||
            batchRecordMutation.isPending
          }
          isDeletingRow={(gId) =>
            deleteMutation.isPending &&
            deleteMutation.variables?.gradeId === gId
          }
          onActivityScoreChange={handleActivityScoreChange}
          onSummaryScoreChange={handleSummaryScoreChange}
          onRemarksChange={handleRemarksChange}
          onSaveRow={handleSaveRow}
          onDeleteRow={handleDeleteRow}
          onSaveAll={handleSaveAll}
          onDiscardChanges={handleDiscardChanges}
          onOpenAddActivity={(cat) => {
            if (cat) setAddActivityCategory(cat);
            setShowAddActivityModal(true);
          }}
          onDeleteActivity={handleDeleteActivity}
        />
      </div>

      {/* Adjust Metrics Modal */}
      <GradingMetricsModal
        isOpen={showWeightModal}
        initialMetrics={weights}
        isSaving={applyWeightsMutation.isPending}
        onClose={() => setShowWeightModal(false)}
        onSave={handleSaveWeights}
      />

      {/* Backend Integration Guide Modal */}
      {/* <BackendSuggestionModal
        isOpen={showBackendModal}
        onClose={() => setShowBackendModal(false)}
      /> */}

      {/* Add Manual Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivityModal}
        subjectId={subjectId}
        currentSemester={currentSemester}
        defaultCategory={addActivityCategory}
        isCreating={createQuizMutation.isPending}
        onClose={() => setShowAddActivityModal(false)}
        onSubmit={handleCreateActivity}
      />
    </main>
  );
}