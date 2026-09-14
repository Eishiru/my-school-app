import { useEffect, useMemo, useState } from 'react';

type Student = { id: number; name: string };
type Group = { id?: number; key: string; name: string; student_ids: number[] };
type GroupResponse = {
  section: string; grade_level: string; revision: number; editable: boolean;
  students: Student[]; groups: { id: number; name: string; student_ids: number[] }[];
};

// Matches the token storage used by the supplied TakeQuiz page.
async function groupsRequest(quizId: number, method: 'GET' | 'PUT', body?: unknown, signal?: AbortSignal): Promise<GroupResponse> {
  const saved = localStorage.getItem('user');
  const token = saved ? JSON.parse(saved).token : null;
  if (!token) throw new Error('Please sign in again to manage groups.');
  const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const api = base.endsWith('/api') ? base : `${base}/api`;
  const response = await fetch(`${api}/teacher/quizzes/${quizId}/groups/`, {
    method, signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || (data ? JSON.stringify(data) : `Unable to load groups (${response.status}).`));
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.groups)) throw new Error('The groups API returned an unexpected response.');
  return data;
}

export default function QuizGroupsPanel({ quizId }: { quizId: number }) {
  const [data, setData] = useState<GroupResponse | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const apply = (result: GroupResponse) => {
    setData(result);
    setGroups(result.groups.map(group => ({ ...group, key: String(group.id) })));
    setDirty(false);
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setMessage('');
    groupsRequest(quizId, 'GET', undefined, controller.signal)
      .then(apply)
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load groups.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [quizId, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const roster = data?.students ?? [];
  const validIds = new Set(roster.map(student => student.id));
  const assigned = new Set(groups.flatMap(group => group.student_ids).filter(id => validIds.has(id)));
  const visible = useMemo(() => (data?.students ?? []).filter(student => student.name.toLowerCase().includes(query.trim().toLowerCase())), [data, query]);
  const change = (next: Group[]) => { setGroups(next); setDirty(true); setMessage(''); };
  const save = async () => {
    if (!data || saving) return;
    if (groups.some(group => !group.name.trim() || !group.student_ids.length)) {
      setError('Give every group a name and assign at least one student.'); return;
    }
    if (new Set(groups.map(group => group.name.trim().toLowerCase())).size !== groups.length) {
      setError('Use a different name for each group.'); return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await groupsRequest(quizId, 'PUT', { revision: data.revision, groups: groups.map(({ id, name, student_ids }) => ({ ...(id === undefined ? {} : { id }), name: name.trim(), student_ids })) });
      apply(result); setMessage('Groups saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save groups.'); }
    finally { setSaving(false); }
  };
  return <div className="quiz-groups-panel">
    <style>{`
      .quiz-groups-panel { display:flex; flex-direction:column; gap:10px; min-height:0; height:100%; }
      .quiz-groups-toolbar,.quiz-groups-footer { display:flex; align-items:center; flex-wrap:wrap; gap:8px; flex-shrink:0; }
      .quiz-groups-columns { display:grid; grid-template-columns:minmax(180px,.8fr) minmax(0,1.5fr); gap:12px; flex:1; min-height:0; }
      .quiz-groups-box { display:flex; flex-direction:column; min-height:0; min-width:0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
      .quiz-groups-box h3 { padding:10px; font-weight:800; background:#f8fafc; }
      .quiz-groups-scroll { min-height:0; overflow:auto; padding:8px; }
      .quiz-groups-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #f1f5f9; }
      .quiz-groups-panel input,.quiz-groups-panel select { min-width:0; border:1px solid #cbd5e1; border-radius:7px; padding:6px 8px; font-size:13px; }
      .quiz-groups-panel button { padding:6px 10px; font-size:12px; border-radius:7px; border:1px solid #cbd5e1; }
      .quiz-groups-panel button:disabled { opacity:.5; cursor:not-allowed; }
      .quiz-groups-footer { padding-top:8px; border-top:1px solid #e2e8f0; }
      @media(max-width:767px) { .quiz-groups-columns { grid-template-columns:1fr; } .quiz-groups-scroll { max-height:320px; } }
    `}</style>
    <div className="quiz-groups-toolbar">
      <strong className="mr-auto text-sm">{data ? `${data.grade_level} — ${data.section}` : 'Section groups'}</strong>
      <button type="button" disabled={saving || loading} onClick={() => {
        if (!dirty || window.confirm('Discard unsaved group changes and reload?')) setReload(value => value + 1);
      }}>Reload groups</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {loading ? <p className="text-sm">Loading students and groups…</p> : data && <>
      {!data.editable && <p className="text-sm text-amber-800">An attempt has started. Group membership is now read-only.</p>}
      <div className="quiz-groups-columns">
        <div className="quiz-groups-box">
          <h3 className="text-sm">Groups ({groups.length})</h3>
          <div className="quiz-groups-scroll">
            {groups.map((group, index) => <div key={group.key} className="mb-2 rounded-lg border border-slate-200 p-2">
              <div className="quiz-groups-row">
                <input className="w-full" aria-label={`Group ${index + 1} name`} maxLength={80} value={group.name} disabled={saving || !data.editable}
                  onChange={event => change(groups.map(item => item.key === group.key ? { ...item, name: event.target.value } : item))} />
                <button type="button" aria-label={`Remove ${group.name || 'group'}`} disabled={saving || !data.editable} onClick={() => {
                  if (!group.student_ids.length || window.confirm(`Remove ${group.name} and unassign its students?`)) change(groups.filter(item => item.key !== group.key));
                }}>×</button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{group.student_ids.length} students</p>
              {group.student_ids.filter(id => !validIds.has(id)).map(id => <div key={id} className="text-xs text-rose-700">Student #{id} left this section. <button type="button" disabled={saving || !data.editable} onClick={() => change(groups.map(item => item.key === group.key ? {...item, student_ids:item.student_ids.filter(member => member !== id)} : item))}>Unassign</button></div>)}
            </div>)}
            {!groups.length && <p className="mb-2 text-sm text-slate-500">Create a group, then assign students beside their names.</p>}
            <button type="button" disabled={saving || !data.editable} onClick={() => {
              let number = groups.length + 1;
              while (groups.some(group => group.name === `Group ${number}`)) number++;
              change([...groups, {key: crypto.randomUUID(), name:`Group ${number}`, student_ids:[]}]);
            }}>+ Add group</button>
          </div>
        </div>
        <div className="quiz-groups-box">
          <h3 className="text-sm">Students in this section ({roster.length})</h3>
          <input className="m-2" aria-label="Search section students" placeholder="Search students…" value={query} onChange={event => setQuery(event.target.value)} />
          <div className="quiz-groups-scroll">
            {visible.map(student => <div className="quiz-groups-row" key={student.id}>
              <span className="min-w-0 flex-1 break-words text-sm">{student.name}</span>
              <select className="w-40" aria-label={`Group for ${student.name}`} disabled={saving || !data.editable}
                value={groups.find(group => group.student_ids.includes(student.id))?.key ?? ''}
                onChange={event => change(groups.map(group => ({...group, student_ids:[...group.student_ids.filter(id => id !== student.id), ...(group.key === event.target.value ? [student.id] : [])]})))}>
                <option value="">Unassigned</option>
                {groups.map((group,index) => <option key={group.key} value={group.key}>{group.name || `Group ${index+1}`}</option>)}
              </select>
            </div>)}
            {!visible.length && <p className="p-2 text-sm text-slate-500">{roster.length ? 'No matching students.' : 'No students are assigned to this section.'}</p>}
          </div>
        </div>
      </div>
      <div className="quiz-groups-footer">
        <span className="mr-auto text-xs text-slate-500">{assigned.size} assigned · {roster.length-assigned.size} unassigned{dirty ? ' · Unsaved changes' : ''}</span>
        <button type="button" className="bg-indigo-600 font-bold text-white" disabled={saving || !data.editable || !dirty} onClick={() => void save()}>{saving ? 'Saving…' : 'Save groups'}</button>
      </div>
    </>}
  </div>;
}
