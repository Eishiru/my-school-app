import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  User,
  Calendar,
} from 'lucide-react';
import { useStudentSemesterGrades } from '../../../hooks/useStudentSemesterGrades';

function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeAverage(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function formatGrade(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function statusBadge(grade: number | null) {
  if (grade === null) {
    return {
      label: 'Pending',
      cls: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
    };
  }
  if (grade >= 75) {
    return {
      label: 'Passed',
      cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    };
  }
  return {
    label: 'Failed',
    cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  };
}

export default function StudentSemesterGrades() {
  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentSemesterGrades();

  const [selectedTab, setSelectedTab] = useState<'ALL' | 'SEM1' | 'SEM2' | 'SEM3'>('ALL');

  // Calculate semester metrics
  const metrics = useMemo(() => {
    const sem1Grades = grades.map((g) => safeNum(g.semester_1 ?? g.sem1));
    const sem2Grades = grades.map((g) => safeNum(g.semester_2 ?? g.sem2));
    const sem3Grades = grades.map((g) => safeNum(g.semester_3 ?? g.sem3));
    const finalGrades = grades.map((g) => {
      const explicitFinal = safeNum(g.final);
      if (explicitFinal !== null) return explicitFinal;
      const s1 = safeNum(g.semester_1 ?? g.sem1);
      const s2 = safeNum(g.semester_2 ?? g.sem2);
      const s3 = safeNum(g.semester_3 ?? g.sem3);
      return safeAverage([s1, s2, s3]);
    });

    const sem1Avg = safeAverage(sem1Grades);
    const sem2Avg = safeAverage(sem2Grades);
    const sem3Avg = safeAverage(sem3Grades);
    const overallAvg = safeAverage(finalGrades);

    return {
      sem1Avg,
      sem2Avg,
      sem3Avg,
      overallAvg,
      totalSubjects: grades.length,
    };
  }, [grades]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading your report card...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-semibold text-rose-900">Failed to load grades</h3>
        <p className="mt-1 text-xs text-rose-600">
          {error instanceof Error ? error.message : 'Unable to retrieve your report card.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Official Records
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Report Card
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Official 3-semester academic achievement record and general average.
          </p>
        </div>
      </div>

      {/* 4 Semestral Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Semester 1 Card */}
        <button
          type="button"
          onClick={() => setSelectedTab(selectedTab === 'SEM1' ? 'ALL' : 'SEM1')}
          className={`rounded-xl border p-5 text-left transition-all ${
            selectedTab === 'SEM1'
              ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Semester 1</span>
            <Calendar size={16} className={selectedTab === 'SEM1' ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {metrics.sem1Avg !== null ? metrics.sem1Avg.toFixed(1) : '—'}
            </span>
          </div>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${statusBadge(metrics.sem1Avg).cls}`}>
              {statusBadge(metrics.sem1Avg).label}
            </span>
          </div>
        </button>

        {/* Semester 2 Card */}
        <button
          type="button"
          onClick={() => setSelectedTab(selectedTab === 'SEM2' ? 'ALL' : 'SEM2')}
          className={`rounded-xl border p-5 text-left transition-all ${
            selectedTab === 'SEM2'
              ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Semester 2</span>
            <Calendar size={16} className={selectedTab === 'SEM2' ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {metrics.sem2Avg !== null ? metrics.sem2Avg.toFixed(1) : '—'}
            </span>
          </div>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${statusBadge(metrics.sem2Avg).cls}`}>
              {statusBadge(metrics.sem2Avg).label}
            </span>
          </div>
        </button>

        {/* Semester 3 Card */}
        <button
          type="button"
          onClick={() => setSelectedTab(selectedTab === 'SEM3' ? 'ALL' : 'SEM3')}
          className={`rounded-xl border p-5 text-left transition-all ${
            selectedTab === 'SEM3'
              ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Semester 3</span>
            <Calendar size={16} className={selectedTab === 'SEM3' ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {metrics.sem3Avg !== null ? metrics.sem3Avg.toFixed(1) : '—'}
            </span>
          </div>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${statusBadge(metrics.sem3Avg).cls}`}>
              {statusBadge(metrics.sem3Avg).label}
            </span>
          </div>
        </button>

        {/* General Average Card */}
        <button
          type="button"
          onClick={() => setSelectedTab('ALL')}
          className={`rounded-xl border p-5 text-left transition-all ${
            selectedTab === 'ALL'
              ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20 shadow-xs'
              : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">General Average</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {metrics.overallAvg !== null ? metrics.overallAvg.toFixed(1) : '—'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${statusBadge(metrics.overallAvg).cls}`}>
              {statusBadge(metrics.overallAvg).label}
            </span>
            <span className="text-[11px] text-slate-400">• {metrics.totalSubjects} Subj</span>
          </div>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
          View:
        </span>
        {[
          { key: 'ALL', label: 'All Semesters & Final' },
          { key: 'SEM1', label: 'Semester 1' },
          { key: 'SEM2', label: 'Semester 2' },
          { key: 'SEM3', label: 'Semester 3' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedTab(tab.key as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedTab === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Card Data Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Learning Progress & Achievements</h2>
              <p className="text-xs text-slate-500">Official grades entered by subject instructors</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {grades.length} Enrolled Subject{grades.length === 1 ? '' : 's'}
          </span>
        </div>

        {grades.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">No Grades Recorded Yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Your subject grades will be displayed here once your teachers record them for the semester.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Learning Area (Subject)</th>
                  <th className="py-3 px-4">Instructor</th>
                  {(selectedTab === 'ALL' || selectedTab === 'SEM1') && (
                    <th className="py-3 px-4 text-center">Sem 1</th>
                  )}
                  {(selectedTab === 'ALL' || selectedTab === 'SEM2') && (
                    <th className="py-3 px-4 text-center">Sem 2</th>
                  )}
                  {(selectedTab === 'ALL' || selectedTab === 'SEM3') && (
                    <th className="py-3 px-4 text-center">Sem 3</th>
                  )}
                  {selectedTab === 'ALL' && (
                    <th className="py-3 px-4 text-center">Final Grade</th>
                  )}
                  <th className="py-3 px-5 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {grades.map((row) => {
                  const s1 = safeNum(row.semester_1 ?? row.sem1);
                  const s2 = safeNum(row.semester_2 ?? row.sem2);
                  const s3 = safeNum(row.semester_3 ?? row.sem3);
                  const finalGrade = safeNum(row.final) ?? safeAverage([s1, s2, s3]);
                  const currentGrade =
                    selectedTab === 'SEM1'
                      ? s1
                      : selectedTab === 'SEM2'
                      ? s2
                      : selectedTab === 'SEM3'
                      ? s3
                      : finalGrade;
                  const status = statusBadge(currentGrade);

                  return (
                    <tr key={row.subject_offering_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {row.subject}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {row.teacher_name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            {row.teacher_name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {(selectedTab === 'ALL' || selectedTab === 'SEM1') && (
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                          {formatGrade(s1)}
                        </td>
                      )}
                      {(selectedTab === 'ALL' || selectedTab === 'SEM2') && (
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                          {formatGrade(s2)}
                        </td>
                      )}
                      {(selectedTab === 'ALL' || selectedTab === 'SEM3') && (
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                          {formatGrade(s3)}
                        </td>
                      )}
                      {selectedTab === 'ALL' && (
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-950 text-sm">
                          {formatGrade(finalGrade)}
                        </td>
                      )}
                      <td className="py-3.5 px-5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {selectedTab === 'ALL' && metrics.overallAvg !== null && (
                <tfoot>
                  <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                    <td colSpan={5} className="py-3.5 px-5 text-right text-xs uppercase tracking-wider text-slate-600">
                      General Average:
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-base font-bold text-indigo-700">
                      {metrics.overallAvg.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${statusBadge(metrics.overallAvg).cls}`}>
                        {statusBadge(metrics.overallAvg).label}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
