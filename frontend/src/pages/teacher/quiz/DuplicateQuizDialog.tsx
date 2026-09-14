import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

type Offering = { id: number; label: string };
async function duplicateRequest(quizId: number, body?: unknown, signal?: AbortSignal) {
  const stored = localStorage.getItem('user');
  const token = stored ? JSON.parse(stored).token : null;
  if (!token) throw new Error('Please sign in again.');
  const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const api = base.endsWith('/api') ? base : `${base}/api`;
  const response = await fetch(`${api}/teacher/quizzes/${quizId}/duplicate/`, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || (data ? JSON.stringify(data) : `Request failed (${response.status}).`));
  return data;
}

export default function DuplicateQuizDialog({ quiz, onClose, onCreated }: {
  quiz: { id: number; title: string }; onClose: () => void; onCreated: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState(`${quiz.title.slice(0, 248)} (Copy)`);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
    const element = dialog.current;
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    duplicateRequest(quiz.id, undefined, controller.signal).then(data => {
      if (!Array.isArray(data?.offerings)) throw new Error('Unable to load subject offerings.');
      if (!controller.signal.aborted) setOfferings(data.offerings);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load subject offerings.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [quiz.id, retry]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || created !== null || !target || !title.trim()) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const data = await duplicateRequest(quiz.id, { SubjectOffering: Number(target), title: title.trim() });
      if (!Number.isInteger(data?.id)) throw new Error('Unexpected response. Refresh the activity list before trying again.');
      setCreated(data.id);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to duplicate. Refresh the list before retrying.');
    } finally { busy.current = false; setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="duplicate-heading" onCancel={event => {
    event.preventDefault(); if (!busy.current) onClose();
  }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-900/40">
    <form onSubmit={submit} className="space-y-4">
      <h2 id="duplicate-heading" className="text-lg font-bold text-slate-900">Duplicate activity</h2>
      {created !== null ? <>
        <p role="status" className="text-sm text-slate-700">Your draft copy is ready. Review its settings and assign groups for the new section if needed.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2">Done</button>
          <Link to={`/teacher/activities/${created}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-white">Manage copy</Link>
        </div>
      </> : <>
        <p className="text-sm text-slate-600">Copy questions and settings into a draft for another subject offering. Student submissions, grades and group memberships are not copied.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <label className="block text-sm font-semibold">Title
          <input autoFocus required maxLength={255} value={title} disabled={saving} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-semibold">Destination subject offering
          <select required value={target} disabled={loading || saving} onChange={e => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">{loading ? 'Loading offerings…' : 'Select subject offering'}</option>
            {offerings.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        {!loading && !error && offerings.length === 0 && <p className="text-sm text-slate-600">No other subject offerings are assigned to you.</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {error && !offerings.length && <button type="button" disabled={loading || saving} onClick={() => setRetry(n => n + 1)} className="rounded-lg border px-3 py-2">Retry loading</button>}
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-3 py-2 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={loading || saving || !target || !title.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Duplicating…' : 'Create draft copy'}</button>
        </div>
      </>}
    </form>
  </dialog>;
}
