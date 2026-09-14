import { useEffect, useRef, useState } from 'react';

type Question = { id: number; text: string; points: number };
type Grade = { question_id: number; points: number; feedback: string };
type Submission = { id: number; student_name: string; submitted_at: string; answers: { question_id: number; text: string; file_url: string }[] };
type Group = { id: number; name: string; members: { id: number; name: string }[]; revision: number; source_attempt_id: number | null; grades: Grade[]; graded_at: string | null; graded_by: string | null; submissions: Submission[] };
type Data = { groups: Group[]; questions: Question[] };
type Draft = Record<number, { points: string; feedback: string }>;

async function requestGrades(quizId: number, body?: unknown, signal?: AbortSignal): Promise<Data> {
  const stored = localStorage.getItem('user');
  const token = stored ? JSON.parse(stored).token : null;
  if (!token) throw new Error('Please sign in again to grade groups.');
  const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const api = base.endsWith('/api') ? base : `${base}/api`;
  const response = await fetch(`${api}/teacher/quizzes/${quizId}/group-grading/`, {
    method: body === undefined ? 'GET' : 'PUT', signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || (data ? JSON.stringify(data) : `Unable to load group grades (${response.status}).`));
  if (!Array.isArray(data?.groups) || !Array.isArray(data?.questions)) throw new Error('Unexpected group grading response.');
  return data;
}

export default function QuizGroupGradingPanel({ quizId, active }: { quizId: number; active: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = (value: boolean) => { dirtyRef.current = value; setDirtyState(value); };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const group = data?.groups.find(item => item.id === selectedId);
  const submission = group?.submissions.find(item => item.id === sourceId);
  const choose = (result: Data, groupId: number | null) => {
    const target = result.groups.find(item => item.id === groupId) ?? result.groups[0];
    setSelectedId(target?.id ?? null);
    const source = target?.submissions.find(item => item.id === target.source_attempt_id) ?? target?.submissions[0];
    setSourceId(source?.id ?? null);
    const next: Draft = {};
    for (const question of result.questions) {
      const grade = source?.id === target?.source_attempt_id ? target?.grades.find(item => item.question_id === question.id) : undefined;
      next[question.id] = { points: grade === undefined ? '' : String(grade.points), feedback: grade?.feedback ?? '' };
    }
    setDraft(next); setDirty(false);
  };
  useEffect(() => {
    if (!active || dirtyRef.current) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setMessage('');
    requestGrades(quizId, undefined, controller.signal).then(result => { setData(result); choose(result, null); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load group grading.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [quizId, reload, active]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const canDiscard = () => !dirty || window.confirm('Discard unsaved group grades?');
  const change = (id: number, patch: Partial<Draft[number]>) => {
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], ...patch } })); setDirty(true); setMessage('');
  };
  const save = async () => {
    if (!group || !data || !submission || saving) return;
    const grades: Grade[] = [];
    for (const question of data.questions) {
      const entry = draft[question.id];
      const points = Number(entry?.points);
      if (!entry?.points.trim() || !Number.isFinite(points) || points < 0 || points > question.points) {
        setError(`Enter a score from 0 to ${question.points} for each question.`); return;
      }
      grades.push({ question_id: question.id, points, feedback: entry.feedback });
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await requestGrades(quizId, { group_id: group.id, source_attempt_id: submission.id, revision: group.revision, grades });
      setData(result); choose(result, group.id); setMessage(`Grade saved for all ${group.members.length} members of ${group.name}.`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save group grade.'); }
    finally { setSaving(false); }
  };
  const total = data?.questions.reduce((sum, question) => sum + (Number(draft[question.id]?.points) || 0), 0) ?? 0;
  const maximum = data?.questions.reduce((sum, question) => sum + question.points, 0) ?? 0;
  return <div className="group-grader">
    <style>{`
      .group-grader { display:flex; flex-direction:column; height:100%; min-height:0; gap:10px; }
      .group-grader-top { display:flex; flex-wrap:wrap; align-items:center; gap:8px; flex-shrink:0; }
      .group-grader input,.group-grader select,.group-grader textarea { border:1px solid #cbd5e1; border-radius:8px; padding:6px 8px; min-width:0; font-size:13px; }
      .group-grader button { border:1px solid #cbd5e1; border-radius:8px; padding:7px 10px; font-size:12px; }
      .group-grader button:disabled { opacity:.5; cursor:not-allowed; }
      .group-grader-work { flex:1; min-height:0; overflow:auto; }
      .group-grader-question { border:1px solid #e2e8f0; border-radius:12px; margin-bottom:10px; padding:12px; }
      .group-grader-answer { margin:8px 0; padding:10px; background:#f8fafc; border-radius:8px; white-space:pre-wrap; overflow-wrap:anywhere; font-size:13px; }
      .group-grader-controls { display:grid; grid-template-columns:110px minmax(0,1fr); gap:10px; }
      .group-grader-controls label { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:700; }
      .group-grader-footer { display:flex; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid #e2e8f0; padding-top:8px; flex-shrink:0; }
    `}</style>
    <div className="group-grader-top">
      <strong className="mr-auto text-sm">Grade one submission for the whole group</strong>
      <button type="button" disabled={loading || saving} onClick={() => { if (canDiscard()) { setDirty(false); setReload(value => value + 1); } }}>Reload grades</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {loading ? <p>Loading group submissions…</p> : !data?.groups.length ? <p className="text-sm">Create and save student groups in the Groups tab first.</p> : <>
      <div className="group-grader-top">
        <label className="text-xs font-bold">Group <select aria-label="Group to grade" disabled={saving} value={selectedId ?? ''} onChange={event => { if (canDiscard()) {choose(data, Number(event.target.value)); setError(''); setMessage('');} }}>
          {data.groups.map(item => <option key={item.id} value={item.id}>{item.name}{item.graded_at ? ' — Graded' : ''}</option>)}
        </select></label>
        <label className="text-xs font-bold">Submitted work <select aria-label="Group submission to grade" disabled={saving || !group?.submissions.length} value={sourceId ?? ''} onChange={event => {
          if (!canDiscard()) return;
          const id = Number(event.target.value); setSourceId(id); setError(''); setMessage('');
          const next: Draft = {};
          for(const question of data.questions) {const grade = id === group?.source_attempt_id ? group.grades.find(item => item.question_id === question.id) : undefined; next[question.id] = {points:grade === undefined ? '' : String(grade.points), feedback:grade?.feedback ?? ''};}
          setDraft(next); setDirty(true);
        }}>
          {!group?.submissions.length && <option value="">No submitted work</option>}
          {group?.submissions.map(item => <option key={item.id} value={item.id}>{item.student_name} — {new Date(item.submitted_at).toLocaleString()}</option>)}
        </select></label>
      </div>
      <p className="text-xs text-slate-500">Members: {group?.members.map(member => member.name).join(', ') || 'No members'}</p>
      <div className="group-grader-work">
        {!submission ? <p className="p-3 text-sm">A group member must submit the activity before you can grade it.</p> : data.questions.map((question,index) => {
          const answer = submission.answers.find(item => item.question_id === question.id);
          return <section className="group-grader-question" key={question.id}>
            <h3 className="whitespace-pre-wrap text-sm font-bold">{index+1}. {question.text}</h3>
            <div className="group-grader-answer">{answer?.text || 'No text answer provided.'}
              {answer?.file_url && <a className="mt-2 block text-indigo-700 underline" href={answer.file_url} target="_blank" rel="noopener noreferrer">View submitted file</a>}
            </div>
            <div className="group-grader-controls">
              <label>Score / {question.points}<input aria-label={`Score for question ${index+1}`} disabled={saving} type="number" min={0} max={question.points} step="any" value={draft[question.id]?.points ?? ''} onChange={event => change(question.id,{points:event.target.value})} /></label>
              <label>Group feedback<textarea disabled={saving} rows={2} maxLength={10000} value={draft[question.id]?.feedback ?? ''} onChange={event => change(question.id,{feedback:event.target.value})} /></label>
            </div>
          </section>;
        })}
      </div>
      <div className="group-grader-footer">
        <span className="mr-auto text-sm font-bold">Total: {total} / {maximum}{dirty ? ' · Unsaved' : ''}</span>
        <button type="button" className="bg-indigo-600 font-bold text-white" disabled={saving || !submission || !data.questions.length || !group?.members.length} onClick={() => void save()}>{saving ? 'Saving…' : `Save grade for ${group?.members.length ?? 0} members`}</button>
      </div>
    </>}
  </div>;
}
